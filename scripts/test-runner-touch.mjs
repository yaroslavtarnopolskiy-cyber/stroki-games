import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c={module:{exports:{}}};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../dist/games/runner/touch-input.js',import.meta.url),'utf8'),c);
let time=0,active=true,jumps=0,forms=0,id=0;const jobs=new Map();
const input=c.module.exports.createRunnerTouchInput({jump:()=>jumps++,changeForm:()=>forms++,canAct:()=>active,now:()=>time,schedule:(fn,ms)=>{jobs.set(++id,{fn,at:time+ms});return id},cancelTimer:id=>jobs.delete(id)});
function advance(ms){time+=ms;for(const [id,j] of [...jobs])if(j.at<=time){jobs.delete(id);j.fn()}}
input.tap(10,10);advance(90);input.tap(12,12);assert.equal(jumps,1);advance(300);assert.equal(forms,0,'Double tap must not also change form');
input.tap(10,10);advance(200);assert.equal(forms,1);input.tap(10,10);input.swipeUp();assert.equal(jumps,2);advance(250);assert.equal(forms,1);
input.tap(10,10);input.cancel();advance(250);assert.equal(forms,1);input.tap(10,10);active=false;advance(250);assert.equal(forms,1);
console.log('PASS: double-tap jump without form switch, one-tap form, immediate swipe jump, cancellation and inactive-game guard');
