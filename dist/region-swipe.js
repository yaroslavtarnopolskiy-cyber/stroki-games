(function(root){
 function createRegionSwipe({element,canSwipe,onSwipe,now=()=>performance.now()}){
  let drag=null;
  element.addEventListener('pointerdown',event=>{
   if(!canSwipe()||event.isPrimary===false||event.button!==0||event.target.closest?.('a,button,input,textarea,select'))return;
   drag={id:event.pointerId,x:event.clientX,y:event.clientY,time:now()};
  });
  element.addEventListener('pointermove',event=>{
   if(!drag||event.pointerId!==drag.id)return;
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx)){drag=null;return}
   if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.2){if(event.cancelable)event.preventDefault();element.setPointerCapture?.(event.pointerId)}
  });
  element.addEventListener('pointerup',event=>{
   if(!drag||event.pointerId!==drag.id)return;
   const start=drag;drag=null;
   const dx=event.clientX-start.x,dy=event.clientY-start.y;
   if(canSwipe()&&now()-start.time<900&&Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.25)onSwipe(dx<0?1:-1);
  });
  element.addEventListener('pointercancel',()=>{drag=null});
  return {cancel(){drag=null}};
 }
 root.createRegionSwipe=createRegionSwipe;
 if(typeof module!=='undefined')module.exports={createRegionSwipe};
})(typeof window==='undefined'?globalThis:window);
