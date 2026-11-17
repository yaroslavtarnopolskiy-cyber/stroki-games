/* Decorative motion starts when DOM is ready; games remain explicitly click-to-load. */
(() => {
 const root=document.documentElement,connection=navigator.connection;
 let loaded=['interactive','complete'].includes(document.readyState);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const localPreview=['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname);
 const constrained=()=>!!connection?.saveData||(!localPreview&&(navigator.onLine===false||/^(slow-2g|2g)$/.test(connection?.effectiveType||'')));
 const policy=window.pesniConnection={canAnimate:()=>!constrained()&&!reduced.matches};
 function sync(){root.dataset.motion=policy.canAnimate()?'full':'static';window.dispatchEvent(new Event('pesni:connection-change'))}
 window.addEventListener('DOMContentLoaded',()=>{loaded=true;sync()},{once:true});
 window.addEventListener('load',()=>{loaded=true;sync()},{once:true});
 window.addEventListener('online',sync);window.addEventListener('offline',sync);
 connection?.addEventListener('change',sync);reduced.addEventListener('change',sync);
 sync();
 // One discreet notice on the first visit, without blocking navigation.
 let show=true;try{show=!localStorage.getItem('pesni-vpn-notice-seen')}catch{}
 if(show){const host=document.querySelector('.hero-bottom');if(host){
  const note=document.createElement('p');note.className='vpn-notice';note.textContent='отключи VPN для корректной работы';note.hidden=true;host.append(note);
  function reveal(){
   note.hidden=false;
   try{localStorage.setItem('pesni-vpn-notice-seen','1')}catch{}
   if(policy.canAnimate()&&note.animate)note.animate([{opacity:0,transform:'translate(-50%,18px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:550,easing:'cubic-bezier(.22,.61,.36,1)'});
   setTimeout(()=>{
    if(policy.canAnimate()&&note.animate){note.animate([{opacity:1,transform:'translate(-50%,0)'},{opacity:0,transform:'translate(-50%,-6px)'}],{duration:450,easing:'ease-out',fill:'forwards'});setTimeout(()=>note.remove(),450)}
    else note.remove();
   },6000);
  }
  if(loaded||constrained()||reduced.matches)reveal();else window.addEventListener('DOMContentLoaded',reveal,{once:true});
 }}
})();
