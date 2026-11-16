/* Integration adapter: freeze the game's clock, callbacks and timers off screen.
   All original game scripts retain their loading order and mechanics. */
(() => {
 if(parent===window)return;
 const native={now:performance.now.bind(performance),raf:requestAnimationFrame.bind(window),caf:cancelAnimationFrame.bind(window),timer:setTimeout.bind(window),clear:clearTimeout.bind(window)};
 let paused=true,pausedAt=native.now(),offset=0,serial=1,requested=false;
 const jobs=new Map();
 const now=()=> (paused?pausedAt:native.now())-offset;
 Object.defineProperty(performance,'now',{configurable:true,value:now});
 const send=(type,extra={})=>parent.postMessage({channel:'pesni-runner',type,...extra},location.origin);
 function arm(job){
  if(paused)return;
  if(job.kind==='frame')job.handle=native.raf(()=>{if(paused)return;jobs.delete(job.id);job.fn(now())});
  else job.handle=native.timer(()=>{
   if(paused)return;
   if(job.repeat)job.due=now()+job.delay;else jobs.delete(job.id);
   job.fn(...job.args);
   if(job.repeat&&jobs.has(job.id))arm(job);
  },Math.max(0,job.due-now()));
 }
 function cancel(id){const job=jobs.get(id);if(!job)return;(job.kind==='frame'?native.caf:native.clear)(job.handle);jobs.delete(id)}
 window.requestAnimationFrame=fn=>{const job={id:serial++,kind:'frame',fn};jobs.set(job.id,job);arm(job);return job.id};
 window.cancelAnimationFrame=cancel;
 function timer(fn,delay=0,repeat=false,args=[]){
  if(typeof fn!=='function')return native.timer(fn,delay,...args);
  const job={id:serial++,kind:'timer',fn,delay:Math.max(repeat?1:0,Number(delay)||0),repeat,args};job.due=now()+job.delay;jobs.set(job.id,job);arm(job);return job.id;
 }
 window.setTimeout=(fn,delay,...args)=>timer(fn,delay,false,args);
 window.setInterval=(fn,delay,...args)=>timer(fn,delay,true,args);
 window.clearTimeout=window.clearInterval=cancel;
 function sync(){
  const active=requested&&!document.hidden;
  if(active&&paused){offset+=native.now()-pausedAt;paused=false;for(const job of jobs.values())arm(job)}
  else if(!active&&!paused){pausedAt=native.now();paused=true;for(const job of jobs.values())(job.kind==='frame'?native.caf:native.clear)(job.handle)}
  document.documentElement.classList.toggle('runner-paused',paused);
  document.documentElement.dataset.runnerState=paused?'paused':'active';
  send('state',{state:paused?'paused':'active',clock:now()});
 }
 document.documentElement.classList.add('runner-paused');
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==location.origin||event.data?.channel!=='pesni-runner')return;
  const message=event.data;
  if(message.type==='resume'){requested=true;sync();if(message.start&&typeof startGame==='function')startGame()}
  if(message.type==='pause'){requested=false;sync()}
  if(message.type==='configure'&&typeof message.shareUrl==='string'){
   try{const url=new URL(message.shareUrl);if(url.origin===location.origin)window.runnerLandingUrl=url.href}catch{}
  }
 });
 document.addEventListener('visibilitychange',sync);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();send('collapse')}},true);
 window.runnerExit=()=>send('exit');
 window.addEventListener('load',()=>{
  Promise.all([...document.images].map(image=>image.decode?.().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>send('ready'));
 });
 window.addEventListener('error',event=>{if(event.message)send('error',{message:'Игра не смогла запуститься. Попробуйте загрузить её заново.'})});
})();
