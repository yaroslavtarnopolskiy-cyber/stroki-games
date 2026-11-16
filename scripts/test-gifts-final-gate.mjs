import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c={module:{exports:{}}};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../dist/games/three-gifts/js/final-actions.js',import.meta.url),'utf8'),c);
const el=()=>({events:{},dataset:{},hidden:false,addEventListener(n,f){this.events[n]=f}}),screen=el(),read=el(),repeat=el();let reads=0,restarts=0;
const gate=c.module.exports.createGiftsFinalGate({screen,readButton:read,restartButton:repeat,read:()=>reads++,restart:()=>restarts++});
const click=(button,detail=1)=>button.events.click({detail,preventDefault(){},stopPropagation(){}});
click(read);assert.equal(reads,0);read.events.pointerdown();gate.enable();click(read);assert.equal(reads,0,'Touch started before reveal cannot open book');
read.events.pointerdown();click(read);assert.equal(reads,1);click(read);assert.equal(reads,1,'Fresh press is required');
repeat.events.pointerdown();click(repeat);assert.equal(restarts,1);gate.reset();click(read,0);assert.equal(reads,1,'Keyboard cannot activate hidden action');gate.enable();click(read,0);assert.equal(reads,2,'Visible keyboard action works');screen.hidden=true;click(read,0);assert.equal(reads,2);
console.log('PASS: final loading and stale taps blocked, fresh explicit click required, repeat and keyboard work only when visible');
