#!/usr/bin/env python3
"""Prepare separate static RC/PROD folders. Never uploads or changes source assets."""
import argparse,csv,hashlib,json,mimetypes,re,shutil,zipfile,subprocess
from functools import lru_cache
from pathlib import Path
from urllib.parse import urljoin

ROOT=Path(__file__).resolve().parents[1]
HOSTS={'rc':'https://landings.rc.stage.books.mts.ru/','prod':'https://landings.stroki.mts.ru/'}
TEXT={'.html','.js','.mjs','.css','.json','.yaml','.yml','.svg','.txt','.xml'}
SKIP_EXT={'.md','.psd','.zip','.bak','.log','.map'}
MIME={'.js':'application/javascript','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.mp3':'audio/mpeg','.otf':'font/otf','.ttf':'font/ttf','.yaml':'application/yaml','.yml':'application/yaml'}
@lru_cache(maxsize=None)
def inline_modules(source):
 return subprocess.check_output(['node',str(ROOT/'scripts/inline-modules.mjs'),str(source)]).decode('utf-8')

def digest(b):return hashlib.sha256(b).hexdigest()
def build(out,slug,env):
 dest=out/env/slug
 if dest.exists():shutil.rmtree(dest)
 dest.mkdir(parents=True)
 base=urljoin(HOSTS[env],slug+'/');rows=[];binary_unchanged=0
 for source in sorted((ROOT/'dist').rglob('*')):
  if not source.is_file():continue
  rel=source.relative_to(ROOT/'dist')
  if any(x.startswith('.') for x in rel.parts) or source.suffix.lower() in SKIP_EXT:continue
  if rel.parts[0]=='quiz-study' or str(rel)=='map-study/index.html':continue
  target=rel.with_suffix('.js') if source.suffix=='.mjs' else rel
  path=dest/target
  if path.exists():raise RuntimeError('Duplicate target: '+str(target))
  body=source.read_bytes();original=digest(body)
  if source.suffix in TEXT:
   try:text=body.decode('utf-8')
   except UnicodeDecodeError:text=None
   if text is not None:
    if source.suffix=='.html':text=inline_modules(source)
    text=text.replace('https://pesni-zemli-hero.neonpersimmon.chatgpt.site/',base)
    if str(rel)=='robots.txt':text='User-agent: *\n'+('Disallow: /'+slug+'/\n' if env=='rc' else 'Allow: /'+slug+'/\nSitemap: '+base+'sitemap.xml\n')
    text=text.replace('.mjs','.js')
    if str(rel)=='index.html':
     text=text.replace('https://pesni-zemli-hero.neonpersimmon.chatgpt.site/',base)
     text=text.replace('<head>', '<head>\n<script>if(location.pathname.endsWith("/'+slug+'"))location.replace(location.pathname+"/"+location.search+location.hash);</script>',1)
     text=re.sub(r'<link rel="canonical"[^>]*>', '<link rel="canonical" href="'+base+'">',text)
     if env=='rc':text=re.sub(r'<meta name="robots"[^>]*>', '<meta name="robots" content="noindex,nofollow">',text)
    body=text.encode('utf-8')
  else:
   assert original==digest(body)
   binary_unchanged+=1
  path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(body)
  mime=MIME.get(path.suffix.lower(),mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
  cache='no-cache, max-age=0' if path.suffix=='.html' else 'public, max-age=300' if path.suffix in {'.js','.css','.json','.yaml','.yml'} else 'public, max-age=86400'
  rows.append({'key':slug+'/'+target.as_posix(),'bytes':len(body),'sha256':digest(body),'content_type':mime,'cache_control':cache,'source_sha256':original})
 assert not list(dest.rglob('*.mjs'))
 assert not any('neonpersimmon.chatgpt.site' in f.read_text(errors='ignore') for f in dest.rglob('*.html'))
 manifest=out/(env+'-upload-manifest.csv')
 with manifest.open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 archive=out/('pesni-zemli-'+env+'.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for row in rows:z.write(dest.parent/row['key'],row['key'])
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  assert slug+'/index.html' in z.namelist()
 summary={'environment':env,'url':base,'index_url':base+'index.html','folder':str(dest),'archive':str(archive),'files':len(rows),'unpacked_bytes':sum(r['bytes'] for r in rows),'archive_bytes':archive.stat().st_size,'archive_sha256':digest(archive.read_bytes()),'binary_assets_unchanged':binary_unchanged,'mjs_adapted_to_js':True,'module_scripts_inlined':True,'uploaded':False}
 return summary
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--output',required=True);a.add_argument('--slug',default='pesni-zemli');args=a.parse_args()
 if not re.fullmatch('[a-z0-9-]+',args.slug):raise SystemExit('Use a lowercase URL folder name')
 out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
 if out==ROOT or ROOT/'dist' in out.parents:raise SystemExit('Output must be outside dist')
 summaries=[build(out,args.slug,env) for env in HOSTS]
 (out/'release-manifest.json').write_text(json.dumps(summaries,ensure_ascii=False,indent=2))
 for s in summaries:print(json.dumps(s,ensure_ascii=False))
