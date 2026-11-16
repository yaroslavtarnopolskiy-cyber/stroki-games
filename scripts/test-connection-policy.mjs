import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/connection-policy.js',import.meta.url),'utf8');
function boot({api=true,seen=false,hostname="example.test"}={}){
 const events={},connection={effectiveType:'4g',downlink:10,rtt:50,saveData:false,addEventListener:(n,f)=>events['connection:'+n]=f},reduced={matches:false,addEventListener:(n,f)=>events['reduced:'+n]=f},notices=[],timers=[],animations=[];
 const context={location:{hostname},navigator:{onLine:true,...(api?{connection}:{})},document:{documentElement:{dataset:{}},querySelector:()=>({append:n=>notices.push(n)}),createElement:()=>({animate:(frames,options)=>animations.push({frames,options}),remove(){this.removed=true}})},localStorage:{getItem:()=>seen?'1':null,setItem:()=>{seen=true}},matchMedia:()=>reduced,Event:class{constructor(type){this.type=type}},addEventListener:(n,f)=>{const previous=events[n];events[n]=previous?()=>{previous();f()}:f},dispatchEvent(){},setTimeout:(fn,delay)=>timers.push({fn,delay})};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);return {context,events,connection,reduced,notices,timers,animations};
}
const b=boot();const allowed=()=>b.context.pesniConnection.canAnimate();
assert.equal(allowed(),true,'Motion must not wait for page load');b.events.DOMContentLoaded();assert.equal(allowed(),true);
for(const field of ['saveData','effectiveType']){const previous=b.connection[field];b.connection[field]=({saveData:true,effectiveType:'2g',downlink:.4,rtt:900})[field];b.events['connection:change']();assert.equal(allowed(),false,field);b.connection[field]=previous;b.events['connection:change']();assert.equal(allowed(),true)}
b.context.navigator.onLine=false;b.events.offline();assert.equal(allowed(),false);b.context.navigator.onLine=true;b.events.online();assert.equal(allowed(),true);
b.reduced.matches=true;b.events['reduced:change']();assert.equal(allowed(),false);
assert.equal(b.notices.length,1);assert.match(b.notices[0].textContent,/корректной/);
const noAPI=boot({api:false,seen:true});noAPI.events.DOMContentLoaded();assert.equal(noAPI.context.pesniConnection.canAnimate(),true,'Unknown network must remain usable');assert.equal(noAPI.notices.length,0);
console.log('PASS: initial loading, 3G, low bandwidth, high latency, data saver, offline, recovery, reduced motion, unsupported network API and first-visit notice');

const notice=boot();assert.equal(notice.notices[0].hidden,true);notice.events.DOMContentLoaded();assert.equal(notice.notices[0].hidden,false);assert.equal(notice.animations[0].options.duration,550);assert.equal(notice.timers[0].delay,6000);notice.timers[0].fn();assert.equal(notice.animations[1].options.duration,450);notice.timers[1].fn();assert.equal(notice.notices[0].removed,true);
const slow=boot();slow.connection.effectiveType='2g';slow.events.DOMContentLoaded();assert.equal(slow.animations.length,0);slow.timers[0].fn();assert.equal(slow.notices[0].removed,true);assert.equal(slow.animations.length,0);
console.log('PASS: notice rises on good connection, fades after six seconds, removes itself, and skips motion on slow connection');

const dom=boot({seen:true});dom.events.DOMContentLoaded();assert.equal(dom.context.pesniConnection.canAnimate(),true,'Motion does not wait for images, metrics or window.load');dom.connection.effectiveType='3g';dom.connection.downlink=10;dom.events['connection:change']();assert.equal(dom.context.pesniConnection.canAnimate(),true,'A stale 3G label alone must not freeze good connectivity');
console.log('PASS: DOM-ready enables motion before window.load; fast connection with 3G label remains animated');

const local=boot({hostname:'127.0.0.1',seen:true});local.connection.downlink=.1;local.connection.rtt=2000;local.connection.effectiveType='2g';local.context.navigator.onLine=false;local.events.offline();assert.equal(local.context.pesniConnection.canAnimate(),true,'Local assets must not freeze from estimated internet quality');local.connection.saveData=true;local.events['connection:change']();assert.equal(local.context.pesniConnection.canAnimate(),false);local.connection.saveData=false;local.reduced.matches=true;local.events['reduced:change']();assert.equal(local.context.pesniConnection.canAnimate(),false);
const estimated=boot({seen:true});estimated.connection.downlink=.1;estimated.connection.rtt=2000;estimated.events['connection:change']();assert.equal(estimated.context.pesniConnection.canAnimate(),true,'Unreliable RTT/downlink estimates no longer freeze decorative motion');
console.log('PASS: loopback bypasses connection estimates and offline status; data saver and reduced motion remain respected');
