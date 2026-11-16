/* Colour the existing lower ornament; share the route's actual camera progress. */
(function(root){
 function routeProgress(position,totalWidth,viewportWidth){
  const end=totalWidth-viewportWidth;
  if(!Number.isFinite(position)||!Number.isFinite(end)||end<=0)return 0;
  return Math.max(0,Math.min(1,position/end));
 }
 if(typeof module!=='undefined')module.exports={routeProgress};
 if(typeof document==='undefined')return;
 const overlay=document.createElement('div');overlay.id='route-progress';overlay.hidden=true;
 overlay.setAttribute('role','progressbar');overlay.setAttribute('aria-label','Путь к любимой');
 overlay.setAttribute('aria-valuemin','0');overlay.setAttribute('aria-valuemax','300');
 overlay.innerHTML='<svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="route-colour"><stop stop-color="var(--runner-red,#d7251f)" stop-opacity=".95"/><stop offset="1" stop-color="var(--runner-red,#d7251f)" stop-opacity=".28"/></linearGradient><clipPath id="route-wave"><path/></clipPath></defs><rect width="1000" height="80" fill="var(--runner-red,#d7251f)" opacity=".08"/><rect width="1000" height="80" fill="url(#route-colour)" clip-path="url(#route-wave)"/></svg>';
 document.body.appendChild(overlay);
 const wave=overlay.querySelector('clipPath path');let painted=-1,wasVisible=false;
 function update(){
  const visible=gameStarted&&!root.infiniteMode&&!root.finalSequenceActive&&!root.runnerResultVisible;
  if(visible!==wasVisible){overlay.hidden=!visible;wasVisible=visible;painted=-1}
  if(visible){
   const progress=routeProgress(worldX,world.scrollWidth,game.clientWidth);
   if(Math.abs(progress-painted)>=.001||progress===0||progress===1){
    if(progress!==painted){
     const x=progress*1000,edge=Math.max(0,x-6),bend=Math.max(0,x-18);
     wave.setAttribute('d',progress===1?'M0 0H1000V80H0Z':`M0 0H${edge}Q${bend} 20 ${x} 40Q${bend} 60 ${edge} 80H0Z`);
     overlay.setAttribute('aria-valuenow',String(Math.round(progress*300)));
     painted=progress;
    }
   }
  }
  requestAnimationFrame(update);
 }
 requestAnimationFrame(update);
})(globalThis);
