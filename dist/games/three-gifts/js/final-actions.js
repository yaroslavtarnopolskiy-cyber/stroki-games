(function(root){
 function createGiftsFinalGate({screen,readButton,restartButton,read,restart}){
  const buttons=[readButton,restartButton].filter(Boolean);let ready=false,armed=null;
  function reset(){ready=false;armed=null;screen.dataset.actionsReady='false';buttons.forEach(b=>b.disabled=true)}
  function enable(){ready=true;armed=null;screen.dataset.actionsReady='true';buttons.forEach(b=>b.disabled=false)}
  buttons.forEach(button=>{
   const arm=()=>{armed=ready&&!screen.hidden&&!button.disabled?button:null};
   button.addEventListener('pointerdown',arm);button.addEventListener('touchstart',arm,{passive:true});button.addEventListener('pointercancel',()=>{armed=null});
   button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    if(!ready||screen.hidden||button.disabled||(event.detail>0&&armed!==button)){armed=null;return}
    armed=null;if(button===readButton)read();else restart();
   });
  });
  ['pointerdown','pointerup','touchstart','touchend','click'].forEach(type=>screen.addEventListener(type,event=>event.stopPropagation()));
  reset();return {reset,enable,isReady:()=>ready};
 }
 root.createGiftsFinalGate=createGiftsFinalGate;
 if(typeof module!=='undefined')module.exports={createGiftsFinalGate};
})(typeof window==='undefined'?globalThis:window);
