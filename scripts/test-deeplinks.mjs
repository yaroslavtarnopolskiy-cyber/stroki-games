import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {stories,collectionUrl,serviceUrl} from '../dist/story-matcher/data.mjs';
const base='https://mtsbooks.onelink.me/zdZb/',codes=['2y5x9p54','jce0jbvp','j74qgr6x','2ui31gw4','t8zxvuww','53p6oe0h','y2t4ofj7'],collection=base+'t75hb4td';assert.equal(collectionUrl,collection);assert.deepEqual(stories.map(s=>s.storyUrl),codes.map(x=>base+x));
const read=path=>fs.readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const voices=read('voices.js'),prefix=voices.slice(voices.indexOf('const storyUrls='),voices.indexOf('let worldMode=')),a=voices.indexOf('function select('),select=voices.slice(a,voices.indexOf('\nconst regionCard=',a));
const nodes=new Map(),element=()=>({hidden:false,classList:{add(){},remove(){},toggle(){}},attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(){}});
const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)},querySelectorAll:()=>[],dispatchEvent(){}};
const c={document,floodRegion(){},CustomEvent:class{constructor(type,opts){this.type=type;Object.assign(this,opts)}}};vm.createContext(c);vm.runInContext(prefix+"let worldMode='life',selected=-1;"+select,c);
for(const mode of ['life','death']){vm.runInContext(`worldMode='${mode}'`,c);for(let i=0;i<7;i++){c.select(i,true);assert.equal(nodes.get('.story-link').href,base+codes[i]);assert(nodes.get('#story').textContent.includes(stories[i].title));}}
c.select(7);assert.equal(nodes.get('.story-link').href,base+codes[0]);c.select(-1);assert.equal(nodes.get('.story-link').href,base+codes[6]);
// Execute the actual book-card update method through all stories and back.
const matcher=read('story-matcher/story-matcher.mjs'),showLine=matcher.split('\n').find(line=>line.trim().startsWith('showStory(id,'));assert(showLine);
const innerNodes=new Map(),region={setAttribute(){},querySelector:s=>{if(!innerNodes.has(s))innerNodes.set(s,{});return innerNodes.get(s)}},status={};
const mc={stories,serviceUrl};vm.createContext(mc);const obj=vm.runInContext('({'+showLine.trim()+'})',mc);obj.root={querySelector:s=>s==='.matcher-story'?region:status};obj.emit=()=>{};
for(const story of [...stories,...stories].reverse()){obj.showStory(story.id);assert.equal(innerNodes.get('a').href,story.storyUrl);assert.equal(innerNodes.get('h3').textContent,story.title);}
const html=read('index.html');assert(!html.includes('Ссылка на рассказ будет добавлена'));assert(html.includes(`class="story-link" href="${base+codes[5]}"`));assert(html.includes(`class="game-preview-link game-collection-link" href="${collection}"`));
for(const f of ['games/runner/result-screen.js','games/three-gifts/boot.js','games/three-gifts/site-bridge.js']){const text=read(f);assert(text.includes(collection),f);assert(!/https:\/\/stroki\.mts\.ru\/(book|collection)\//.test(text),f)}
console.log('PASS: seven exact supplied URLs; real land selection in both themes and wraparound; real carousel card changes; collection destination in both integrated games and third preview');
