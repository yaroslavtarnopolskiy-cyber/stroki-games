/* Mouse/trackpad click arbitration, independent of the runner's physics. */
(function(root){
 function createRunnerMouseInput({jump,changeForm,canAct=()=>true,schedule=setTimeout,cancelTimer=clearTimeout,doubleClickMs=100}){
  let pending=null;
  const excluded=event=>event.target?.closest?.('button,a,input,#speed-control,#start-screen,#tutorial-overlay,#result-screen');
  function cancel(){if(pending!==null)cancelTimer(pending);pending=null}
  function click(event){
   if(event.button!==0||event.pointerType==='touch'||event.sourceCapabilities?.firesTouchEvents||excluded(event))return;
   if(!canAct()){cancel();return}
   event.preventDefault?.();
   if(pending!==null){cancel();changeForm();return}
   pending=schedule(()=>{pending=null;if(canAct())jump()},doubleClickMs);
  }
  function pointerDown(event){
   if(event.pointerType!=='mouse'||event.button!==2||excluded(event)||!canAct())return;
   event.preventDefault?.();cancel();changeForm();
  }
  return {click,pointerDown,cancel};
 }
 root.createRunnerMouseInput=createRunnerMouseInput;
 if(typeof module!=='undefined')module.exports={createRunnerMouseInput};
})(globalThis);
