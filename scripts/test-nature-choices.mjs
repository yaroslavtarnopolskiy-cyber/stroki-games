import fs from 'node:fs';import assert from 'node:assert/strict';
import {alignNatureChoices} from '../dist/games/human-beast/nature-choices.mjs';
import {CardGame} from '../dist/games/human-beast/engine.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../dist/games/human-beast/cards.json',import.meta.url),'utf8')),before=JSON.stringify(source),cards=alignNatureChoices(source);
assert.equal(JSON.stringify(source),before,'Never mutate original supplied CardTable');
for(const c of cards.filter(c=>c.type!=='book'&&c.left.label)){assert(c.left.scale<0);assert(c.right.scale>0)}
for(const [id,human,bear] of [[3,'мудрость','сила'],[5,'лука','зубами'],[12,'Сын колдуньи','Медведь с реки']]){const c=cards.find(c=>c.choice_number===id);assert(c.left.label.includes(human));assert(c.right.label.includes(bear))}
const endings=new Set();
for(let mask=0;mask<128;mask++){const game=new CardGame(cards,()=>0);let i=0;for(let n=0;n<20&&!game.inEnding;n++){const choices=!!game.current.left.label;game.choose(choices?!!(mask&(1<<i++)):true)}assert(game.inEnding);endings.add(game.current.type)}
assert.deepEqual([...endings].sort(),['ending_final','ending_high','ending_low']);
console.log('PASS: left=human/right=bear, strength/wisdom, teeth/bow, bear/human lineage; all 128 aligned paths retain three reachable endings; source immutable');
