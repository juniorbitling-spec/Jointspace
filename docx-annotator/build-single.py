#!/usr/bin/env python3
"""Bundle the app into ONE self-contained HTML file (for app builders such as AppMint).
Usage: python3 build-single.py  ->  dist/DOCX-Annotator.html"""
import base64, os, re
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(here, p), encoding='utf-8').read()
html = rd('index.html')
js = lambda s: s.replace('</script', '<\\/script')

html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + rd('style.css') + '\n</style>')
for src in ['vendor/jszip.min.js', 'vendor/docx-preview.min.js', 'app.js']:
    html = html.replace(f'<script src="{src}"></script>', '<script>\n' + js(rd(src)) + '\n</script>')
icon = 'data:image/svg+xml;base64,' + base64.b64encode(rd('icons/icon.svg').encode()).decode()
html = html.replace('href="icons/icon.svg"', f'href="{icon}"')
html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
html = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', '', html)
assert not re.search(r'(src|href)="(?!data:|https?:)[^"#]+\.(js|css|svg|png)"', html), 'external file left'
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
out = os.path.join(here, 'dist', 'DOCX-Annotator.html')
open(out, 'w', encoding='utf-8').write(html)
print(out, f'{len(html)/1024:.0f} KB')
