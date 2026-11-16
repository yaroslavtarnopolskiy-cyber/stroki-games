import {weights,stories} from './data.mjs';
export function calculateStoryMatch(answers){
 if(answers.length!==3||answers.some(a=>!Number.isInteger(a)||a<0||a>3))return null;
 const ranks=stories.map((story,index)=>({story,score:answers.reduce((sum,answer,q)=>sum+weights[q][answer][index],0),tie:[2,1,0].map(q=>weights[q][answers[q]][index])}));
 ranks.sort((a,b)=>b.score-a.score||b.tie[0]-a.tie[0]||b.tie[1]-a.tie[1]||b.tie[2]-a.tie[2]||a.story.order-b.story.order);
 return ranks[0].story;
}
export const angleStep=360/7;
export function targetRotation(current,index,fullTurn=false){const target=-index*angleStep;if(fullTurn)return target+360*Math.floor((current-target)/360)-360;return current+((target-current+180)%360+360)%360-180}
export function frontIndex(rotation){return ((Math.round(-rotation/angleStep)%7)+7)%7}
// A circular orbit with a gentle outward spread keeps five engraved covers legible.
export function carouselPose(rotation,index,bookWidth){
 const angle=((index*angleStep+rotation+180)%360+360)%360-180,absolute=Math.abs(angle);
 return {angle,yaw:-angle*.64,spread:Math.sign(angle)*Math.pow(Math.min(absolute,110)/103,1.45)*bookWidth*.44,opacity:absolute<=75?1-absolute/75*.18:Math.max(0,.82*(1-(absolute-75)/55)),blur:Math.max(0,(absolute-65)/65)*.65};
}
