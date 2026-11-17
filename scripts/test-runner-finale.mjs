import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const finalSource=fs.readFileSync(new URL('../dist/games/runner/final-scene.js',import.meta.url),'utf8');
const gameSource=fs.readFileSync(new URL('../dist/games/runner/game.js',import.meta.url),'utf8');
function fixture(){let now=1000,serial=0;const frames=new Map(),timers=new Map(),wins=[];
 const el=()=>({style:{},events:{},children:[],classList:{add(){},remove(){}},appendChild(e){this.children.push(e)},addEventListener(n,f){this.events[n]=f}});
 const game=el(),hero=el();game.clientWidth=1000;Object.assign(hero,{offsetLeft:100,offsetWidth:80});const world={scrollWidth:5000,style:{}};
 const c={game,hero,world,worldX:3999.9,innerWidth:1000,innerHeight:563,gameStarted:true,running:true,tutorialActive:false,tutorialShown:true,jump:null,wading:null,lastFrameAt:984,speedSlider:{value:1},document:{createElement:el},performance:{now:()=>now},heroScreenX:()=>140,updateHeroAnimation(){},updateObstacleCollisions:()=>false,showResultScreen:r=>wins.push(r),requestAnimationFrame:f=>{frames.set(++serial,f);return serial},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(f,ms)=>{timers.set(++serial,{f,due:now+ms});return serial},clearTimeout:id=>timers.delete(id)};c.window=c;vm.createContext(c);vm.runInContext(finalSource,c);vm.runInContext(gameSource.slice(gameSource.indexOf('function gameLoop(now)')),c);
 function tick(ms){now+=ms;const todo=[...frames.values()];frames.clear();todo.forEach(f=>f(now));for(const[id,t]of [...timers])if(t.due<=now){timers.delete(id);t.f()}}
 return{c,game,hero,tick,wins,overlay:game.children[0]};
}
const f=fixture();f.c.gameLoop(1000);assert.equal(f.c.worldX,4000);assert.equal(f.c.running,false);assert(f.c.finalSequenceActive,'The game loop hands off even after stopping the camera');
f.tick(5000);assert.equal(f.hero.style.left,'902px');assert.equal(f.overlay.style.visibility,'visible');assert.equal(f.overlay.style.pointerEvents,'none');
f.tick(325);assert.equal(f.overlay.style.pointerEvents,'auto');assert.equal(f.overlay.children[0].style.opacity,'1');
f.overlay.events.pointerdown({preventDefault(){},stopPropagation(){}});assert.deepEqual(f.wins,['win']);f.overlay.events.pointerdown({preventDefault(){},stopPropagation(){}});assert.equal(f.wins.length,1);
f.c.runnerResetFinalScene();assert(!f.c.finalSequenceActive);assert.equal(f.hero.style.left,'');assert.equal(f.overlay.children[0].style.opacity,'0');assert.equal(f.overlay.children[0].style.filter,'blur(9px)');
f.c.worldX=3999.9;f.c.running=true;f.c.lastFrameAt=0;f.c.gameLoop(7000);f.c.gameLoop(7016);assert(f.c.finalSequenceActive);f.c.runnerResetFinalScene();f.tick(10000);assert.equal(f.overlay.style.visibility,'hidden','No stale animation after reset');
const endless=fixture();endless.c.infiniteMode=true;endless.c.gameLoop(1000);assert(!endless.c.finalSequenceActive,'Endless mode never opens the bride finale');
console.log('PASS: actual game-loop end handoff, hero reaches right edge, eyes reveal, win once, repeat/reset, stale-frame cancellation, endless exclusion');
