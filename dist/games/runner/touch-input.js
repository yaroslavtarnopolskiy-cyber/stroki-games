(function(root){
 function createRunnerTouchInput({jump,changeForm,canAct=()=>true,schedule=setTimeout,cancelTimer=clearTimeout,now=()=>performance.now(),doubleTapMs=200}){
  let pending=null,last=null;
  function cancel(){if(pending!==null)cancelTimer(pending);pending=null;last=null}
  function tap(x,y){
   if(!canAct()){cancel();return}
   const time=now();
   if(last&&time-last.time<=doubleTapMs&&Math.hypot(x-last.x,y-last.y)<48){cancel();if(canAct())jump();return}
   cancel();last={x,y,time};pending=schedule(()=>{pending=null;last=null;if(canAct())changeForm()},doubleTapMs);
  }
  function swipeUp(){cancel();if(canAct())jump()}
  return {tap,swipeUp,cancel};
 }
 root.createRunnerTouchInput=createRunnerTouchInput;
 if(typeof module!=='undefined')module.exports={createRunnerTouchInput};
})(typeof window==='undefined'?globalThis:window);
