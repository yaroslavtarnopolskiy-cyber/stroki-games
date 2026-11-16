// Rounded frame repels nearby words without changing their river phase.
export function frameDeflection(x,y,halfHeight,frames){
 let best={dx:0,dy:0,sx:1,sy:1,skew:0},strongest=0;
 for(const box of frames){
  const r=Math.min(18,box.width/2,box.height/2),cx=box.left+box.width/2,cy=box.top+box.height/2;
  const px=x-cx,py=y-cy,qx=Math.abs(px)-(box.width/2-r),qy=Math.abs(py)-(box.height/2-r);
  const ox=Math.max(qx,0),oy=Math.max(qy,0),length=Math.hypot(ox,oy);
  const distance=length+Math.min(Math.max(qx,qy),0)-r-halfHeight;
  let strength=Math.max(0,Math.min(1,1-distance/145));strength=strength*strength*(3-2*strength);
  if(strength<=strongest)continue;
  let nx,ny;if(length){nx=ox/length*Math.sign(px);ny=oy/length*Math.sign(py)}else if(qx>qy){nx=Math.sign(px)||1;ny=0}else{nx=0;ny=Math.sign(py)||1}
  strongest=strength;best={dx:nx*12*strength,dy:ny*18*strength,sx:1-.1*strength,sy:1-.27*strength,skew:-nx*ny*8*strength};
 }
 return best;
}

// A final geometric guard includes the whole rotated label, not just its centre.
// Keep labels intact inside the river strip and outside every game content box.
export function safeWordPlacement(word,frames){
 let {x,y,sx,sy}=word;const angle=Math.abs(word.rotation)*Math.PI/180;
 const extent=()=>{const skew=Math.abs(Math.tan(word.skew*Math.PI/180))*word.height*sy;return {w:word.width*sx*Math.cos(angle)+word.height*sy*Math.sin(angle)+skew,h:word.height*sy*Math.cos(angle)+word.width*sx*Math.sin(angle)+skew}};
 let b=extent();const available=Math.max(1,word.stageHeight-24);
 if(b.h>available){const scale=available/b.h;sx*=scale;sy*=scale;b=extent()}
 const low=b.h/2+12,high=word.stageHeight-b.h/2-12;
 y=Math.max(low,Math.min(high,y));
 for(const frame of frames){
  const left=frame.left-14-b.w/2,right=frame.left+frame.width+14+b.w/2,top=frame.top-14-b.h/2,bottom=frame.top+frame.height+14+b.h/2;
  if(x<=left||x>=right||y<=top||y>=bottom)continue;
  const choices=[];if(top>=low)choices.push({x,y:top,d:Math.abs(y-top)});if(bottom<=high)choices.push({x,y:bottom,d:Math.abs(bottom-y)});
  choices.push({x:left,y,d:Math.abs(x-left)},{x:right,y,d:Math.abs(right-x)});choices.sort((a,b)=>a.d-b.d);({x,y}=choices[0]);
 }
 return {x,y,sx,sy};
}
