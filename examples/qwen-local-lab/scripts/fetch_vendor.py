#!/usr/bin/env python3
"""Rebuild vendor/ from the exact npm tarballs named in vendor/lock.json.

Each tarball must match its registry sha512 integrity before it is opened.
Only the archive paths the lock lists are read, the one committed patch must
match exactly once, and every output must match its locked SHA-256. Nothing is
written unless every output verifies. Standard library only.
"""
from pathlib import Path, PurePosixPath
import argparse
import base64
import hashlib
import io
import json
import re
import sys
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = 'https://registry.npmjs.org/'
HUNK_HEADER = re.compile(r'^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@')
SHA256_HEX = re.compile(r'^[0-9a-f]{64}$')


class VendorError(Exception):
    pass


def download(url):
    with urllib.request.urlopen(url, timeout=300) as response:
        return response.read()


def safe_relative(name):
    path = PurePosixPath(name)
    return bool(name) and '\\' not in name and not path.is_absolute() and '..' not in path.parts


def load_lock(lock_path):
    lock = json.loads(Path(lock_path).read_text(encoding='utf-8'))
    outputs = set()
    for package in lock['packages']:
        label = f"{package['name']}@{package['version']}"
        if not package['tarball'].startswith(REGISTRY):
            raise VendorError(f'{label}: tarball must come from {REGISTRY}')
        if not package['integrity'].startswith('sha512-'):
            raise VendorError(f'{label}: integrity must be an npm sha512 value')
        for entry in package['files']:
            output = entry['output']
            if PurePosixPath(output).name != output or '\\' in output or output in outputs or output in ('.', '..'):
                raise VendorError(f'{output}: output must be a unique plain file name')
            if not safe_relative(entry['path']) or not safe_relative(entry.get('patch', 'x')):
                raise VendorError(f'{output}: archive and patch paths must be relative, without ..')
            if not SHA256_HEX.match(entry['sha256']):
                raise VendorError(f'{output}: sha256 must be 64 lowercase hex digits')
            outputs.add(output)
    return lock


def check_integrity(data, integrity, label):
    expected = integrity.removeprefix('sha512-')
    actual = base64.b64encode(hashlib.sha512(data).digest()).decode('ascii')
    if actual != expected:
        raise VendorError(f'{label}: tarball integrity mismatch (expected sha512-{expected}, got sha512-{actual})')


def tarball(package, cache_dir, fetch):
    label = f"{package['name']}@{package['version']}"
    cached = cache_dir / (hashlib.sha256(package['integrity'].encode()).hexdigest() + '.tgz')
    if cached.is_file():
        data = cached.read_bytes()
        try:
            check_integrity(data, package['integrity'], label)
            return data
        except VendorError:
            cached.unlink()
    data = fetch(package['tarball'])
    check_integrity(data, package['integrity'], label)
    cache_dir.mkdir(parents=True, exist_ok=True)
    cached.write_bytes(data)
    return data


def read_members(data, wanted, label):
    """Read only the wanted regular files; refuse unsafe, linked or duplicate members."""
    found = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for member in archive:
            if not safe_relative(member.name):
                raise VendorError(f'{label}: refused unsafe archive member {member.name!r}')
            if member.name not in wanted:
                continue
            if not member.isreg():
                raise VendorError(f'{label}: refused {member.name}: not a regular file')
            if member.name in found:
                raise VendorError(f'{label}: refused {member.name}: it appears twice in the archive')
            found[member.name] = archive.extractfile(member).read()
    missing = sorted(set(wanted) - found.keys())
    if missing:
        raise VendorError(f'{label}: archive is missing {", ".join(missing)}')
    return found


def parse_hunks(patch_text, label):
    """Return (old, new) text pairs from a unified diff, using each header's line counts."""
    lines = patch_text.splitlines(keepends=True)
    hunks = []
    index = 0
    while index < len(lines):
        header = HUNK_HEADER.match(lines[index])
        index += 1
        if not header:
            continue
        old_left = int(header.group(1) or 1)
        new_left = int(header.group(2) or 1)
        old, new = [], []
        while old_left or new_left:
            if index >= len(lines):
                raise VendorError(f'{label}: patch hunk is truncated')
            line = lines[index]
            index += 1
            tag, body = line[:1], line[1:]
            if tag in (' ', '-'):
                old.append(body)
                old_left -= 1
            if tag in (' ', '+'):
                new.append(body)
                new_left -= 1
            if tag not in (' ', '-', '+') or old_left < 0 or new_left < 0:
                raise VendorError(f'{label}: patch hunk does not match its header')
        hunks.append((''.join(old), ''.join(new)))
    if not hunks:
        raise VendorError(f'{label}: patch has no hunks')
    return hunks


def apply_patch(text, patch_text, label):
    for old, new in parse_hunks(patch_text, label):
        count = text.count(old)
        if count != 1:
            raise VendorError(f'{label}: patch hunk matches {count} times; it must match exactly once')
        text = text.replace(old, new)
    return text


def build_outputs(lock, lock_dir, cache_dir, fetch):
    outputs = {}
    for package in lock['packages']:
        label = f"{package['name']}@{package['version']}"
        members = read_members(tarball(package, cache_dir, fetch),
                               [entry['path'] for entry in package['files']], label)
        for entry in package['files']:
            data = members[entry['path']]
            if 'patch' in entry:
                patch_text = (lock_dir / entry['patch']).read_text(encoding='utf-8')
                data = apply_patch(data.decode('utf-8'), patch_text, entry['output']).encode('utf-8')
            actual = hashlib.sha256(data).hexdigest()
            if actual != entry['sha256'] or len(data) != entry['bytes']:
                raise VendorError(f"{entry['output']}: output mismatch (expected sha256 {entry['sha256']}, "
                                  f"{entry['bytes']} bytes; got {actual}, {len(data)} bytes)")
            outputs[entry['output']] = data
    return outputs


def run(lock_path, out_dir, cache_dir, fetch=download):
    lock_path = Path(lock_path)
    lock = load_lock(lock_path)
    outputs = build_outputs(lock, lock_path.parent, Path(cache_dir), fetch)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, data in outputs.items():
        target = out_dir / name
        if not target.is_file() or target.read_bytes() != data:
            target.write_bytes(data)
        print(f'ok {name} {hashlib.sha256(data).hexdigest()}')
    return outputs


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--lock', default=ROOT / 'vendor/lock.json', type=Path)
    parser.add_argument('--out', default=ROOT / 'vendor', type=Path)
    parser.add_argument('--cache', default=ROOT / '.cache/npm', type=Path)
    args = parser.parse_args(argv)
    try:
        run(args.lock, args.out, args.cache)
    except (VendorError, OSError, KeyError, tarfile.TarError, json.JSONDecodeError) as error:
        print(f'fetch_vendor: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
