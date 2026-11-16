/* Integration clock and lifecycle. Runs inside this game's iframe only. */
(() => {
 const root=window,embedded=parent!==root,channel='pesni-gifts';
 const native={now:performance.now.bind(performance),epoch:Date.now(),raf:requestAnimationFrame.bind(root),caf:cancelAnimationFrame.bind(root),timer:setTimeout.bind(root),clear:clearTimeout.bind(root)};
 const startedAt=native.now();let paused=false,pausedAt=startedAt,offset=0,serial=1,requested=true,ready=false,game=null,menu=null,lastFocus=null;
 const jobs=new Map(),videosToResume=new Set();
 const now=()=> (paused?pausedAt:native.now())-offset;
 Object.defineProperty(performance,'now',{configurable:true,value:now});
 Date.now=()=>Math.floor(native.epoch+now()-startedAt);
 const send=(type,extra={})=>{if(embedded)parent.postMessage({channel,type,...extra},location.origin)};
 function arm(job){
  if(paused)return;
  if(job.kind==='frame')job.handle=native.raf(()=>{if(paused)return;jobs.delete(job.id);job.fn(now())});
  else job.handle=native.timer(()=>{if(paused)return;if(job.repeat)job.due=now()+job.delay;else jobs.delete(job.id);job.fn(...job.args);if(job.repeat&&jobs.has(job.id))arm(job)},Math.max(0,job.due-now()));
 }
 function cancel(id){const job=jobs.get(id);if(!job)return;(job.kind==='frame'?native.caf:native.clear)(job.handle);jobs.delete(id)}
 root.requestAnimationFrame=fn=>{const job={id:serial++,kind:'frame',fn};jobs.set(job.id,job);arm(job);return job.id};root.cancelAnimationFrame=cancel;
 function timer(fn,delay=0,repeat=false,args=[]){if(typeof fn!=='function')return native.timer(fn,delay,...args);const job={id:serial++,kind:'timer',fn,delay:Math.max(repeat?1:0,Number(delay)||0),repeat,args};job.due=now()+job.delay;jobs.set(job.id,job);arm(job);return job.id}
 root.setTimeout=(fn,delay,...args)=>timer(fn,delay,false,args);root.setInterval=(fn,delay,...args)=>timer(fn,delay,true,args);root.clearTimeout=root.clearInterval=cancel;
 function videoElements(){return new Set([...document.querySelectorAll('video'),root.TridaraVideoElement?.()].filter(Boolean))}
 function sync(){
  // Let the loader finish even if the user scrolls away before ready.
  const active=(!ready||requested)&&!document.hidden;
  if(!active&&!paused){pausedAt=native.now();paused=true;for(const j of jobs.values())(j.kind==='frame'?native.caf:native.clear)(j.handle);for(const v of videoElements())if(!v.paused){videosToResume.add(v);v.pause()}}
  else if(active&&paused){offset+=native.now()-pausedAt;paused=false;for(const j of jobs.values())arm(j);for(const v of videosToResume)v.play()?.catch?.(()=>{});videosToResume.clear()}
  if(game)game.paused=paused;
  document.documentElement.classList.toggle('gifts-paused',paused);
  document.documentElement.dataset.giftsState=paused?'paused':'active';send('state',{state:paused?'paused':'active'});
 }
 function continueGame(){menu?.close();requested=true;send('menu',{open:false});sync();lastFocus?.focus?.({preventScroll:true})}
 function finish(){if(!ready)return;lastFocus=document.activeElement;requested=false;sync();if(menu&&!menu.open)menu.showModal();send('menu',{open:true})}
 function leave(){menu?.close();requested=false;sync();send('exit')}
 function restart(){send('restarting');location.reload()}
 async function share(){
  const url=api.shareUrl||location.href.split('?')[0],payload={title:'Три дара — Песни Земли',text:'Трое друзей, три дара и один непростой выбор. Пройди испытания и помоги Амипат выбрать любимого в игре «Три дара».',url};
  if(navigator.share)try{await navigator.share(payload);return}catch(e){if(e?.name==='AbortError')return}
  try{await navigator.clipboard.writeText(payload.text+'\n'+url);const status=menu?.querySelector('[role=status]');if(status)status.textContent='Ссылка скопирована'}catch{root.prompt('Скопируйте приглашение в игру:',payload.text+'\n'+url)}
 }
 const api=root.GiftsIntegration={shareUrl:null,ready(g){if(ready)return;game=g;ready=true;sync();send('ready')},screen(screen){send('screen',{screen})},finish,restart,share,fail(){send('error',{message:'Не удалось загрузить игру. Попробуйте ещё раз.'})}};
 root.addEventListener('message',event=>{
  if(!embedded||event.source!==parent||event.origin!==location.origin||event.data?.channel!==channel)return;
  const m=event.data;
  if(m.type==='configure')try{const url=new URL(m.shareUrl);if(url.origin===location.origin)api.shareUrl=url.href}catch{}
  if(m.type==='pause'){requested=false;sync()}
  if(m.type==='resume'){
   requested=true;sync();
   if(m.start&&game?.gui?.currentMenu==='main')requestAnimationFrame(()=>root.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true})));
  }
  if(m.type==='finish')finish();
  if(m.type==='exit')leave();
  if(m.type==='control'&&!paused)root.dispatchEvent(new KeyboardEvent('keydown',{key:m.key,code:m.code,bubbles:true}));
 });
 document.addEventListener('touchmove',event=>{if(event.cancelable&&event.target?.closest?.('#apple-quest,#horse-quest,#mirror-quest'))event.preventDefault()},{passive:false,capture:true});
 document.addEventListener('visibilitychange',sync);
 document.addEventListener('play',event=>{if(paused&&event.target?.pause){videosToResume.add(event.target);event.target.pause()}},true);
 root.addEventListener('keydown',event=>{
  if(event.repeat&&['Space','Enter'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();return}
  if(event.code==='Escape'&&!menu?.open){
   const history=document.getElementById('history-panel');
   const questActive=['TridaraAppleQuest','TridaraHorseQuest','TridaraMirrorQuest'].some(name=>root[name]?.keyboard?.active());
   if((history&&!history.hidden)||questActive||root.TridaraChoosing||document.querySelector('.choose-confirm.is-on'))return;
   event.preventDefault();event.stopImmediatePropagation();finish();return;
  }
  // Native dialog keys keep their default action, but never reach quest shortcuts.
  if(menu?.open){event.stopImmediatePropagation();return}
  if(paused&&!event.target?.closest?.('#gifts-exit')){event.preventDefault();event.stopImmediatePropagation()}
 },true);
 function makeMenu(){
  menu=document.createElement('dialog');menu.id='gifts-exit';menu.setAttribute('aria-labelledby','gifts-exit-title');
  menu.innerHTML='<h2 id="gifts-exit-title">История подождёт</h2><p>Вернись к поиску даров или начни путешествие заново.</p><div class="gifts-exit-actions"><button type="button" data-gifts-action="continue">Продолжить историю</button><button type="button" data-gifts-action="restart">Начать заново</button><button type="button" data-gifts-action="share">Поделиться игрой</button><a href="https://mtsbooks.onelink.me/zdZb/t75hb4td" target="_blank" rel="noopener noreferrer">К истории →</a><button type="button" data-gifts-action="exit">Вернуться на сайт</button></div><p role="status" class="gifts-menu-status"></p>';
  menu.addEventListener('cancel',event=>{event.preventDefault();continueGame()});
  menu.addEventListener('click',event=>{const action=event.target.closest('[data-gifts-action]')?.dataset.giftsAction;if(action==='continue')continueGame();if(action==='restart')restart();if(action==='share')share();if(action==='exit')leave()});
  document.body.appendChild(menu);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',makeMenu,{once:true});else makeMenu();
 root.addEventListener('error',event=>{if(event.message)api.fail()});
 sync();
})();
