import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {CardGame,collectionUrl,shareText} from '../dist/games/human-beast/engine.mjs';
import {endingCopy} from '../dist/games/human-beast/ending-copy.mjs';
import {formatCardText} from '../dist/games/human-beast/reading-layout.mjs';
import {alignNatureChoices} from '../dist/games/human-beast/nature-choices.mjs';
const source=fs.readFileSync(new URL('../dist/games/human-beast/game.mjs',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
const cards=JSON.parse(fs.readFileSync(new URL('../dist/games/human-beast/cards.json',import.meta.url),'utf8'));
async function boot(native=true,reduced=false,deferred=false){
 const nodes=new Map(),events={},docEvents={},messages=[],shares=[],copied=[],opened=[],audio=[],timers=[],exits=[];let now=1000;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,style:{setProperty(n,v){this[n]=v}},dataset:{},events:{},clientWidth:500,parentElement:{},addEventListener(n,f){this.events[n]=f},setAttribute(n,v){this[n]=v},animate(frames,options){this.lastAnimation={frames,options};const animation={cancel(){}};if(deferred&&options.fill==='forwards')animation.finished=new Promise(resolve=>exits.push({resolve}));return animation},setPointerCapture(){},showModal(){this.open=true},close(){this.open=false}});return nodes.get(id)};
 const parent={postMessage:m=>messages.push(m)},document={hidden:false,getElementById:node,addEventListener:(n,f)=>docEvents[n]=f};
 const c={document,parent,endingCopy,CardGame,collectionUrl,shareText,formatCardText,alignNatureChoices,matchMedia:()=>({matches:reduced}),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},performance:{now:()=>now},location:{origin:'http://test',pathname:'/games/human-beast/index.html',assign:u=>opened.push(u)},navigator:{...(native?{share:async p=>shares.push(p)}:{}),clipboard:{writeText:async t=>copied.push(t)}},fetch:async()=>({ok:true,json:async()=>structuredClone(cards)}),URL,Audio:class{constructor(){audio.push(this)}play(){this.playing=true;return Promise.resolve()}pause(){this.playing=false}},addEventListener:(n,f)=>events[n]=f,open:(...v)=>opened.push(v)};
 c.window=c;vm.createContext(c);await vm.runInContext('(async()=>{'+source+'})()',c);
 const send=(type,extra={},origin='http://test')=>events.message({source:parent,origin,data:{channel:'pesni-cards',type,...extra}});
 return {c,node,send,messages,shares,copied,opened,audio,docEvents,timers,exits,setNow:value=>{now=value}};
}
const b=await boot();assert(b.messages.some(m=>m.type==='ready'));const story=()=>b.node('story').textContent,first=story();
b.send('control',{code:'ArrowRight'});assert.equal(story(),first,'Initially paused');b.send('resume');b.send('control',{code:'ArrowRight'},'https://evil.test');assert.equal(story(),first,'Reject foreign origin');b.send('control',{code:'ArrowRight'});assert.notEqual(story(),first);
const second=story();b.send('pause');b.send('control',{code:'ArrowRight'});assert.equal(story(),second);b.send('resume');
b.node('sound').events.click();assert(!b.audio[1].playing);b.node('sound').events.click();assert(b.audio[1].playing);b.send('finish');assert(b.node('finish').open);assert(!b.audio[1].playing);b.node('continue').events.click();assert(!b.node('finish').open);assert(b.audio[1].playing);
b.send('finish');b.send('exit');assert(b.messages.some(m=>m.type==='exit'));assert(!b.node('finish').open);assert(!b.audio[1].playing);
b.send('resume');b.send('finish');b.node('repeat').events.click();assert.equal(story(),first);b.send('configure',{shareUrl:'http://test/#game-human-beast'});await b.node('share').events.click();assert.equal(b.shares[0].url,'http://test/#game-human-beast');assert.equal(b.shares[0].text,shareText);
const f=await boot(false);f.send('configure',{shareUrl:'http://test/#game-human-beast'});await f.node('share').events.click();assert(f.copied[0].includes(shareText+'\nhttp://test/#game-human-beast'));
console.log('PASS: actual card UI boots, rejects foreign messages, blocks paused input, pauses audio, opens/closes menu, repeats, returns to site and shares via native/clipboard');

const d=await boot();d.send('resume');const card=d.node('card'),target={closest:()=>null};
function pointer(type,x,y=100){card.events[type]({pointerId:1,button:0,clientX:x,clientY:y,target,preventDefault(){}})}
assert.equal(card.dataset.mode,'story');const opening=d.node('story').textContent;
pointer('pointerdown',100);pointer('pointerup',100);assert.notEqual(d.node('story').textContent,opening,'A tap advances narrative');assert.equal(card.dataset.mode,'story');
pointer('pointerdown',100);pointer('pointerup',100);assert.equal(card.dataset.mode,'choice');assert.equal(d.node('phase-title').textContent,'твой выбор');
const question=d.node('story').textContent;pointer('pointerdown',100);pointer('pointermove',140);assert.equal(card.dataset.direction,'right');assert(card.style.transform.includes('translateX'));pointer('pointerup',140);assert.equal(d.node('story').textContent,question,'Short drag does not choose');
pointer('pointerdown',100);pointer('pointermove',210);pointer('pointerup',210);assert.notEqual(d.node('story').textContent,question);assert.equal(card.dataset.mode,'story');assert.equal(card.dataset.direction,'');assert.equal(card.style.transform,'');
assert.equal(d.node('balance-ribbon').style['--balance'],'60%');
console.log('PASS: narrative tap, separate choice card, drag preview, short-drag cancellation, committed swipe and ribbon value');

const swipe=await boot();swipe.send('resume');swipe.send('control',{code:'ArrowRight'});swipe.send('control',{code:'ArrowRight'});const before=swipe.node('story').textContent;
swipe.send('control',{code:'ArrowLeft'});assert.equal(swipe.node('story').textContent,before);assert.equal(swipe.node('nature-balance').dataset.preview,'human');assert.equal(swipe.node('balance-ribbon').style['--preview'],'40%');
swipe.send('control',{code:'Space'});assert.notEqual(swipe.node('story').textContent,before);assert.equal(swipe.node('balance').value,40);assert.equal(swipe.node('nature-balance').dataset.preview,'');assert(swipe.audio[0].playing,'Original page-turn sound plays');swipe.send('pause');assert(!swipe.audio[0].playing,'Page sound stops on pause');
console.log('PASS: keyboard previews an answer and its nature before commitment, page-turn audio plays and pauses');

const polished=await boot();assert.equal(polished.node('card').dataset.opening,'true');assert(polished.node('card').lastAnimation);assert.equal(polished.node('card').lastAnimation.options.duration,340);
polished.send('resume');polished.send('control',{code:'ArrowRight'});assert.equal(polished.node('card').dataset.opening,'false');polished.send('control',{code:'ArrowRight'});polished.send('control',{code:'ArrowRight'});assert.equal(polished.node('game').dataset.direction,'right');polished.send('control',{code:'Space'});assert.equal(polished.node('nature-balance').dataset.flash,'bear');assert.equal(polished.timers.at(-1).ms,360);polished.timers.at(-1).fn();assert.equal(polished.node('nature-balance').dataset.flash,'');
polished.node('sound').events.click();assert.equal(polished.node('sound')['aria-label'],'Включить звук');assert.equal(polished.node('sound').dataset.muted,'true');
const quiet=await boot(true,true);assert.equal(quiet.node('card').lastAnimation,undefined,'Reduced-motion preference skips transition');
console.log('PASS: opening girl state, short transitions, full-ring hold and release, sound icon label and reduced-motion fallback');

const free=await boot();free.send('resume');free.send('control',{code:'ArrowRight'});free.send('control',{code:'ArrowRight'});const moving=free.node('card'),t={closest:()=>null};
const ev=x=>({pointerId:7,button:0,clientX:x,clientY:100,target:t,preventDefault(){}});
moving.events.pointerdown(ev(100));moving.events.pointermove(ev(320));assert(moving.style.transform.includes('211.2px'),'Card must travel past old 85 px limit');assert(Number(moving.style.opacity)<.5,'Card fades with displacement');moving.events.pointercancel();assert.equal(moving.style.opacity,'1');assert.equal(free.node('nature-balance').dataset.preview,'');
assert.equal(free.node('portrait').src, cards[2].portraitUrl);const start=await boot();assert.equal(start.node('portrait').src,'assets/girl-figure-only-v1.png');
console.log('PASS: uncapped swipe travel and progressive fade, cancel recovery, generated inverse opening artwork');

const glow=await boot();glow.send('resume');glow.send('control',{code:'ArrowRight'});glow.send('control',{code:'ArrowRight'});assert(glow.node('story').textContent.includes('\n\n'));glow.send('control',{code:'ArrowLeft'});assert.equal(glow.node('nature-glow').dataset.nature,'human');assert.equal(glow.node('nature-glow').style.opacity,'1');glow.send('control',{code:'Space'});assert.equal(glow.node('nature-glow').style.opacity,'0');
for(let i=0;i<25&&glow.node('card').dataset.mode!=='ending';i++){glow.send('control',{code:'ArrowRight'});if(glow.node('card').dataset.mode==='choice')glow.send('control',{code:'Space'})}
assert.equal(glow.node('card').dataset.mode,'ending');assert.equal(glow.node('phase-title').textContent,'твой выбор привёл тебя сюда');assert.equal(glow.node('ending-title').hidden,false);assert(glow.node('ending-title').textContent);assert(glow.node('next').hidden);assert(!glow.node('ending-actions').hidden);assert.equal(glow.node('ending-read').href,collectionUrl);
for(const card of cards){assert.equal(formatCardText(card).replace(/\s+/g,' ').trim(),card.text.replace(/\s+/g,' ').trim(),'Layout must preserve every original word')}
console.log('PASS: human-side edge light, preview reset, explicit ending title and action, paragraph layout without changing original words');

const fling=await boot(true,false,true);fling.send('resume');fling.send('control',{code:'ArrowRight'});fling.send('control',{code:'ArrowRight'});
assert.match(fling.node('left').textContent,/мудрость/);assert.match(fling.node('right').textContent,/сила/);
const live=fling.node('card'),q=fling.node('story').textContent,hit={closest:()=>null};
const point=x=>({pointerId:9,button:0,clientX:x,clientY:100,target:hit,preventDefault(){}});
live.events.pointerdown(point(100));fling.setNow(1030);live.events.pointermove(point(132));live.events.pointerup(point(132));assert.equal(fling.exits.length,1,'Short fast flick is accepted');assert.equal(live.lastAnimation.options.fill,'forwards');assert(live.lastAnimation.frames[1].transform.includes('650px'),'Outgoing card travels beyond the viewport');assert.equal(fling.node('story').textContent,q,'Outgoing contents remain during exit');fling.send('control',{code:'ArrowRight'});assert.equal(fling.exits.length,1,'Duplicate input is ignored during exit');
fling.exits[0].resolve();await Promise.resolve();assert.notEqual(fling.node('story').textContent,q);assert(!live.lastAnimation.frames[0].transform.includes('translateX'),'Next card does not bounce back from the outgoing edge');
console.log('PASS: semantic human/bear labels, fast flick exit without recentering, atomic handoff and neutral next-card entrance');

const far=await boot(true,false,true);far.send('resume');far.send('control',{code:'ArrowRight'});far.send('control',{code:'ArrowRight'});const fc=far.node('card');fc.events.pointerdown(point(100));fc.events.pointermove(point(1000));fc.events.pointerup(point(1000));assert(Number(fc.lastAnimation.frames[1].transform.match(/translateX\(([-\d.]+)px/)[1])>864,'Exit keeps moving outward even after a very long drag');far.send('pause');assert.equal(far.node('card').dataset.mode,'story','Pausing flushes the accepted choice');assert.equal(far.node('card').style.opacity,'1');assert(!far.audio[1].playing);
console.log('PASS: long fling remains monotonic; pause preserves an accepted choice during outgoing animation');

const guided=await boot();guided.send('resume');guided.send('control',{code:'ArrowRight'});guided.send('control',{code:'ArrowRight'});assert.equal(guided.node('swipe-caption').dataset.guide,'true');assert.equal(guided.node('card').lastAnimation.options.duration,1600);const guideQuestion=guided.node('story').textContent;assert.equal(guided.node('balance').value,50,'Demonstration never makes a choice');guided.node('card').events.pointerdown({pointerId:1,button:0,clientX:100,clientY:100,target:{closest:()=>null}});assert.equal(guided.node('swipe-caption').dataset.guide,'false');assert.equal(guided.node('story').textContent,guideQuestion);
console.log('PASS: first choice shows a gesture demonstration without committing; first user press immediately dismisses it');

// All three approved endings must offer the book directly without advancing to a book/menu card.
for(const [sequence,type] of [[[false,false,false,false,false,false,false],'ending_low'],[[true,true,true,true,true,true,true],'ending_high'],[[true,false,true,false,true,false,true],'ending_final']]){
 const ui=await boot();ui.send('resume');let index=0;
 for(let i=0;i<30&&ui.node('card').dataset.mode!=='ending';i++){
  if(ui.node('card').dataset.mode==='choice'){ui.send('control',{code:sequence[index++]?'ArrowRight':'ArrowLeft'});ui.send('control',{code:'Space'})}else ui.send('control',{code:'ArrowRight'});
 }
 assert.equal(ui.node('card').dataset.mode,'ending');assert.equal(ui.node('ending-lead').textContent,endingCopy(type).lead);assert.equal(ui.node('story').textContent,endingCopy(type).text);assert.equal(ui.node('ending-read').href,collectionUrl);assert(!ui.node('ending-actions').hidden);assert(!ui.node('finish').open);
 const before=ui.node('story').textContent;ui.send('control',{code:'ArrowRight'});assert.equal(ui.node('story').textContent,before);assert(!ui.node('finish').open,'No intermediary end menu');
 ui.send('finish');assert.equal(ui.node('finish-title').textContent,'Узнай, что скрывает Костэ');ui.node('continue').events.click();ui.node('ending-repeat').events.click();assert.equal(ui.node('card').dataset.opening,'true');assert(ui.node('ending-actions').hidden);assert.equal(ui.node('balance').value,50);
}
console.log('PASS: three approved reading hooks, direct collection anchor, no tap/keyboard advance from ending, optional exit menu and new path restart');
