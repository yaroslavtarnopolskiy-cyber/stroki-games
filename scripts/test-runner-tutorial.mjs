import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/games/runner/tutorial-flow.js',import.meta.url),'utf8');
function fixture(){
 let now=0,next=0,raf=null;const timers=new Map(),listeners={},documentListeners={},classes=new Set(['is-hidden']),card={innerHTML:'old mouse-only cards'};
 const overlay={style:{},attributes:{'aria-hidden':'true'},classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)},setAttribute(k,v){this.attributes[k]=v},querySelector:s=>s==='.tutorial-card'?card:null};
 const c={tutorialOverlay:overlay,tutorialShown:false,tutorialActive:false,gameStarted:true,running:true,worldX:0,locationWidth:1000,infiniteMode:false,performance:{now:()=>now},resetRun(){},requestAnimationFrame:fn=>{raf=fn;return 1},setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,due:now+ms});return id},clearTimeout:id=>timers.delete(id),addEventListener:(name,fn,options)=>{(listeners[name]??=[]).push({fn,capture:!!options?.capture})},document:{hidden:false,addEventListener:(name,fn)=>documentListeners[name]=fn}};
 c.window=c;vm.createContext(c);vm.runInContext(source,c);
 return {c,card,visible:()=>overlay.attributes['aria-hidden']==='false',
 advance(ms){now+=ms;const frame=raf;raf=null;frame?.(now);for(const [id,timer] of [...timers])if(timer.due<=now){timers.delete(id);timer.fn()}},
 emit(name){let prevented=false,stopped=false,action=0;const event={preventDefault(){prevented=true},stopPropagation(){stopped=true}};
  c.addEventListener(name,()=>action++);
  [...(listeners[name]||[])].sort((a,b)=>Number(b.capture)-Number(a.capture)).forEach(l=>l.fn(event));
  return {prevented,stopped,action};},documentListeners};
}
{
 const f=fixture();assert(f.card.innerHTML.includes('клавиша ↑, пробел или один клик'));assert(f.card.innerHTML.includes('клавиша ↓, E, двойной клик или ПКМ'));
 f.c.resetRun();assert(f.visible());assert.equal(f.c.tutorialActive,false);assert.equal(f.c.running,true);
 f.advance(4999);assert(f.visible());f.advance(1);assert(!f.visible());f.advance(5000);assert(!f.visible());
}
for(const action of ['pointerdown','touchstart','click','keydown','contextmenu','wheel','blur']){
 const f=fixture();f.c.resetRun();assert(f.visible());const event=f.emit(action);assert(f.visible(),action+' must not dismiss');assert.equal(event.prevented,false);assert.equal(event.stopped,false);assert.equal(event.action,1);f.advance(5000);assert(!f.visible());
}
{
 const f=fixture();f.c.resetRun();f.advance(3000);f.c.resetRun();assert(f.visible());f.advance(2000);assert(f.visible(),'Old run timeout cannot close new tutorial');f.advance(3000);assert(!f.visible());
 f.c.infiniteMode=true;f.c.resetRun();f.advance(5000);assert(!f.visible());
 f.c.infiniteMode=false;f.c.worldX=500;f.c.resetRun();f.advance(5000);assert(!f.visible(),'Checkpoint resume does not show onboarding again');
}
console.log('PASS: onboarding from run start for exactly five seconds, input stays active without dismissing, reset timer cleanup, endless and checkpoint behavior');
