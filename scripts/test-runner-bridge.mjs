import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let wall=100,next=1;const scheduled=new Map(),handlers={},docHandlers={},sent=[];
function add(fn,delay){const id=next++;scheduled.set(id,{fn,due:wall+delay});return id}
function advance(ms){const target=wall+ms;let count=0;while(true){const entry=[...scheduled].sort((a,b)=>a[1].due-b[1].due)[0];if(!entry||entry[1].due>target)break;if(++count>1000)throw Error('Timer loop');wall=entry[1].due;scheduled.delete(entry[0]);entry[1].fn(wall)}wall=target}
const parent={postMessage:m=>sent.push(m)};
const document={hidden:false,images:[],fonts:{ready:Promise.resolve()},documentElement:{dataset:{},classList:{toggle(){},add(){}}},addEventListener:(name,fn)=>docHandlers[name]=fn};
const context={parent,document,location:{origin:'http://example.test'},performance:{now:()=>wall},URL,Promise,
 requestAnimationFrame:fn=>add(fn,16),cancelAnimationFrame:id=>scheduled.delete(id),setTimeout:(fn,delay=0)=>add(fn,delay),clearTimeout:id=>scheduled.delete(id),addEventListener:(name,fn)=>handlers[name]=fn};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../dist/games/runner/landing-bridge.js',import.meta.url),'utf8'),context);
const send=(type,extra={})=>handlers.message({source:parent,origin:context.location.origin,data:{channel:'pesni-runner',type,...extra}});
const frames=[],timers=[];context.requestAnimationFrame(time=>frames.push(time));context.setTimeout(()=>timers.push(context.performance.now()),100);
advance(1000);assert.equal(frames.length,0);assert.equal(timers.length,0);assert.equal(context.performance.now(),100);
handlers.message({source:{},origin:context.location.origin,data:{channel:'pesni-runner',type:'resume'}});advance(50);assert.equal(frames.length,0);
send('resume');advance(16);assert.deepEqual(frames,[116]);send('pause');const frozen=context.performance.now();advance(5000);assert.equal(context.performance.now(),frozen);assert.equal(timers.length,0);
send('resume');advance(84);assert.deepEqual(timers,[200]);
let ticks=0;const id=context.setInterval(()=>ticks++,20);advance(40);assert.equal(ticks,2);send('pause');advance(500);assert.equal(ticks,2);send('resume');advance(20);assert.equal(ticks,3);context.clearInterval(id);advance(100);assert.equal(ticks,3);
const cancelled=context.requestAnimationFrame(()=>assert.fail('Cancelled frame executed'));context.cancelAnimationFrame(cancelled);advance(20);
document.hidden=true;docHandlers.visibilitychange();const hiddenTime=context.performance.now();advance(500);assert.equal(context.performance.now(),hiddenTime);document.hidden=false;docHandlers.visibilitychange();advance(20);assert.equal(context.performance.now(),hiddenTime+20);
send('configure',{shareUrl:'https://other.test/'});assert.equal(context.runnerLandingUrl,undefined);send('configure',{shareUrl:'http://example.test/#games'});assert.equal(context.runnerLandingUrl,'http://example.test/#games');
let jumps=0,forms=0;context.gameStarted=true;context.startJump=()=>jumps++;context.toggleHeroForm=()=>forms++;
send('control',{code:'ArrowUp'});send('control',{code:'ArrowDown'});assert.equal(jumps,1);assert.equal(forms,1);
send('pause');send('control',{code:'ArrowUp'});assert.equal(jumps,1);send('resume');
handlers.message({source:{},origin:context.location.origin,data:{channel:'pesni-runner',type:'control',code:'ArrowDown'}});assert.equal(forms,1);
let finishes=0;context.runnerFinishRun=()=>finishes++;send('pause');send('finish');assert.equal(finishes,1);assert.equal(document.documentElement.dataset.runnerState,'active');
console.log('PASS: pause/resume freezes game clock, RAF, timeouts, intervals; cancellation, tab visibility and origin checks');
