import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const root=new URL('../dist/games/three-gifts/',import.meta.url),source=fs.readFileSync(new URL('js/mirror-quest.js',root),'utf8');
const functionSource=source.slice(source.indexOf('  function opaqueAt('),source.indexOf('\n  /** Верхний объект',source.indexOf('  function opaqueAt(')));
const c={masks:{},HIT_ALPHA:10};vm.createContext(c);vm.runInContext(functionSource,c);
const rect={left:100,top:100,right:120,bottom:120,width:20,height:20};const shard=id=>({dataset:{id,src:'not-decoded'},querySelector:()=>({getBoundingClientRect:()=>rect}),classList:{contains:()=>true}});
assert(c.opaqueAt(shard('shard_magpie'),79,110));assert(c.opaqueAt(shard('shard_merchant'),141,110));assert(!c.opaqueAt(shard('shard_magpie'),77,110));assert(c.opaqueAt(shard('shard_tree'),85,110));assert(!c.opaqueAt(shard('shard_tree'),79,110));
function atoms(buffer){const result=[];for(let p=0;p<buffer.length;){const n=buffer.readUInt32BE(p);assert(n>=8&&p+n<=buffer.length);result.push({name:buffer.toString('ascii',p+4,p+8),bytes:buffer.subarray(p,p+n)});p+=n}return result}
const before=atoms(fs.readFileSync(new URL('assets/video/amipat_mirror.mp4',root))),after=atoms(fs.readFileSync(new URL('assets/video/amipat_mirror_mobile.mp4',root)));
assert(after.findIndex(a=>a.name==='moov')<after.findIndex(a=>a.name==='mdat'));
const hash=a=>crypto.createHash('sha256').update(a.find(x=>x.name==='mdat').bytes).digest('hex');assert.equal(hash(before),hash(after),'Video media bytes remain identical');
console.log('PASS: mobile shard targets work before alpha decode, special 5/6 margins, fast-start MP4 without re-encoding');
