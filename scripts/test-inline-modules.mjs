import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const root=new URL('../',import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'pesni-inline-'));
try{for(const entry of ['dist/index.html','dist/games/human-beast/index.html']){
 const html=execFileSync('node',[new URL('scripts/inline-modules.mjs',root).pathname,new URL(entry,root).pathname],{encoding:'utf8',maxBuffer:2e6});
 assert(!/<script\b(?=[^>]*type="module")(?=[^>]*src=)/i.test(html));assert(!/rel="modulepreload"/.test(html));
 let count=0;for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(/type="module"|data-inline-analytics/.test(match[1])){const file=path.join(temp,`${count++}.mjs`);fs.writeFileSync(file,match[2]);execFileSync('node',['--check',file]);}
 assert(count>0);
}console.log('PASS: module graphs inline without external imports; generated JavaScript parses, including minified dollar tokens');}finally{fs.rmSync(temp,{recursive:true,force:true})}
