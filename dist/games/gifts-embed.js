(() => {
 const section=document.querySelector('#game-gifts'),stage=section.querySelector('.game-embed-slot');
 stage.classList.add('runner-stage','gifts-stage');stage.dataset.state='idle';
 stage.querySelector('.game-window-top')?.remove();stage.querySelector('.game-window-caption')?.remove();
 const poster=stage.querySelector('.game-scene');poster.src='games/three-gifts/assets/gui/titlebg_start.webp';poster.alt='Стартовый экран визуальной новеллы «Три дара»';
 const trigger=section.querySelector('.game-preview-link');trigger.hidden=true;
 const expand=stage.querySelector('.game-expand');expand.removeAttribute('data-open-preview');expand.setAttribute('aria-label','Развернуть «Три дара»');
 function button(cls,label,svg){const node=document.createElement('button');node.type='button';node.className=cls;if(svg){node.innerHTML=svg;node.setAttribute('aria-label',label)}else node.textContent=label;stage.append(node);return node}
 const launch=button('runner-launch','Играть'),pause=button('runner-pause','Продолжить историю'),toggle=button('runner-toggle','Поставить игру на паузу','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>'),close=button('runner-close','Открыть меню завершения','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>');
 pause.hidden=toggle.hidden=close.hidden=true;
 const loading=document.createElement('p');loading.className='runner-loading';loading.setAttribute('role','status');loading.hidden=true;stage.append(loading);
 const mobile=matchMedia('(max-width:760px), (pointer:coarse)'),note=section.querySelector('.game-window-note');
 note.innerHTML='<span class="runner-desktop-tip">клик или пробел — дальше · стрелки — выбор · H — история диалогов</span><span class="runner-touch-tip">касайся предметов и выбирай, кому достанется сердце Амипат</span>';
 function launchLabel(){if(stage.dataset.state==='idle')launch.textContent=mobile.matches&&matchMedia('(orientation:portrait)').matches?'Нажмите и поверните телефон, чтобы играть':'Играть'}launchLabel();mobile.addEventListener('change',launchLabel);matchMedia('(orientation:portrait)').addEventListener('change',launchLabel);
 let frame=null,ready=false,inView=false,userPaused=false,expanded=false,menuOpen=false,finishPending=false,timeout=0,previousFocus=null;
 function post(type,extra={}){frame?.contentWindow?.postMessage({channel:'pesni-gifts',type,...extra},location.origin)}
 function configure(){post('configure',{shareUrl:location.origin+location.pathname+'#game-gifts'})}
 function sync(){
  const active=ready&&(inView||expanded)&&!document.hidden&&!userPaused&&!menuOpen;
  post(active?'resume':'pause');pause.hidden=!ready||active||menuOpen;toggle.hidden=!ready||userPaused||menuOpen;close.hidden=!frame;
  stage.dataset.state=ready?(active?'playing':'paused'):frame?'loading':'idle';
 }
 function expandGame(){activate();previousFocus=document.activeElement;expanded=true;stage.classList.add('is-expanded');document.documentElement.classList.add('runner-open');expand.hidden=true;stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');stage.setAttribute('aria-label','Три дара');sync();frame?.focus()}
 function collapse(){if(!expanded)return;expanded=false;stage.classList.remove('is-expanded');document.documentElement.classList.remove('runner-open');expand.hidden=false;stage.removeAttribute('role');stage.removeAttribute('aria-modal');sync();previousFocus?.focus({preventScroll:true})}
 function watchLoad(){clearTimeout(timeout);timeout=setTimeout(()=>{if(!ready){loading.textContent='Загрузка занимает больше времени. Можно повторить попытку.';launch.textContent='Повторить загрузку';launch.hidden=false}},45000)}
 function activate(){document.dispatchEvent?.(new CustomEvent('pesni:game-activate',{detail:{id:'game-gifts'}}))}
 function load(full=false){
  activate();
  userPaused=false;
  if(!frame){
   ready=false;menuOpen=false;loading.hidden=false;loading.textContent='Загружаем «Три дара»…';launch.hidden=true;
   frame=document.createElement('iframe');frame.className='runner-frame';frame.title='Игра «Три дара»';frame.allow='fullscreen; web-share; clipboard-write';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals');
   frame.addEventListener('load',()=>{configure();sync()});frame.src='games/three-gifts/index.html?embedded=1&v=site5';stage.append(frame);
   watchLoad();
  }else if(!ready){frame.remove();frame=null;clearTimeout(timeout);return load(full)}
  if(full)expandGame();else sync();
 }
 launch.addEventListener('click',()=>load(mobile.matches));
 expand.addEventListener('click',()=>{if(!frame)load(true);else expandGame()});
 document.addEventListener('pesni:game-activate',event=>{if(event.detail?.id!=='game-gifts'&&frame){userPaused=true;sync()}});
 pause.addEventListener('click',()=>{activate();userPaused=false;sync();frame?.focus()});toggle.addEventListener('click',()=>{userPaused=true;sync()});
 function cancelLoad(){clearTimeout(timeout);frame?.remove();frame=null;ready=false;menuOpen=false;finishPending=false;userPaused=true;collapse();loading.hidden=true;launch.hidden=false;sync();launchLabel();launch.focus({preventScroll:true})}
 function finish(){if(!ready){cancelLoad();return;}if(menuOpen||finishPending){cancelLoad();return}activate();menuOpen=true;finishPending=true;userPaused=false;post('finish');sync();frame?.focus()}
 close.addEventListener('click',finish);
 document.addEventListener('keydown',event=>{
  if(expanded&&event.code==='Escape'){event.preventDefault();finish();return}
  if(stage.dataset.state!=='playing'||(!expanded&&!stage.contains(event.target))||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(['Space','Enter'].includes(event.code)&&event.target.closest?.('button,a'))return;
  if(!/^(Arrow(Left|Right|Up|Down)|Space|Enter|Key[QEH]|Digit[1-9]|Page(Up|Down))$/.test(event.code))return;
  event.preventDefault();event.stopImmediatePropagation();post('control',{code:event.code,key:event.key});frame?.focus();
 },true);
 window.addEventListener('message',event=>{
  if(event.source!==frame?.contentWindow||event.origin!==location.origin||event.data?.channel!=='pesni-gifts')return;
  const m=event.data;
  if(m.type==='ready'){ready=true;clearTimeout(timeout);loading.hidden=true;launch.hidden=true;configure();post('resume',{start:true});sync();frame.focus()}
  if(m.type==='menu'){if(!m.open&&finishPending)return;menuOpen=!!m.open;if(m.open)finishPending=false;if(!menuOpen){userPaused=false;activate()}sync()}
  if(m.type==='exit')cancelLoad();
  if(m.type==='restarting'){ready=false;menuOpen=false;finishPending=false;loading.hidden=false;loading.textContent='Начинаем новую историю…';watchLoad();sync()}
  if(m.type==='error'){clearTimeout(timeout);ready=false;loading.hidden=false;loading.textContent=m.message;launch.textContent='Повторить загрузку';launch.hidden=false;sync()}
 });
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:.35}).observe(stage);document.addEventListener('visibilitychange',sync);
})();
