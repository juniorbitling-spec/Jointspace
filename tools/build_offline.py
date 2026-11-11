"""Build Study-Highlighter.html: one file with every library and font inlined.

Usage: python3 tools/build_offline.py
Reads study-highlighter/index.html and tools/vendor/*, writes Study-Highlighter.html.
Fonts are fetched once from Google Fonts (latin + latin-ext) and cached in tools/vendor/fonts/.
"""
import base64, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, 'tools', 'vendor')
src = open(os.path.join(ROOT, 'study-highlighter', 'index.html'), encoding='utf-8').read()

def js(name):
    return open(os.path.join(V, name), encoding='utf-8').read().replace('</script', '<\\/script')

# ---- fonts: keep latin + latin-ext faces, embed as data URIs ----
css = open(os.path.join(V, 'fonts.css'), encoding='utf-8').read()
os.makedirs(os.path.join(V, 'fonts'), exist_ok=True)
by_url = {}
for subset, body in re.findall(r'/\* ([a-z-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
    if subset not in ('latin', 'latin-ext'):
        continue
    url = re.search(r'url\((https://[^)]+)\)', body).group(1)
    w = int(re.search(r'font-weight: (\d+)', body).group(1))
    if url in by_url:  # variable font: one file serves several weights
        by_url[url]['w'].append(w)
    else:
        by_url[url] = {'body': body, 'w': [w]}
faces = []
for url, f in by_url.items():
    path = os.path.join(V, 'fonts', url.rsplit('/', 1)[-1])
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)
    data = base64.b64encode(open(path, 'rb').read()).decode()
    body = re.sub(r'font-weight: \d+', f"font-weight: {min(f['w'])} {max(f['w'])}", f['body'])
    faces.append(body.replace(url, 'data:font/woff2;base64,' + data))
font_css = '<style>\n' + '\n'.join(faces) + '\n</style>'

# ---- swap CDN tags for inline copies ----
out = re.sub(r'<link rel="preconnect"[^>]*>\n', '', src)
out = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', lambda m: font_css, out)
for tag, name in [
    ('<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"></script>', 'purify.min.js'),
    ('<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>', 'marked.min.js'),
]:
    assert tag in out, tag
    out = out.replace(tag, '<script>' + js(name) + '</script>')

# Large import helpers stay dormant as text and only run when a PDF or .docx is opened.
lazy = ''.join(
    f'<script type="text/plain" data-lib="https://cdnjs.cloudflare.com/ajax/libs/{p}">{js(os.path.basename(p))}</script>\n'
    for p in ['pdf.js/3.11.174/pdf.min.js', 'pdf.js/3.11.174/pdf.worker.min.js', 'mammoth/1.6.0/mammoth.browser.min.js'])
head, tail = out.rsplit('</body>', 1)  # the real closing tag, not the ones inside JS strings
out = head + lazy + '</body>' + tail

# loadScript: use the embedded copy when present
old = "    if (document.querySelector(`script[src=\"${src}\"]`)) return res();\n"
assert old in out
out = out.replace(old, old + """    const local = document.querySelector(`script[data-lib="${src}"]`);
    if (local) {
      if (local.dataset.loaded) return res();
      try { const s = document.createElement('script'); s.textContent = local.textContent; document.head.appendChild(s); local.dataset.loaded = '1'; return res(); }
      catch (e) { return rej(e); }
    }
""")
assert 'cdnjs' not in re.sub(r'data-lib="[^"]*"|base \+ \'[^\']*\'|const base = \'[^\']*\'|loadScript\(\'[^\']*\'\)', '', out), 'leftover CDN reference'
dst = os.path.join(ROOT, 'Study-Highlighter.html')
open(dst, 'w', encoding='utf-8').write(out)
print(dst, round(len(out.encode()) / 1e6, 2), 'MB', len(faces), 'font faces')
