// Package ES modules inline so S3 MIME metadata cannot block their dependency graph.
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const file=path.resolve(process.argv[2]);
let html=await fs.readFile(file,'utf8');
html=html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>\s*/gi,'');
const matches=[...html.matchAll(/<script\b([^>]*\btype=["']module["'][^>]*)>\s*<\/script>/gi)];
for(const match of matches){
 const src=match[1].match(/\bsrc=["']([^"']+)["']/i)?.[1];
 if(!src)continue;
 if(/^(?:https?:)?\/\//.test(src))throw Error('External module must be reviewed: '+src);
 const entry=path.resolve(path.dirname(file),src.split('?')[0]);
 const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline',metafile:true,plugins:[{
  name:'portable-share-url',setup(b){b.onLoad({filter:/share-card\.mjs$/},async args=>({contents:(await fs.readFile(args.path,'utf8')).replaceAll('import.meta.url',`new URL('story-matcher/share-card.js',document.baseURI).href`),loader:'js'}))}
 }]});
 if(Object.values(result.metafile.outputs).some(o=>o.imports.length))throw Error('Unbundled imports in '+entry);
 const code=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
 html=html.replace(match[0],()=>`<script type="module" data-inline-module="${src.split('?')[0]}">\n${code}\n</script>`);
}
// Install the event bridge before any inline module can emit its first event.
const analytics=await fs.readFile(new URL('../dist/analytics.js',import.meta.url),'utf8');
html=html.replace(/<script\b[^>]*src=["']analytics\.js[^"']*["'][^>]*>\s*<\/script>/i,()=>'<script data-inline-analytics>\n'+analytics.replace(/<\/script/gi,'<\\/script')+'\n</script>');
process.stdout.write(html);
