"""Rebuild only the inlined CSS + cache-busted script tag in docs/index.html (art is already in docs/)."""
import hashlib, re
css = open('web/preflight.css').read() + '\n' + open('src/app/globals.css').read().replace("@import 'tailwindcss';", '', 1) \
    + '\n.brand-icon{width:52px;height:52px;flex-shrink:0;display:block}\n' + open('web/extra.css').read()
v = hashlib.sha1(open('docs/app.js','rb').read()).hexdigest()[:8]
html = open('web/index.template.html').read().replace('/*CSS*/', css)
html = re.sub(r'<script src="app\.js[^"]*">', f'<script src="app.js?v={v}">', html)
open('docs/index.html', 'w').write(html)
print('index.html rebuilt, app.js?v=' + v)
