import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {calculateStoryMatch,targetRotation,frontIndex,carouselPose} from '../dist/story-matcher/match.mjs';
import {stories} from '../dist/story-matcher/data.mjs';
const totals={};for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++){const result=calculateStoryMatch([a,b,c]);totals[result.id]=(totals[result.id]||0)+1;assert.equal(calculateStoryMatch([a,b,c]).id,result.id)}
assert.deepEqual(Object.fromEntries(Object.entries(totals).sort()),{S01:8,S02:9,S03:12,S04:7,S05:6,S06:12,S07:10});
for(const [answers,id] of [[[0,1,3],'S01'],[[2,3,1],'S02'],[[1,3,2],'S03'],[[3,0,0],'S04'],[[3,2,2],'S05'],[[1,1,1],'S06'],[[3,2,3],'S07']])assert.equal(calculateStoryMatch(answers).id,id);
assert.equal(calculateStoryMatch([0,null,3]),null);assert.equal(calculateStoryMatch([4,0,0]),null);
for(let i=0;i<7;i++)for(const rotation of [-800,-20,0,184,720]){assert.equal(frontIndex(targetRotation(rotation,i)),i);assert.equal(frontIndex(targetRotation(rotation,i,true)),i);assert(targetRotation(rotation,i,true)<=rotation-359.99)}
for(let front=0;front<7;front++){const poses=stories.map((_,i)=>carouselPose(-front*360/7,i,140));assert.equal(poses.filter(p=>p.opacity>.1).length,5);assert(poses.every(p=>Object.values(p).every(Number.isFinite)));assert(Math.abs(poses[front].angle)<1e-8)}
for(const story of stories)assert(existsSync(new URL('../dist/'+story.coverUrl,import.meta.url)));
const media={matches:false};globalThis.matchMedia=()=>media;globalThis.document={querySelector:()=>null};
const {StoryMatcher}=await import('../dist/story-matcher/story-matcher.mjs');
const m=Object.assign(Object.create(StoryMatcher.prototype),{root:{dataset:{}},answers:[null,null,null],phase:'idle',recommendedStoryId:null,focusedStoryId:null,rotation:0,completed:false,displayVisible:true,events:[],sync(){},showStory(){},paint(){},wake(){},assemble(){},hideSymbols(){},showDisplay(){},emit(name){this.events.push(name)},finishResult(id){this.phase='settled';this.focusedStoryId=id}});
m.choose(0,3);assert.equal(m.phase,'spinning_slow');m.choose(1,0);assert.equal(m.phase,'spinning_fast');m.choose(2,0);assert.equal(m.phase,'resolving');assert.equal(m.recommendedStoryId,'S04');const first=m.motion;m.choose(2,0);assert.equal(m.motion,first);
m.choose(1,2);m.choose(2,3);assert.equal(m.recommendedStoryId,'S07');assert.equal(m.phase,'retargeting');assert.equal(m.motion.duration,750);m.motion.onEnd();m.motion=null;assert.equal(m.focusedStoryId,'S07');m.browse(0);m.motion.onEnd();m.motion=null;assert.equal(m.focusedStoryId,'S01');assert.equal(m.recommendedStoryId,'S07');assert.equal(m.events.filter(e=>e==='story_quiz_complete').length,1);
media.matches=true;const quiet=Object.assign(Object.create(StoryMatcher.prototype),{...m,root:{dataset:{}},answers:[null,null,null],completed:false,phase:'idle',recommendedStoryId:null,focusedStoryId:null,events:[],motion:null});quiet.choose(0,0);quiet.choose(1,1);quiet.choose(2,3);assert.equal(quiet.phase,'settled');assert.equal(quiet.focusedStoryId,'S01');assert.equal(quiet.motion,null);
console.log('PASS: 64 combinations, seven golden cases, ties, incomplete answers, ring geometry, original covers, gradual phases, repeated selection, rapid retarget, manual browse and one completion event');
// Exercise the actual animation loop with controlled frame time, including interruptions.
media.matches=false;globalThis.innerHeight=900;let rafId=0,now=0;const frames=new Map();
globalThis.requestAnimationFrame=cb=>{frames.set(++rafId,cb);return rafId};globalThis.cancelAnimationFrame=id=>frames.delete(id);
function advance(ms){for(let elapsed=0;elapsed<ms;elapsed+=16){now+=16;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(now))}}
function matcher(){frames.clear();return Object.assign(Object.create(StoryMatcher.prototype),{root:{dataset:{},getBoundingClientRect:()=>({top:0,bottom:700})},answers:[null,null,null],phase:'idle',recommendedStoryId:null,focusedStoryId:'S01',rotation:0,speed:0,frame:0,last:0,motion:null,completed:false,displayVisible:true,visible:true,emit(){},sync(){},paint(){},showStory(){},assemble(){},hideSymbols(){},showDisplay(){},finishResult(id){this.focusedStoryId=id;this.phase='settled'}})}
let checked=0;for(let varied=0;varied<3;varied++)for(let a=0;a<4;a++)for(let b=0;b<4;b++){
 const q=[0,1,2].filter(q=>q!==varied),test=matcher();test.choose(q[0],a);test.choose(q[1],b);test.choose(varied,0);advance(2300);
 for(let answer=0;answer<4;answer++){test.choose(varied,answer);advance(830);const expected=calculateStoryMatch(test.answers).id;assert.equal(test.recommendedStoryId,expected);assert.equal(test.focusedStoryId,expected);assert.equal(frontIndex(test.rotation),Number(expected.slice(1))-1);checked++}
 for(const answer of [3,0,2,1]){test.choose(varied,answer);advance(80)}advance(830);assert.equal(test.focusedStoryId,calculateStoryMatch(test.answers).id);assert.equal(test.phase,'settled');
}
const free=matcher();free.browse(4);advance(620);assert.equal(free.focusedStoryId,'S05');assert.equal(free.recommendedStoryId,null);assert.deepEqual(free.answers,[null,null,null]);free.browse(2);advance(90);free.browse(6);advance(620);assert.equal(free.focusedStoryId,'S07');
console.log(`PASS: ${checked} two-fixed-row selections, 48 rapid interrupted sequences, final centre matches every result, free pre-answer browse and rapid manual retarget`);
