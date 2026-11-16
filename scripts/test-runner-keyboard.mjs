import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
const source=read('games/runner/game.js');const start=source.indexOf('window.addEventListener("keydown",');const end=source.indexOf('speedSlider.addEventListener',start);
let handler,jumps=0,forms=0;
const c={gameStarted:true,tutorialActive:false,startJump:()=>jumps++,toggleHeroForm:()=>forms++,window:{addEventListener:(_name,fn)=>handler=fn}};vm.createContext(c);vm.runInContext(source.slice(start,end),c);
for(const code of ['ArrowUp','ArrowDown','Space','KeyE']){let prevented=false;handler({code,preventDefault:()=>prevented=true});assert(prevented,code)}assert.equal(jumps,2);assert.equal(forms,2);
const embed=read('games/runner-embed.js');const fragment=embed.slice(embed.indexOf(' // Parent buttons can retain focus:'),embed.indexOf(" document.addEventListener('keydown',event=>{if(expanded"));
const posts=[];let focus=0;const parent={resultShown:false,stage:{dataset:{state:'playing'}},frame:{focus:()=>focus++},post:(...args)=>posts.push(args),document:{addEventListener:(_n,fn,capture)=>{assert(capture);handler=fn}}};vm.createContext(parent);vm.runInContext(fragment,parent);
function press(code,editable=false){let prevented=false,stopped=false;handler({code,target:{closest:()=>editable},preventDefault:()=>prevented=true,stopImmediatePropagation:()=>stopped=true});return {prevented,stopped}}
for(const code of ['ArrowUp','ArrowDown','Space','KeyE'])assert.deepEqual(press(code),{prevented:true,stopped:true});assert.equal(posts.length,4);assert.equal(focus,4);
assert.deepEqual(press('ArrowDown',true),{prevented:false,stopped:false});parent.stage.dataset.state='paused';assert.deepEqual(press('ArrowDown'),{prevented:false,stopped:false});assert.equal(posts.length,4);
console.log('PASS: child prevents default for all controls; parent captures active-game keys before page navigation, forwards controls, preserves paused and editable contexts');
