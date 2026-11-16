import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/games/runner/game.js',import.meta.url),'utf8');
const core=source.slice(source.indexOf('function obstacleCollisionHalfWidth('),source.indexOf('function gameLoop('));
const extension=fs.readFileSync(new URL('../dist/games/runner/form-bush-obstacles.js',import.meta.url),'utf8');
const wrapper=extension.slice(extension.indexOf('  const originalUpdateObstacleCollisions'),extension.lastIndexOf('})();'));
for(const [id,factor] of [['stump',.44],['blue-bush',.24],['red-bush',.24],['cave-blue-bush',.24],['cave-red-bush',.24]]){
 const form=id.includes('red')?'bear':'human',oldHalf=100*factor,newHalf=oldHalf*.91;
 function fixture(){let fails=0;const obstacle={id,x:100,mode:'any-jump',form,gapFactor:factor,element:{offsetWidth:100},crossed:false,inside:false};
 const jump={form,takeoffAt:0,duration:1};const c={hero:{dataset:{form}},obstacles:[obstacle],jump,wading:null,failRun:()=>fails++,jumpDistanceAtBoundary:()=>1};vm.createContext(c);vm.runInContext(core+wrapper,c);return {c,obstacle,jump,fails:()=>fails}}
 const f=fixture();assert.equal(f.c.obstacleCollisionHalfWidth(f.obstacle),newHalf);
 f.c.updateObstacleCollisions(100-oldHalf-1,100-oldHalf+.1,10,100);assert.equal(f.obstacle.inside,false);
 f.c.updateObstacleCollisions(100-newHalf-1,100-newHalf+.1,10,100);assert.equal(f.obstacle.inside,true);
 f.c.jump=null;f.c.updateObstacleCollisions(100+newHalf-1,100+newHalf+.1,1000,100,f.jump);assert.equal(f.fails(),0);assert.equal(f.obstacle.crossed,true);
 const short=fixture();short.c.updateObstacleCollisions(100-newHalf-1,100-newHalf+.1,10,100);short.c.jump=null;short.c.updateObstacleCollisions(100,100+newHalf-.1,1000,100,short.jump);assert.equal(short.fails(),1,'Interior contact still loses');
 const wrong=fixture();wrong.c.hero.dataset.form=form==='human'?'bear':'human';wrong.c.updateObstacleCollisions(100-newHalf-1,100-newHalf+.1,10,100);assert.equal(wrong.fails(),1,'Form rule retained');
}
const c={};vm.createContext(c);vm.runInContext(core,c);assert.equal(c.obstacleCollisionHalfWidth({id:'ravine',gapFactor:.4,element:{offsetWidth:100}}),40);
console.log('PASS: actual collision handlers forgive the outer 9% of stump/bush spans, reject interior contact and wrong form, preserve ravines');
