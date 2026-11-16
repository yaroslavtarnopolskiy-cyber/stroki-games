(() => {
 const section=document.querySelector('#games'),stage=section.querySelector('.game-embed-slot');
 stage.classList.add('runner-stage');stage.dataset.state='idle';
 const trigger=section.querySelector('.game-preview-link');if(trigger)trigger.textContent='Играть';
 const expand=stage.querySelector('.game-expand');expand.removeAttribute('data-open-preview');expand.setAttribute('aria-label','Развернуть игру «Путь Кудым-Оша»');
 stage.querySelector('.game-window-top')?.remove();stage.querySelector('.game-window-caption')?.remove();
 const launch=document.createElement('button');launch.type='button';launch.className='runner-launch';launch.textContent='Играть';stage.append(launch);
 const loading=document.createElement('p');loading.className='runner-loading';loading.setAttribute('role','status');loading.hidden=true;stage.append(loading);
 const pauseToggle=document.createElement('button');pauseToggle.type='button';pauseToggle.className='runner-toggle';pauseToggle.setAttribute('aria-label','Поставить игру на паузу');pauseToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';pauseToggle.hidden=true;stage.append(pauseToggle);
 const pause=document.createElement('button');pause.type='button';pause.className='runner-pause';pause.textContent='Продолжить игру';pause.hidden=true;stage.append(pause);
 const close=document.createElement('button');close.type='button';close.className='runner-close';close.setAttribute('aria-label','Свернуть игру');close.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';close.hidden=true;stage.append(close);
 const note=section.querySelector('.game-window-note');note.innerHTML='<span class="runner-desktop-tip">ЛКМ или пробел — прыжок · ПКМ или E — смена облика</span><span class="runner-touch-tip">Тап — смена облика · свайп вверх — прыжок</span>';
 let frame=null,ready=false,inView=false,userPaused=false,expanded=false,loadTimer=0,previousFocus=null;
 function post(type,extra={}){frame?.contentWindow?.postMessage({channel:'pesni-runner',type,...extra},location.origin)}
 function sync(){
  const active=ready&&(inView||expanded)&&!document.hidden&&!userPaused;
  post(active?'resume':'pause');
  pause.hidden=!ready||active;pause.textContent='Продолжить игру';pauseToggle.hidden=!ready||userPaused;
  stage.dataset.state=ready?(active?'playing':'paused'):frame?'loading':'idle';
 }
 function expandGame(){
  previousFocus=document.activeElement;expanded=true;stage.classList.add('is-expanded');document.documentElement.classList.add('runner-open');close.hidden=false;expand.hidden=true;
  stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');stage.setAttribute('aria-label','Путь Кудым-Оша');sync();close.focus({preventScroll:true});
 }
 function collapse(){
  if(!expanded)return;expanded=false;stage.classList.remove('is-expanded');document.documentElement.classList.remove('runner-open');close.hidden=true;expand.hidden=false;
  stage.removeAttribute('role');stage.removeAttribute('aria-modal');stage.removeAttribute('aria-label');sync();previousFocus?.focus({preventScroll:true});
 }
 function launchGame(full=false){
  userPaused=false;
  if(!frame){
   loading.hidden=false;loading.textContent='Загружаем игру…';launch.hidden=true;
   frame=document.createElement('iframe');frame.className='runner-frame';frame.title='Игра «Путь Кудым-Оша»';frame.allow='fullscreen; web-share; clipboard-write';
   frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals');
   frame.src='games/runner/index.html?embedded=1';stage.append(frame);
   loadTimer=setTimeout(()=>{if(!ready){loading.textContent='Загрузка занимает больше времени. Проверьте соединение или попробуйте ещё раз.';launch.textContent='Повторить загрузку';launch.hidden=false}},45000);
  }else if(!ready){frame.remove();frame=null;clearTimeout(loadTimer);return launchGame(full)}
  if(full)expandGame();else sync();
 }
 trigger?.addEventListener('click',()=>launchGame(matchMedia('(max-width:760px)').matches));
 launch.addEventListener('click',()=>launchGame(matchMedia('(max-width:760px)').matches));
 expand.addEventListener('click',()=>{if(!frame)launchGame(true);else expandGame()});
 close.addEventListener('click',collapse);
 pauseToggle.addEventListener('click',()=>{userPaused=true;sync()});
 document.addEventListener('focusin',event=>{if(expanded&&!stage.contains(event.target))close.focus({preventScroll:true})});
 pause.addEventListener('click',()=>{userPaused=false;sync();frame?.focus()});
 document.addEventListener('keydown',event=>{if(expanded&&event.key==='Escape'){event.preventDefault();collapse()}});
 window.addEventListener('message',event=>{
  if(event.source!==frame?.contentWindow||event.origin!==location.origin||event.data?.channel!=='pesni-runner')return;
  const {type,message}=event.data;
  if(type==='state'){stage.dataset.engineState=event.data.state;stage.dataset.engineClock=String(event.data.clock);}
  if(type==='ready'){ready=true;clearTimeout(loadTimer);loading.hidden=true;launch.hidden=true;post('configure',{shareUrl:location.origin+location.pathname+'#games'});post('resume',{start:true});sync();frame.focus()}
  if(type==='collapse')collapse();
  if(type==='exit'){userPaused=true;collapse();sync()}
  if(type==='error'){loading.textContent=message;loading.hidden=false;launch.textContent='Повторить загрузку';launch.hidden=false;ready=false;sync()}
 });
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:.35}).observe(stage);
 document.addEventListener('visibilitychange',sync);
})();
