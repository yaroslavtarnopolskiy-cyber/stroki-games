import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const messages=[],handlers={},docListeners={},docHandlers={};let io;
class Element{
 constructor(tag='div'){this.tag=tag;this.dataset={};this.events={};this.children=[];this.classes=new Set();this.classList={add:(...n)=>n.forEach(x=>this.classes.add(x)),remove:n=>this.classes.delete(n)};this.contentWindow={postMessage:m=>messages.push(m)};this.hidden=false}
 append(e){e.parent=this;this.children.push(e)}setAttribute(){}removeAttribute(){}addEventListener(n,fn){this.events[n]=fn}focus(){}remove(){this.parent.children=this.parent.children.filter(e=>e!==this)}contains(){return true}querySelector(s){return this.lookup?.[s]??null}
}
const stage=new Element(),expand=new Element(),trigger=new Element(),note=new Element(),poster=new Element();stage.lookup={'.game-expand':expand,'.game-scene':poster};const section={querySelector:s=>({'.game-embed-slot':stage,'.game-preview-link':trigger,'.game-window-note':note}[s])};
const c={document:{querySelector:()=>section,createElement:t=>new Element(t),documentElement:new Element(),hidden:false,activeElement:new Element(),addEventListener:(n,fn)=>docHandlers[n]=fn},matchMedia:()=>({matches:false,addEventListener(){}}),location:{origin:'http://test',pathname:'/'},addEventListener:(n,fn)=>handlers[n]=fn,setTimeout:()=>1,clearTimeout(){},IntersectionObserver:class{constructor(fn){io=fn}observe(){}}};c.CustomEvent=class{constructor(type,opts){this.type=type;this.detail=opts.detail}};c.document.dispatchEvent=e=>docHandlers[e.type]?.(e);c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../dist/games/gifts-embed.js',import.meta.url),'utf8'),c);
const find=n=>stage.children.find(e=>e.className===n);
assert(!find('runner-frame'),'No eager game download');find('runner-launch').events.click();let frame=find('runner-frame');assert(frame.src.includes('three-gifts/index.html'));assert(trigger.hidden);
const send=(type,extra={})=>handlers.message({source:frame.contentWindow,origin:'http://test',data:{channel:'pesni-gifts',type,...extra}});
io([{isIntersecting:true}]);send('ready');assert(messages.some(m=>m.type==='resume'&&m.start));assert(messages.some(m=>m.type==='configure'&&m.shareUrl==='http://test/#game-gifts'));
expand.events.click();assert(stage.classes.has('is-expanded'));
find('runner-toggle').events.click();assert(!find('runner-pause').hidden);find('runner-pause').events.click();assert(find('runner-pause').hidden);
find('runner-close').events.click();assert(messages.some(m=>m.type==='finish'));assert(find('runner-pause').hidden);assert(!find('runner-close').hidden);
// A late menu-closed event must not turn the second cross into another finish.
send('menu',{open:false});find('runner-close').events.click();assert.equal(stage.dataset.state,'idle');assert(!find('runner-frame'));assert(!stage.classes.has('is-expanded'));assert(find('runner-pause').hidden);assert(!find('runner-launch').hidden);
const old=frame;send('menu',{open:true});assert.equal(stage.dataset.state,'idle','Detached iframe cannot revive the menu');
find('runner-launch').events.click();frame=find('runner-frame');assert.notEqual(frame,old);send('ready');expand.events.click();send('menu',{open:false});assert.equal(stage.dataset.state,'playing');
c.document.dispatchEvent(new c.CustomEvent('pesni:game-activate',{detail:{id:'games'}}));assert.equal(stage.dataset.state,'paused');send('menu',{open:false});assert.equal(stage.dataset.state,'playing');
send('restarting');assert.equal(stage.dataset.state,'loading');assert(!find('runner-loading').hidden);send('ready');assert.equal(stage.dataset.state,'playing');
send('exit');assert(!stage.classes.has('is-expanded'));assert.equal(stage.dataset.state,'idle');assert(!find('runner-frame'));io([{isIntersecting:false}]);assert.equal(stage.dataset.state,'idle');
console.log('PASS: lazy iframe, ready/start, landing share, expand, pause/resume, repeatable finish menu, restart and return to site');
