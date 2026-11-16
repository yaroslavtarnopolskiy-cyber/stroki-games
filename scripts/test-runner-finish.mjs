import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/games/runner-embed.js',import.meta.url),'utf8');
class Element{
 constructor(tag='div'){this.tag=tag;this.dataset={};this.events={};this.children=[];this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};this.contentWindow={postMessage:m=>messages.push(m)};this.hidden=false}
 append(e){e.parent=this;this.children.push(e)}remove(){this.parent.children=this.parent.children.filter(e=>e!==this)}setAttribute(){}removeAttribute(){}addEventListener(name,fn){this.events[name]=fn}focus(){}querySelector(sel){return this.lookup?.[sel]??null}
}
const messages=[],handlers={},stage=new Element(),expand=new Element(),note=new Element(),poster=new Element();stage.lookup={'.game-expand':expand,'.game-scene':poster};const section={querySelector:sel=>sel==='.game-embed-slot'?stage:sel==='.game-window-note'?note:null};let io;
const c={document:{querySelector:()=>section,createElement:tag=>new Element(tag),documentElement:new Element(),hidden:false,activeElement:new Element(),addEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){}}),location:{origin:'http://test',pathname:'/'},addEventListener:(name,fn)=>handlers[name]=fn,setTimeout:()=>1,clearTimeout(){},IntersectionObserver:class{constructor(fn){io=fn}observe(){}}};c.window=c;vm.createContext(c);vm.runInContext(source,c);
const find=name=>stage.children.find(e=>e.className===name);find('runner-launch').events.click();let frame=find('runner-frame');
function send(type,extra={}){handlers.message({source:frame.contentWindow,origin:c.location.origin,data:{channel:'pesni-runner',type,...extra}})}
io([{isIntersecting:true}]);send('ready');assert.equal(find('runner-close').hidden,false);
expand.events.click();assert(stage.classes.has('is-expanded'));
find('runner-close').events.click();assert(messages.some(m=>m.type==='finish'));assert(stage.classes.has('is-expanded'),'Finish does not collapse into Continue');assert.equal(find('runner-close').hidden,false);assert.equal(find('runner-pause').hidden,true);
send('screen',{screen:'play'});assert(find('runner-pause').hidden,'Late play message cannot revive Continue during finish');
send('screen',{screen:'result'});assert.equal(find('runner-close').hidden,false);
const finishCount=messages.filter(m=>m.type==='finish').length;
find('runner-close').events.click();assert(!stage.classes.has('is-expanded'),'Second cross returns to site');assert.equal(stage.dataset.state,'idle');assert(!find('runner-frame'));assert.equal(messages.filter(m=>m.type==='finish').length,finishCount,'Result cross must not finish again');assert.equal(find('runner-pause').hidden,true);
find('runner-launch').events.click();frame=find('runner-frame');send('ready');send('screen',{screen:'play'});assert.equal(find('runner-toggle').hidden,false);
find('runner-close').events.click();assert.equal(messages.filter(m=>m.type==='finish').length,2);assert.equal(find('runner-close').hidden,false);
console.log('PASS: actual host close opens finish, keeps frame expanded and cross visible through result and replay, avoids Continue overlay');
