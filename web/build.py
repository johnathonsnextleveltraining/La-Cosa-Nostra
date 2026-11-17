"""Turns Nino's v54 source (unzipped into ./src) into the standalone La Cosa Nostra site.
   python3 web/build.py patch     -> edits ./src for the Supabase adapter + Sit-Down
   python3 web/build.py assemble  -> writes ./dist/index.html (CSS inlined) and copies static files"""
import sys, os, shutil, glob

def rep(path, pairs):
    s = open(path, encoding='utf-8').read()
    for a, b, n in pairs:
        c = s.count(a)
        if (n == -1 and c == 0) or (n != -1 and c != n):
            sys.exit(f'patch failed in {path}: expected {n} of {a[:60]!r}, found {c}')
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

def patch():
    rep('src/app/page.tsx', [
        ("from 'lucide-react';", "from '../../web/lucide.tsx';\nimport SitDown from '../../web/sitdown.tsx';", 1),
        ("@/lib/", "../lib/", -1),
        ("'/art/", "'art/", -1), ('"/art/', '"art/', -1), ('`/art/', '`art/', -1), ("url(/art/", "url(art/", -1),
        ("AbortSignal.timeout(15000)", "AbortSignal.timeout(180000)", 1),
        ("['The Ledger',BookOpen],['Import Picks',Upload],['Data Health',ShieldCheck]]", "['The Ledger',BookOpen],['The Sit-Down',MessageSquare],['Data Health',ShieldCheck]]", 1),
        ("import {LayoutDashboard,", "import {MessageSquare,LayoutDashboard,", 1),
        ("{!['Import Picks','The Bankroll','Data Health','Paid in Full','Usual Suspects'].includes(page)", "{!['Import Picks','The Bankroll','Data Health','Paid in Full','Usual Suspects','The Sit-Down'].includes(page)", 1),
        ("'Data Health':'A clean record starts with a clear source.'}", "'Data Health':'A clean record starts with a clear source.','The Sit-Down':'The family talks here. Boss reads everything.'}", 1),
        ("{page==='Data Health'&&<Health data={data}/>}", "{page==='Data Health'&&<Health data={data}/>}{page==='The Sit-Down'&&<SitDown/>}", 1),
        ('<a className="brand" href="/"', '<a className="brand" href="./"', 1),
        ('<span className="brand-mark">LCN<span>♛</span></span>', '<img className="brand-icon" src="icon.svg" alt="La Cosa Nostra crown"/>', 1),
    ])
    rep('src/app/paid-in-full.tsx', [("@/lib/", "../lib/", -1), ("'/art/", "'art/", -1), ('"/art/', '"art/', -1)])
    for f in glob.glob('src/app/*.tsx'):
        if '/art/' in open(f, encoding='utf-8').read():
            sys.exit('leftover /art/ path in ' + f)

def assemble():
    css = open('web/preflight.css').read() + '\n' + open('src/app/globals.css').read().replace("@import 'tailwindcss';", '', 1) \
        + '\n.brand-icon{width:52px;height:52px;flex-shrink:0;display:block}\n' + open('web/extra.css').read()
    html = open('web/index.template.html').read().replace('/*CSS*/', css)
    open('dist/index.html', 'w').write(html)
    shutil.copytree('art-src/public/art', 'dist/art', dirs_exist_ok=True)
    for f in ['icon.svg', 'manifest.webmanifest']:
        shutil.copy('web/' + f, 'dist/' + f)
    open('dist/.nojekyll', 'w').close()

if __name__ == '__main__':
    {'patch': patch, 'assemble': assemble}[sys.argv[1]]()
