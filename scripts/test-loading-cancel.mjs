import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
for(const [name,channel] of [['runner','pesni-runner'],['gifts','pesni-gifts'],['cards','pesni-cards']]){
 const messages=[],handlers={},listeners={},jobs=new Map();let next=1,observer;
 class Element{
  constructor(){this.dataset={};this.children=[];this.events={};this.classes=new Set();this.classList={add:(...x)=>x.forEach(n=>this.classes.add(n)),remove:(...x)=>x.forEach(n=>this.classes.delete(n))};this.contentWindow={postMessage:m=>messages.push(m)}}
  append(e){e.parent=this;this.children.push(e)}remove(){this.parent.children=this.parent.children.filter(e=>e!==this)}setAttribute(){}removeAttribute(){}focus(){}contains(){return true}querySelector(s){return this.lookup?.[s]||null}addEventListener(n,fn){this.events[n]=fn}
 }
 const stage=new Element(),expand=new Element(),trigger=new Element(),note=new Element(),poster=new Element(),html=new Element();stage.lookup={'.game-expand':expand,'.game-scene':poster};const section={querySelector:s=>({'.game-embed-slot':stage,'.game-preview-link':trigger,'.game-window-note':note}[s])};
 const c={document:{querySelector:()=>section,createElement:()=>new Element(),documentElement:html,activeElement:new Element(),hidden:false,addEventListener(n,fn){(listeners[n]??=[]).push(fn)},dispatchEvent(e){listeners[e.type]?.forEach(fn=>fn(e))}},matchMedia:()=>({matches:true,addEventListener(){}}),location:{origin:'http://test',pathname:'/'},addEventListener:(n,fn)=>handlers[n]=fn,setTimeout:fn=>{jobs.set(next,fn);return next++},clearTimeout:id=>jobs.delete(id),IntersectionObserver:class{constructor(fn){observer=fn}observe(){}},CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(new URL(`../dist/games/${name}-embed.js`,import.meta.url),'utf8'),c);
 const find=n=>stage.children.find(e=>e.className===n);
 find('runner-launch').events.click();const old=find('runner-frame');assert(old);assert.equal(stage.dataset.state,'loading');assert(!find('runner-close').hidden);assert(html.classes.has('runner-open'));
 find('runner-close').events.click();assert(!find('runner-frame'));assert.equal(stage.dataset.state,'idle');assert(!html.classes.has('runner-open'));assert(!find('runner-launch').hidden);assert.equal(jobs.size,0);
 handlers.message({source:old.contentWindow,origin:'http://test',data:{channel,type:'ready'}});assert.equal(stage.dataset.state,'idle','Cancelled iframe cannot start later');
 find('runner-launch').events.click();const fresh=find('runner-frame');assert.notEqual(fresh,old);handlers.message({source:fresh.contentWindow,origin:'http://test',data:{channel,type:'ready'}});assert.equal(stage.dataset.state,'playing');assert.equal(jobs.size,0);
 console.log(`PASS ${name}: cancel a stalled mobile load, unlock page, ignore stale ready and relaunch`);
}
