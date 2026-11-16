(function(){
 const dialog=document.querySelector('#game-preview-dialog');
 let trigger=null;
 function closePreview(){dialog.close();trigger?.focus({preventScroll:true})}
 document.querySelectorAll('[data-open-preview]').forEach(button=>button.addEventListener('click',()=>{
  if(['games','game-gifts','game-human-beast'].includes(button.dataset.openPreview))return;
  const game=document.getElementById(button.dataset.openPreview);if(!game)return;
  trigger=button;
  dialog.querySelector('h2').textContent=game.querySelector('h2').textContent;
  const scene=dialog.querySelector('#game-dialog-scene'),source=game.querySelector('.game-scene');scene.src=source.getAttribute('src');scene.alt=source.alt;
  dialog.querySelector('.game-dialog-description').textContent=game.querySelector('.game-description').textContent;
  dialog.showModal();
 }));
 dialog.querySelector('.game-dialog-close').addEventListener('click',closePreview);
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closePreview()});
 dialog.addEventListener('close',()=>trigger?.focus({preventScroll:true}));

 // Use only empty section padding for closer river transitions; keep content clear.
 const gameSections=[...document.querySelectorAll('.game-section')];
 function spaceRivers(){
  document.querySelectorAll('.river-connector').forEach(river=>{
   const before=river.previousElementSibling,after=river.nextElementSibling;
   if(before?.classList.contains('game-section')){const section=before.getBoundingClientRect(),content=before.querySelector('.game-inner').getBoundingClientRect();river.style.marginTop=-Math.max(0,section.bottom-content.bottom-12)+'px'}
   if(after?.classList.contains('game-section')){const section=after.getBoundingClientRect(),content=after.querySelector('.game-inner').getBoundingClientRect();river.style.marginBottom=-Math.max(0,content.top-section.top-12)+'px'}
  });
 }
 let spacingFrame=0;
 function scheduleSpacing(){if(spacingFrame)return;spacingFrame=requestAnimationFrame(()=>{spacingFrame=0;spaceRivers()})}
 const spacingObserver=new ResizeObserver(scheduleSpacing);gameSections.forEach(section=>{spacingObserver.observe(section);spacingObserver.observe(section.querySelector('.game-inner'))});
 addEventListener('resize',spaceRivers);document.fonts.ready.then(spaceRivers);spaceRivers();
})();
