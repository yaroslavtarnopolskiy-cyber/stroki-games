import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {createRunnerMouseInput}=require('../dist/games/runner/mouse-input.js');
const {fitResultLayout}=require('../dist/games/runner/result-layout.js');
let time=0,serial=0,active=true,jumps=0,forms=0;const jobs=new Map();
const input=createRunnerMouseInput({jump:()=>jumps++,changeForm:()=>forms++,canAct:()=>active,schedule:(fn,delay)=>{const id=++serial;jobs.set(id,{fn,due:time+delay});return id},cancelTimer:id=>jobs.delete(id)});
const mouse=(options={})=>({button:0,pointerType:'mouse',target:{closest:()=>false},preventDefault(){},...options});
function advance(ms){time+=ms;for(const [id,job] of [...jobs])if(job.due<=time){jobs.delete(id);job.fn()}}
input.click(mouse());advance(99);assert.equal(jumps,0);advance(1);assert.equal(jumps,1);assert.equal(forms,0);
input.click(mouse());advance(60);input.click(mouse({detail:2}));assert.equal(forms,1);advance(1000);assert.equal(jumps,1);
input.click(mouse());input.pointerDown(mouse({button:2}));assert.equal(forms,2);advance(1000);assert.equal(jumps,1);
input.click(mouse({pointerType:'touch'}));input.click(mouse({target:{closest:()=>true}}));advance(1000);assert.equal(jumps,1);
input.click(mouse());input.cancel();advance(1000);assert.equal(jumps,1);
input.click(mouse());active=false;advance(1000);assert.equal(jumps,1);input.pointerDown(mouse({button:2}));assert.equal(forms,2);
active=true;input.click(mouse());advance(100);input.click(mouse());advance(100);assert.equal(jumps,3);assert.equal(forms,2);
for(const [w,h] of [[320,180],[390,220],[520,290],[1024,768],[844,390],[1920,1080]])for(const meters of [0,41,300,99999999]){
 const text=`${meters} М`,layout=fitResultLayout(w,h,text.length);
 assert(layout.width<=w+.001&&layout.height<=h+.001);
 assert(layout.height*.725+layout.distanceFont*1.15<layout.height,'Counter fits below its top edge');
 assert(layout.distanceFont*text.length*.7<=layout.width*.25+.001,'Long records fit horizontally');
}
const palette=fs.readFileSync(new URL('../dist/games/runner/palette.js',import.meta.url),'utf8').match(/values="([^"]+)"/)[1].split(/\s+/).map(Number);
const colour=(rgb)=>[0,1,2].map(row=>Math.round(rgb.reduce((sum,v,col)=>sum+v*palette[row*5+col],255*palette[row*5+4])));
assert.deepEqual(colour([255,0,0]),[215,37,31]);assert.deepEqual(colour([0,0,255]),[40,109,158]);
for(const grey of [0,32,127,200,255])assert.deepEqual(colour([grey,grey,grey]),[grey,grey,grey]);
console.log('PASS: single/double/right click, touch and UI exclusion, pause cancellation, inactive game, repeated clicks');
console.log('PASS: result layout at six viewport sizes and short/long records; exact red/blue and unchanged greys');
