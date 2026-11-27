"""build.py against a fixture tree: the CSP must hash exactly the assembled inline blocks.

Run: python3 -m unittest discover -s tests
"""
from html.parser import HTMLParser
from pathlib import Path
import base64
import hashlib
import json
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'scripts'))
import build  # noqa: E402

UI = '''<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body{margin:0}
  </style>
  <style>.second{color:red}</style>
</head>
<body>
  <script type="module">
    /* APP_SCRIPT */
  </script>
</body>
</html>
'''


class InlineBlocks(HTMLParser):
    """Collects inline module script and style text the way a browser's tokenizer sees it."""

    def __init__(self):
        super().__init__()
        self.open, self.scripts, self.styles, self.csp = None, [], [], None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('http-equiv') == 'Content-Security-Policy':
            self.csp = attrs['content']
        if tag == 'style' or (tag == 'script' and attrs.get('type') == 'module'):
            self.open = self.styles if tag == 'style' else self.scripts
            self.open.append('')

    def handle_data(self, data):
        if self.open is not None:
            self.open[-1] += data

    def handle_endtag(self, tag):
        self.open = None


def csp_hash(text):
    return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode()).digest()).decode() + "'"


class BuildTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root)
        (self.root / 'src').mkdir()
        (self.root / 'vendor').mkdir()
        (self.root / 'src/ui.html').write_text(UI)
        (self.root / 'src/app.js').write_text("const greeting = 'hello';\nconsole.log(greeting);\n")
        (self.root / 'src/inference-worker.js').write_text('self.onmessage = () => {};\n')
        files = {'engine.js': ('asset-engine', b'export const x = 1;\n'), 'engine-LICENSE.txt': ('notice', b'MIT\n')}
        for name, (_, data) in files.items():
            (self.root / 'vendor' / name).write_bytes(data)
        lock = {'packages': [{'name': 'fixture', 'version': '1.0.0', 'files': [
            {'output': name, 'embed': embed, 'sha256': hashlib.sha256(data).hexdigest()}
            for name, (embed, data) in files.items()]}]}
        (self.root / 'vendor/lock.json').write_text(json.dumps(lock))

    def test_csp_in_headers_and_meta_hashes_the_assembled_inline_blocks(self):
        build.build(self.root)
        html = (self.root / 'dist/index.html').read_text()
        blocks = InlineBlocks()
        blocks.feed(html)
        self.assertEqual(len(blocks.scripts), 1)
        self.assertIn('console.log(greeting)', blocks.scripts[0])
        header = [line.split(': ', 1)[1] for line in (self.root / 'dist/_headers').read_text().splitlines()
                  if line.startswith('  Content-Security-Policy: ')]
        self.assertEqual(len(header), 1)
        for policy in (header[0], blocks.csp):
            directives = dict(d.split(' ', 1) for d in policy.split('; '))
            self.assertEqual(directives['script-src'], f"{csp_hash(blocks.scripts[0])} blob: 'wasm-unsafe-eval'")
            self.assertEqual(directives['style-src'], ' '.join(csp_hash(s) for s in blocks.styles))
            self.assertEqual(directives['object-src'], "'none'")
            self.assertEqual(directives['base-uri'], "'none'")
            self.assertEqual(directives['form-action'], "'none'")
            self.assertNotIn('unsafe-inline', policy)
            self.assertNotIn("'unsafe-eval'", policy)
        self.assertEqual(header[0], blocks.csp + "; frame-ancestors 'none'")
        self.assertLess(html.index('http-equiv="Content-Security-Policy"'), html.index('<style>'))
        headers = (self.root / 'dist/_headers').read_text()
        self.assertIn('Cross-Origin-Embedder-Policy: require-corp', headers)
        self.assertIn('Cross-Origin-Opener-Policy: same-origin', headers)

    def test_missing_or_altered_vendor_files_point_to_fetch_vendor(self):
        (self.root / 'vendor/engine.js').write_bytes(b'tampered')
        with self.assertRaisesRegex(build.BuildError, r'vendor/engine.js does not match .*run scripts/fetch_vendor.py'):
            build.build(self.root)
        (self.root / 'vendor/engine.js').unlink()
        with self.assertRaisesRegex(build.BuildError, r'vendor/engine.js is missing; run scripts/fetch_vendor.py'):
            build.build(self.root)
        self.assertFalse((self.root / 'dist').exists())

    def test_license_notice_escapes_mixed_case_closing_script_tags(self):
        notice = b'MIT License </SCRIPT><script>alert(1)</script>\n'
        (self.root / 'vendor/engine-LICENSE.txt').write_bytes(notice)
        lock = json.loads((self.root / 'vendor/lock.json').read_text())
        lock['packages'][0]['files'][1]['sha256'] = hashlib.sha256(notice).hexdigest()
        (self.root / 'vendor/lock.json').write_text(json.dumps(lock))
        build.build(self.root)
        html = (self.root / 'dist/index.html').read_text()
        self.assertNotIn('</SCRIPT>', html)
        self.assertIn('<\\/script><script>alert(1)<\\/script>', html)

    def test_local_server_rejects_symlinks_escaping_dist(self):
        import http.client
        import threading
        from functools import partial
        from http.server import ThreadingHTTPServer
        import serve

        build.build(self.root)
        outside = self.root / 'secret.txt'
        outside.write_text('do-not-serve')
        (self.root / 'dist/escape.txt').symlink_to(outside)
        sub = self.root / 'dist/sub'
        sub.mkdir()
        (sub / 'index.html').symlink_to(outside)
        handler = partial(serve.Handler, directory=str(self.root / 'dist'), headers=serve.read_headers(self.root / 'dist/_headers'))
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for path in ('/escape.txt', '/sub/'):
                conn = http.client.HTTPConnection('127.0.0.1', server.server_address[1], timeout=5)
                conn.request('GET', path)
                resp = conn.getresponse()
                body = resp.read()
                conn.close()
                self.assertEqual(resp.status, 403, path)
                self.assertNotIn(b'do-not-serve', body, path)
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    unittest.main()
