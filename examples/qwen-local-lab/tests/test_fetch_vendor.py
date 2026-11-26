"""fetch_vendor.py against fixture tarballs built here; no network.

Run: python3 -m unittest discover -s tests
"""
from pathlib import Path
import base64
import contextlib
import difflib
import hashlib
import io
import json
import shutil
import sys
import tarfile
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'scripts'))
import fetch_vendor  # noqa: E402

UPSTREAM = 'export const a = 1;\nvar base = document.baseURI;\nexport const b = 2;\n'
PATCHED = 'export const a = 1;\nvar base = typeof document === "undefined" ? self.location.href : document.baseURI;\nexport const b = 2;\n'
LICENSE = 'MIT License\n'
TARBALL_URL = 'https://registry.npmjs.org/fixture/-/fixture-1.0.0.tgz'


def tarball(members):
    """members: (name, bytes) for regular files, or (name, None) for a symlink."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
        for name, data in members:
            info = tarfile.TarInfo(name)
            if data is None:
                info.type, info.linkname = tarfile.SYMTYPE, '/etc/passwd'
                archive.addfile(info)
            else:
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


def integrity(data):
    return 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode('ascii')


def sha256(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


class FetchVendorTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        (self.tmp / 'vendor/patches').mkdir(parents=True)
        patch = ''.join(difflib.unified_diff(UPSTREAM.splitlines(True), PATCHED.splitlines(True), 'a/index.js', 'b/index.js'))
        (self.tmp / 'vendor/patches/fix.patch').write_text(patch)
        self.out = self.tmp / 'vendor'
        self.cache = self.tmp / 'cache'
        self.fetches = []

    def write_lock(self, data, **changes):
        entry = {'path': 'package/index.js', 'output': 'engine.js', 'patch': 'patches/fix.patch',
                 'embed': 'asset-engine', 'bytes': len(PATCHED.encode()), 'sha256': sha256(PATCHED)}
        entry.update(changes)
        package = {'name': 'fixture', 'version': '1.0.0', 'tarball': TARBALL_URL, 'integrity': integrity(data),
                   'files': [entry, {'path': 'package/LICENSE', 'output': 'fixture-LICENSE.txt', 'embed': 'notice',
                                     'bytes': len(LICENSE), 'sha256': sha256(LICENSE)}]}
        lock = self.tmp / 'vendor/lock.json'
        lock.write_text(json.dumps({'packages': [package]}))
        return lock

    def run_fetch(self, lock, served):
        def fetch(url):
            self.fetches.append(url)
            return served
        with contextlib.redirect_stdout(io.StringIO()):
            return fetch_vendor.run(lock, self.out, self.cache, fetch)

    def good_tarball(self, upstream=UPSTREAM, extra=()):
        return tarball([('package/index.js', upstream.encode()), ('package/LICENSE', LICENSE.encode()),
                        ('package/README.md', b'not extracted'), *extra])

    def test_patches_verifies_and_is_idempotent_from_the_cache(self):
        data = self.good_tarball()
        lock = self.write_lock(data)
        self.run_fetch(lock, data)
        self.run_fetch(lock, b'unused: the verified cache answers')
        self.assertEqual((self.out / 'engine.js').read_text(), PATCHED)
        self.assertFalse((self.out / 'README.md').exists())
        self.assertEqual(self.fetches, [TARBALL_URL])

    def test_integrity_mismatch_is_refused_before_opening(self):
        lock = self.write_lock(self.good_tarball())
        with self.assertRaisesRegex(fetch_vendor.VendorError, 'fixture@1.0.0: tarball integrity mismatch'):
            self.run_fetch(lock, b'not the locked tarball')
        self.assertFalse((self.out / 'engine.js').exists())

    def test_traversal_and_linked_members_are_refused(self):
        for member, message in [(('package/../../evil.js', b'x'), 'unsafe archive member'),
                                (('/etc/evil.js', b'x'), 'unsafe archive member')]:
            data = self.good_tarball(extra=[member])
            with self.subTest(member=member[0]), self.assertRaisesRegex(fetch_vendor.VendorError, message):
                self.run_fetch(self.write_lock(data), data)
        linked = tarball([('package/index.js', None), ('package/LICENSE', LICENSE.encode())])
        with self.assertRaisesRegex(fetch_vendor.VendorError, 'package/index.js: not a regular file'):
            self.run_fetch(self.write_lock(linked), linked)
        for bad_output in ('../engine.js', 'dir\\engine.js'):
            with self.subTest(output=bad_output), self.assertRaisesRegex(fetch_vendor.VendorError, 'plain file name'):
                fetch_vendor.load_lock(self.write_lock(linked, output=bad_output))
        self.assertFalse((self.out / 'engine.js').exists())

    def test_patch_must_match_exactly_once(self):
        for upstream, count in [(UPSTREAM.replace('document.baseURI', 'location.href'), 0), (UPSTREAM + UPSTREAM, 2)]:
            data = self.good_tarball(upstream)
            with self.subTest(count=count), self.assertRaisesRegex(fetch_vendor.VendorError, f'engine.js: patch hunk matches {count} times'):
                self.run_fetch(self.write_lock(data), data)

    def test_output_hash_mismatch_names_the_file_and_exits_non_zero(self):
        data = self.good_tarball()
        lock = self.write_lock(data, sha256='0' * 64)
        with self.assertRaisesRegex(fetch_vendor.VendorError, 'engine.js: output mismatch'):
            self.run_fetch(lock, data)
        # The verified tarball is cached now, so main() runs offline.
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr), contextlib.redirect_stdout(io.StringIO()):
            status = fetch_vendor.main(['--lock', str(lock), '--out', str(self.out), '--cache', str(self.cache)])
        self.assertEqual(status, 1)
        self.assertIn('engine.js: output mismatch', stderr.getvalue())
        self.assertFalse((self.out / 'engine.js').exists())


if __name__ == '__main__':
    unittest.main()
