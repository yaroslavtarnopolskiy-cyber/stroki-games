import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/games/runner/witch-scene.js',import.meta.url),'utf8');
function fixture(){let now=0,serial=0,frames=[],checkpoints=0;const timers=new Map(),events={},elements=[];
 const el=()=>({style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(name,fn){events[name]=fn}});
 const game=el(),hero=el();const c={game,hero,world:{appendChild:e=>elements.push(e)},worldX:1080*(3000/1080)*6.86,innerHeight:1080,innerWidth:1920,gameStarted:true,running:true,tutorialActive:false,infiniteMode:false,jump:{},wading:{},performance:{now:()=>now},document:{createElement:el,body:{appendChild:e=>elements.push(e)}},matchMedia:()=>({matches:false}),heroScreenX:()=>200,activateWitchCheckpoint:()=>checkpoints++,requestAnimationFrame:fn=>{frames.push(fn)},clearTimeout:id=>timers.delete(id),setTimeout:(fn,ms)=>{timers.set(++serial,{fn,due:now+ms});return serial},addEventListener:(name,fn)=>events[name]=fn};c.window=c;vm.createContext(c);vm.runInContext(source,c);
 function tick(ms){now+=ms;const next=frames;frames=[];next.forEach(fn=>fn(now));for(const [id,timer] of [...timers])if(timer.due<=now){timers.delete(id);timer.fn()}}
 tick(0);tick(0);assert.equal(c.running,false);const bubble=elements.find(e=>e.id==='witch-bubble');assert.equal(bubble.style.opacity,'1');
 return {c,tick,bubble,checkpoints:()=>checkpoints,act(name,code){let prevented=false;events[name]({code,target:{closest:()=>false},preventDefault(){prevented=true},stopPropagation(){}});return prevented}};
}
for(const [name,code] of [['pointerdown'],['touchstart'],['keydown','ArrowUp'],['keydown','ArrowDown'],['keydown','Space'],['keydown','KeyE']]){
 const f=fixture();f.tick(1999);assert(f.act(name,code));assert.equal(f.bubble.style.opacity,'1');assert.equal(f.checkpoints(),0);
 f.tick(1);f.act(name,code);assert.equal(f.bubble.style.opacity,'0');assert.equal(f.checkpoints(),1);assert.equal(f.c.running,false);f.tick(850);assert.equal(f.c.running,true);assert.equal(f.c.lastFrameAt,2850);
 f.act(name,code);assert.equal(f.checkpoints(),1);
}
{
 const f=fixture();f.tick(10000);assert.equal(f.bubble.style.opacity,'1','No auto-dismiss');assert.equal(f.c.runnerContinueWitchScene(),true);assert.equal(f.bubble.style.opacity,'0');f.tick(850);assert(f.c.running);assert.equal(f.c.runnerContinueWitchScene(),false);
 for(const [width,height] of [[320,180],[667,375],[844,390],[1920,1080]]){f.c.innerWidth=width;f.c.innerHeight=height;f.act('resize');assert(parseFloat(f.bubble.style.width)<=width);assert(parseFloat(f.bubble.style.top)+parseFloat(f.bubble.style.maxHeight)<=height)}
}
console.log('PASS: witch dialogue cannot skip first two seconds, resumes on pointer/touch/controls or host routing, creates one checkpoint, does not auto-dismiss');
