import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {fitResultLayout}=createRequire(import.meta.url)('../dist/games/runner/result-layout.js');
class Element{
 constructor(tag){this.tagName=tag;this.textContent='';this.style={};this.dataset={};this.children=[];this.attributes={};this.events={};this.classList={add(){},remove(){}}}
 appendChild(e){this.children.push(e);return e}append(...e){this.children.push(...e)}
 setAttribute(k,v){this.attributes[k]=v}addEventListener(name,fn){this.events[name]=fn}
}
const source=fs.readFileSync(new URL('../dist/games/runner/result-screen.js',import.meta.url),'utf8');
for(const [width,height] of [[320,180],[520,293],[844,390],[1280,800]]){
 const game=new Element('div');game.clientWidth=width;let restarts=0,clears=0,exits=0;
 const c={document:{createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag)},game,world:{scrollWidth:5000},hero:new Element('div'),innerWidth:width,innerHeight:height,worldX:700,fitRunnerResultLayout:fitResultLayout,requestAnimationFrame:fn=>fn(),performance:{now:()=>100},resetRun:()=>restarts++,clearWitchCheckpoint:()=>clears++,runnerExit:()=>exits++,addEventListener(){},location:{href:'http://localhost/games/runner/index.html'},navigator:{},running:true};
 c.parent={postMessage(){}};c.window=c;vm.createContext(c);vm.runInContext(source,c);
 const walk=e=>[e,...e.children.flatMap(walk)];const nodes=walk(game),buttons=nodes.filter(e=>e.tagName==='button'),distance=nodes.find(e=>e.id==='result-distance');
 const brands=nodes.find(e=>e.className==='runner-result-brands');assert(brands);assert.equal(walk(brands).filter(e=>e.tagName==='img').length,3);const partners=brands.children.find(e=>e.className==='runner-result-partners');assert(partners);assert.equal(partners.children.length,2);assert(partners.children.some(e=>e.src==='../../partners/hse-light.svg'));assert.equal(buttons.length,6);assert(buttons.every(b=>b.children.some(e=>e.tagName==='span'&&e.textContent)));assert(buttons.slice(0,3).every(b=>b.children[0].innerHTML.includes('scale(.1875)')));assert(buttons.every(b=>b.className.includes('runner-result-button')));assert(buttons.every(b=>b.children.every(e=>e.tagName!=='img')));
 const box=b=>({x:parseFloat(b.style.left),y:parseFloat(b.style.top),w:parseFloat(b.style.width),h:parseFloat(b.style.height)});
 const record=buttons.find(b=>b.attributes['aria-label']==='Поделиться рекордом');assert(record.className.includes('is-record'));assert(box(record).x<40&&box(record).y>89);
 const repeat=buttons.find(b=>b.attributes['aria-label']==='Повторить'),endless=buttons.find(b=>b.attributes['aria-label']==='Бесконечный режим');assert.equal(box(repeat).y,box(endless).y);assert(box(repeat).y<box(buttons[1]).y&&box(buttons[1]).y<box(buttons[2]).y);
 for(let i=0;i<buttons.length;i++){const a=box(buttons[i]);assert(a.x>=0&&a.y>=0&&a.x+a.w<=100&&a.y+a.h<=100);for(let j=i+1;j<buttons.length;j++){const b=box(buttons[j]);assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Result actions must not overlap')}}
 c.showResultScreen('win');assert.equal(distance.textContent,'300 М');
 const shared=[],copied=[];c.runnerLandingUrl='https://landing.test/#games';c.navigator.share=async payload=>shared.push(payload);
 buttons[0].events.click();buttons[1].events.click();assert.equal(shared[0].url,c.runnerLandingUrl);assert(shared[0].text.includes('300 м')&&shared[0].text.includes('побить мой результат'));assert(shared[1].text.includes('Сможешь добежать до любимой?'));
 delete c.navigator.share;c.navigator.clipboard={writeText:async text=>copied.push(text)};buttons[1].events.click();assert(copied[0].includes(shared[1].text)&&copied[0].endsWith(c.runnerLandingUrl));
 const kion=partners.children.find(e=>e.className==='result-kion-link');assert(kion&&kion.href==='https://mtsbooks.onelink.me/zdZb/t75hb4td');
assert(distance.style.fontSize.endsWith('px'));
 const stage=game.children[0].children[0],stageHeight=parseFloat(stage.style.height);assert(stageHeight<=height+.01);
 assert(stageHeight*.725+parseFloat(distance.style.fontSize)*1.15<stageHeight);
 buttons.find(b=>b.attributes['aria-label']==='Повторить').events.click();assert.equal(restarts,1);assert.equal(clears,1);
 c.infiniteMode=true;c.getEndlessDistanceMeters=()=>87;c.runnerFinishRun();assert.equal(distance.textContent,'87 М');assert.equal(c.running,false);assert.equal(c.runnerResultVisible,true);
 buttons.find(b=>b.attributes['aria-label']==='Повторить').events.click();assert.equal(c.runnerResultVisible,false);
 buttons.find(b=>b.attributes['aria-label']==='Выход').events.click();assert.equal(exits,1);
}
console.log('PASS: real result-screen script builds six text/SVG buttons, fits counter, resets checkpoint and exits through adapter');
