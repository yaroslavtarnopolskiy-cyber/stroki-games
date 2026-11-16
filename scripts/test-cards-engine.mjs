import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {CardGame,collectionUrl} from '../dist/games/human-beast/engine.mjs';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const cards=read('dist/games/human-beast/cards.json'),original=read('reviews/cards-source/cards-original.json');
assert.equal(cards.length,18);
for(let i=0;i<cards.length;i++){for(const key of ['choice_number','text','portraitName','left','right','type','cardName','musicName'])assert.deepEqual(cards[i][key],original[i][key],key);assert.equal(cards[i].url,cards[i].type==='book'?collectionUrl:original[i].url)}
for(const f of read('reviews/cards-source/assets.json')){const bytes=fs.readFileSync(new URL('dist/games/human-beast/'+f.file,root));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256,f.file)}
const reached=new Set();
for(let mask=0;mask<128;mask++){
 const game=new CardGame(cards,()=>0);let expected=50,decision=0;
 for(const c of game.story){assert.equal(game.current.choice_number,c.choice_number);const hasChoice=!!(c.left?.label||c.right?.label);const right=hasChoice?!!(mask&(1<<decision++)):true;expected=Math.max(0,Math.min(100,expected+c[right?'right':'left'].scale));game.choose(right);assert.equal(game.stats,expected);if(expected===0||expected===100)break}
 const ending=expected===0?'ending_low':expected===100?'ending_high':'ending_final';assert.equal(game.current.type,ending);reached.add(ending);game.choose(true);assert.equal(game.current.type,'book');assert.equal(game.choose(true).action,'read');assert.equal(game.current.type,'book');game.choose(false);assert.equal(game.stats,50);assert.equal(game.current.choice_number,1);
}
assert.deepEqual([...reached].sort(),['ending_final','ending_high','ending_low']);
console.log('PASS: source parity for all 18 cards; unchanged artwork/audio hashes; all 128 choice paths, all three endings, score boundaries, restart and corrected collection action');
