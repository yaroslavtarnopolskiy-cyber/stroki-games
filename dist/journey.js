(function(){
 const sections=[...document.querySelectorAll('.page-section,.word-river')];
 const up=document.querySelector('#section-up'),down=document.querySelector('#section-down');
 const backgroundAudio=document.querySelector('#background-music');
 const floatingSound=document.querySelector('#journey-sound');
 const jump=document.querySelector('#journey-jump');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let current=0,pendingIndex=null,settleTimer=0,storyRequest=0,heldArrow=null;
 function updateNavigation(){
  const tools=document.querySelector(".journey-tools"),opening=document.querySelector("#opening");
  if(tools&&opening)tools.hidden=opening.getBoundingClientRect().bottom>1;
  const middle=innerHeight/2;
  const river=sections.findIndex(section=>{const r=section.getBoundingClientRect();return section.classList.contains('word-river')&&r.top<=middle&&r.bottom>middle});
  const inside=river>=0?river:sections.findIndex(section=>{const r=section.getBoundingClientRect();return r.top<=middle&&r.bottom>middle});
  if(inside>=0)current=inside;
  else{let nearest=Infinity;sections.forEach((section,index)=>{const r=section.getBoundingClientRect(),distance=Math.abs(r.top+r.height/2-middle);if(distance<nearest){nearest=distance;current=index}})}
  if(document.documentElement&&window.scrollY+innerHeight>=document.documentElement.scrollHeight-2)current=sections.length-1;
  const active=pendingIndex??current;up.disabled=active===0;down.disabled=active===sections.length-1;
  if(jump?.setAttribute){const toTop=active===sections.length-1;jump.dataset.destination=toTop?'opening':'site-footer';jump.classList.toggle('jump-to-top',toTop);const label=toTop?'В самый верх страницы':'В самый низ страницы';jump.setAttribute('aria-label',label);jump.title=label}
 }
 function settleNavigation(){pendingIndex=null;updateNavigation()}
 window.goToSection=function(id){
  const section=document.getElementById(id);if(!section)return;
  storyRequest++;pendingIndex=sections.indexOf(section);if(pendingIndex<0)pendingIndex=null;
  section.scrollIntoView({behavior:reduced()?'instant':'smooth',block:section.matches('.game-section,.word-river')?'center':'start'});
  clearTimeout(settleTimer);settleTimer=setTimeout(settleNavigation,reduced()?30:1000);updateNavigation();
 };
 jump?.addEventListener('click',()=>window.goToSection(jump.dataset.destination||'site-footer'));
 function stepSection(direction){const active=pendingIndex??current;window.goToSection(sections[Math.max(0,Math.min(sections.length-1,active+direction))].id)}
 up.addEventListener('click',()=>stepSection(-1));down.addEventListener('click',()=>stepSection(1));
 document.addEventListener('keydown',event=>{
  if(!['ArrowUp','ArrowDown'].includes(event.key)||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(document.querySelector('dialog[open],.runner-stage.is-expanded')||event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"],.game-embed-slot,[data-game-input]'))return;
  event.preventDefault();if(event.repeat||heldArrow===event.key)return;heldArrow=event.key;stepSection(event.key==='ArrowDown'?1:-1);
 });
 document.addEventListener('keyup',event=>{if(event.key===heldArrow)heldArrow=null});
 addEventListener('blur',()=>heldArrow=null);
 document.addEventListener('pesni:land-selected',async()=>{
  if(!matchMedia('(max-width:999px)').matches)return;
  const request=++storyRequest,target=document.querySelector('.land-story-focus'),image=document.querySelector('#land-illustration');
  if(image&&!image.complete)try{await image.decode()}catch{}
  if(request!==storyRequest||!target||target.closest('[hidden]'))return;
  requestAnimationFrame(()=>{if(request!==storyRequest)return;target.focus({preventScroll:true});target.scrollIntoView({behavior:reduced()?'instant':'smooth',block:'center'})});
 });
 document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>window.goToSection(button.dataset.go)));
 function syncAudio(){const playing=!backgroundAudio.paused;floatingSound.setAttribute('aria-pressed',String(playing));floatingSound.setAttribute('aria-label',playing?'Выключить фоновую музыку':'Включить фоновую музыку')}
 floatingSound.addEventListener('click',()=>document.querySelector('.sound-button').click());
 backgroundAudio.addEventListener('play',syncAudio);backgroundAudio.addEventListener('pause',syncAudio);backgroundAudio.addEventListener('error',syncAudio);
 addEventListener('scroll',()=>{updateNavigation();if(pendingIndex!==null){clearTimeout(settleTimer);settleTimer=setTimeout(settleNavigation,180)}},{passive:true});addEventListener('resize',updateNavigation);updateNavigation();syncAudio();

 // Anchor to an actual point on the stem, including object-fit and bouquet rotation.
 const opening=document.querySelector('#opening'),bouquet=opening.querySelector('.flower'),thread=opening.querySelector('.hero-thread');
 function drawBouquetThread(){
  if(!thread||!bouquet)return;
  const frame=opening.getBoundingClientRect(),box=bouquet.getBoundingClientRect(),image=bouquet.querySelector('img');
  const width=opening.clientWidth,height=opening.clientHeight,w=bouquet.offsetWidth,h=bouquet.offsetHeight;
  const imageWidth=image.naturalWidth||1199,imageHeight=image.naturalHeight||1312,scale=Math.min(w/imageWidth,h/imageHeight);
  const localX=(w-imageWidth*scale)/2+imageWidth*scale*.365-w/2,localY=(h-imageHeight*scale)/2+imageHeight*scale*.80-h/2;
  const matrix=new DOMMatrix(getComputedStyle(bouquet).transform),x=box.left+box.width/2-frame.left+matrix.a*localX+matrix.c*localY,y=box.top+box.height/2-frame.top+matrix.b*localX+matrix.d*localY;
  thread.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const gradient=thread.querySelector('linearGradient');gradient.setAttribute('x1',x);gradient.setAttribute('y1',y);gradient.setAttribute('x2',x-Math.min(165,width*.29));gradient.setAttribute('y2',y+65);
  const path=thread.querySelector('path');path.setAttribute('d',`M${x} ${y} C${x-10} ${y+27} ${width*.75} ${height+15} ${width*.62} ${height+18} C${width*.44} ${height+20} ${width*.36} ${height-65} ${width*.20} ${height-38} C${width*.10} ${height-25} ${width*.04} ${height+4} -16 ${height+24}`);
  // A tapered silhouette lets the printed stem become a fine red thread.
  const length=path.getTotalLength(),left=[],right=[],steps=Math.ceil(length/3),thickness=width<701?2.7:4.1;
  for(let i=0;i<=steps;i++){const distance=length*i/steps,p=path.getPointAtLength(distance),a=path.getPointAtLength(Math.max(0,distance-.7)),b=path.getPointAtLength(Math.min(length,distance+.7)),norm=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/norm,ny=(b.x-a.x)/norm,radius=.62+thickness*Math.exp(-distance/(width<701?50:90));left.push(`${p.x+nx*radius} ${p.y+ny*radius}`);right.push(`${p.x-nx*radius} ${p.y-ny*radius}`)}
  path.setAttribute('d','M'+left.join('L')+'L'+right.reverse().join('L')+'Z');

 }
 const threadResize=new ResizeObserver(drawBouquetThread);threadResize.observe(opening);threadResize.observe(bouquet);
 bouquet.querySelectorAll('img').forEach(image=>image.addEventListener('load',drawBouquetThread));
 addEventListener('resize',drawBouquetThread);document.fonts.ready.then(drawBouquetThread);drawBouquetThread();
})();
