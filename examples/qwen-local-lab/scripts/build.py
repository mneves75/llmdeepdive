#!/usr/bin/env python3
"""Assemble the application and its embedded engines into one HTML document with a hashed CSP."""
from pathlib import Path
import base64
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
# Model downloads: Hugging Face redirects weights to a regional CDN host under hf.co
# (us.aws.cdn.hf.co when checked on 2026-11-26). The GPU model library is pinned on GitHub.
MODEL_HOSTS = 'https://huggingface.co https://*.hf.co https://raw.githubusercontent.com'
INLINE_SCRIPT = re.compile(r'<script type="module">(.*?)</script>', re.S)
INLINE_STYLE = re.compile(r'<style>(.*?)</style>', re.S)
CHARSET_META = '<meta charset="UTF-8">'
ISOLATION_HEADERS = [
    ('Cross-Origin-Opener-Policy', 'same-origin'),
    ('Cross-Origin-Embedder-Policy', 'require-corp'),
    ('Cross-Origin-Resource-Policy', 'same-origin'),
    ('X-Content-Type-Options', 'nosniff'),
    ('Referrer-Policy', 'no-referrer'),
]


class BuildError(Exception):
    pass


def source_hash(text):
    return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode('utf-8')).digest()).decode('ascii') + "'"


def content_security_policy(html):
    """Return (header policy, meta policy) allowing exactly the inline blocks in html."""
    scripts = INLINE_SCRIPT.findall(html)
    if len(scripts) != 1:
        raise BuildError(f'expected exactly one inline module script, found {len(scripts)}')
    styles = ' '.join(dict.fromkeys(source_hash(style) for style in INLINE_STYLE.findall(html))) or "'none'"
    directives = [
        "default-src 'none'",
        f"script-src {source_hash(scripts[0])} blob: 'wasm-unsafe-eval'",
        'worker-src blob:',
        f'connect-src blob: {MODEL_HOSTS}',
        f'style-src {styles}',
        'img-src data:',
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
    ]
    # Browsers ignore frame-ancestors in a <meta> policy and log an error for it.
    return '; '.join(directives + ["frame-ancestors 'none'"]), '; '.join(directives)


def vendor_files(root):
    """Return the lock's verified asset bytes and notice texts, failing if any file is absent or altered."""
    lock = json.loads((root / 'vendor/lock.json').read_text(encoding='utf-8'))
    assets, notices = {}, []
    for package in lock['packages']:
        for entry in package['files']:
            path = root / 'vendor' / entry['output']
            if not path.is_file():
                raise BuildError(f'vendor/{entry["output"]} is missing; run scripts/fetch_vendor.py')
            data = path.read_bytes()
            if hashlib.sha256(data).hexdigest() != entry['sha256']:
                raise BuildError(f'vendor/{entry["output"]} does not match vendor/lock.json; run scripts/fetch_vendor.py')
            if entry['embed'] == 'notice':
                notices.append((path.name, data.decode('utf-8')))
            else:
                assets[entry['embed']] = data
    return assets, notices


def build(root):
    assets, notices = vendor_files(root)
    assets['asset-worker'] = (root / 'src/inference-worker.js').read_bytes()
    html = (root / 'src/ui.html').read_text(encoding='utf-8')
    script = (root / 'src/app.js').read_text(encoding='utf-8')
    if html.count('/* APP_SCRIPT */') != 1 or html.count('<script type="module">') != 1 or html.count(CHARSET_META) != 1:
        raise BuildError('src/ui.html needs one charset meta, one module script and one APP_SCRIPT marker')
    if '</script' in script.lower():
        raise BuildError('Escape closing script sequences in src/app.js.')
    payload = '\n'.join(
        f'<script id="{name}" type="application/octet-stream">' + base64.b64encode(data).decode('ascii') + '</script>'
        for name, data in assets.items()
    )
    license_text = '\n\n'.join(f'{name}\n{text}' for name, text in notices)
    licenses = '<script id="third-party-notices" type="text/plain">\n' + license_text.replace('</script', '<\\/script') + '\n</script>'
    html = html.replace('<script type="module">', payload + '\n' + licenses + '\n<script type="module">')
    html = html.replace('/* APP_SCRIPT */', script)
    header_policy, meta_policy = content_security_policy(html)
    html = html.replace(CHARSET_META, CHARSET_META + f'\n  <meta http-equiv="Content-Security-Policy" content="{meta_policy}">')
    dist = root / 'dist'
    dist.mkdir(exist_ok=True)
    target = dist / 'index.html'
    target.write_text(html, encoding='utf-8')
    headers = [('Content-Security-Policy', header_policy)] + ISOLATION_HEADERS
    (dist / '_headers').write_text('/*\n' + ''.join(f'  {name}: {value}\n' for name, value in headers), encoding='utf-8')
    return {'output': str(target.relative_to(root)), 'bytes': target.stat().st_size,
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}


def main():
    try:
        print(json.dumps(build(ROOT)))
    except BuildError as error:
        print(f'build: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
