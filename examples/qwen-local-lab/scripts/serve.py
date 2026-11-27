#!/usr/bin/env python3
"""Serve the built static page locally with the headers build.py wrote to dist/_headers."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

DIST = Path(__file__).resolve().parent.parent / 'dist'


def read_headers(path):
    """Parse the `/*` block of a static-host _headers file into (name, value) pairs."""
    headers = []
    for line in path.read_text(encoding='utf-8').splitlines():
        if line.startswith('  ') and ':' in line:
            name, value = line.strip().split(':', 1)
            headers.append((name, value.strip()))
    return headers


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, headers, **kwargs):
        self.site_headers = headers
        super().__init__(*args, **kwargs)

    @staticmethod
    def _is_within_root(target, root):
        resolved = target.resolve()
        return resolved == root or root in resolved.parents

    def send_head(self):
        root = Path(self.directory).resolve()
        candidate = Path(self.translate_path(self.path))
        if not self._is_within_root(candidate, root):
            self.send_error(403, 'Forbidden')
            return None
        if candidate.is_dir():
            for index in getattr(self, 'index_pages', ('index.html', 'index.htm')):
                index_path = candidate / index
                if index_path.exists() or index_path.is_symlink():
                    if not self._is_within_root(index_path, root):
                        self.send_error(403, 'Forbidden')
                        return None
                    break
        return super().send_head()

    def end_headers(self):
        for name, value in self.site_headers:
            self.send_header(name, value)
        super().end_headers()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    handler = partial(Handler, directory=str(DIST), headers=read_headers(DIST / '_headers'))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Qwen Local Lab: http://localhost:{args.port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
