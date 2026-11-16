import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/voices.js',import.meta.url),'utf8');
let now=0,id=0,io;const jobs=new Map(),shape=()=>({attrs:{},ownerSVGElement:{},setAttribute(k,v){this.attrs[k]=v},getBoundingClientRect(){throw Error('Forced layout during switch')}}),visible=shape(),offscreen=shape();
const c={worldMode:'life',innerHeight:800,performance:{now:()=>now},requestAnimationFrame:fn=>{jobs.set(++id,fn);return id},cancelAnimationFrame:id=>jobs.delete(id),matchMedia:()=>({matches:false}),IntersectionObserver:class{constructor(fn){io=fn}observe(){}},document:{querySelectorAll:s=>s==='.flow-liquid'?[visible,offscreen]:[]},pesniConnection:{canAnimate:()=>true}};c.window=c;vm.createContext(c);
vm.runInContext(source.slice(source.indexOf('const switchShapes='),source.indexOf('\nfunction setWorldMode(')),c);
c.animateSwitchShape('life');io([{target:visible,isIntersecting:true}]);const initial=visible.attrs.d;c.animateSwitchShape('death');
function advance(t){now=t;const frames=[...jobs.values()];jobs.clear();frames.forEach(fn=>fn(t))}
advance(180);assert.notEqual(visible.attrs.d,initial);assert.equal(offscreen.attrs.d,initial,'Only visible switch morphs per frame');
c.animateSwitchShape('life');assert.equal(jobs.size,1,'Rapid reversal cancels old animation');advance(540);assert.equal(jobs.size,0);assert.equal(visible.attrs.d,initial);assert.equal(offscreen.attrs.d,initial);
const circle=shape(),region=shape();region.removeAttribute=function(k){delete this.attrs[k]};Object.assign(c,{waterCircles:new Map([['one',circle]]),waterRegions:new Map([['one',region]]),lands:[{id:'one',x:200,y:300}]});
vm.runInContext(source.slice(source.indexOf('let waterFrame='),source.indexOf('\nfunction select(')),c);c.floodRegion('one');assert(region.attrs.mask);advance(1265);assert(Number(circle.attrs.r)>0);advance(1990);assert.equal(region.attrs.mask,undefined,'Completed flood releases expensive filter');assert.equal(jobs.size,0);
console.log('PASS: visible-only morph, no forced switch layout, rapid reversal, synchronized final shape, flood filter released');
