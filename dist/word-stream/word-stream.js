import {frameDeflection,safeWordPlacement} from './flow-obstacles.mjs?v=2';
import {words} from './words.js';
import {flowConfig as config} from './config.js?v=6';
const disclaimer='Перевод и произношение отдельных слов могут отличаться в зависимости от диалекта, контекста и языковой традиции. Проект носит художественно-просветительский характер и не является нормативным лингвистическим или фонетическим источником. Звёздочкой (*) отмечены предварительные варианты произношения.';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mod=(v,d)=>((v%d)+d)%d;
const displayWord=word=>word.toLocaleLowerCase('ru');
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
function ordered(list,seed){let state=seed>>>0;const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0};const result=[...list];for(let i=result.length-1;i>0;i--){const j=next()%(i+1);[result[i],result[j]]=[result[j],result[i]]}return result}
class WordStream{
 constructor(root){
  Object.assign(this,{root,id:root.id,seed:Number(root.dataset.seed)||31,rows:[],width:0,height:260,selected:null,holding:null,focusPaused:false,visible:false,velocity:1,frame:0,last:0,viewed:false});
  this.flowIndex=Number(root.dataset.flowIndex)||0;
  this.theme=document.documentElement.dataset.theme==='death'?'death':'life';
  root.innerHTML=`<h2 class="sr-only">Слова земли</h2><p id="${this.id}-help" class="sr-only">Нажмите на слово, чтобы ненадолго увидеть значение. Удерживайте пальцем, мышью, пробелом или Enter, чтобы оставить карточку открытой.</p><div class="river-stage"><svg class="river-lines" aria-hidden="true"><defs><filter id="${this.id}-ink" x="-2%" y="-10%" width="104%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves="1" seed="4" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale=".45"/></filter><g id="${this.id}-flower"><path class="flower-stem" d="M0 0C3-8 3-15 0-24M1-8C-8-8-10-13-12-15-5-16 0-13 1-8M2-13C10-12 13-16 14-20 6-19 3-17 2-13"/><path class="flower-petal" d="M0-23C-10-20-19-28-16-37-12-33-8-30-5-30-12-38-8-45-3-46-4-39-1-35 2-34 0-43 6-47 11-44 5-39 5-35 6-32 13-37 17-34 18-31 13-25 8-22 0-23Z"/><path class="flower-cut" d="M-12-34C-12-28-6-25 0-26M-4-39C-4-33 1-29 6-28M9-38C7-33 7-30 4-27"/></g><g id="${this.id}-bud"><path class="flower-stem" d="M0 0C-4-10-3-20 1-28M-1-9C6-10 10-14 10-18 3-17 0-14-1-9M-2-16C-8-16-11-21-10-25-4-23-3-20-2-16"/><path class="flower-petal" d="M1-27C-6-28-8-36-3-40-2-34 1-33 2-31 1-37 6-42 9-38 10-32 7-27 1-27Z"/><path class="flower-cut" d="M0-35 3-29"/></g><g id="${this.id}-sprig"><path class="flower-stem" d="M0 0C0-8-4-17-2-29M-1-8C7-7 12-12 14-18 7-19 1-15-1-8M-2-17C-12-16-16-23-15-27-7-28-3-22-2-17M-2-26C-8-31-5-38-1-42 4-37 4-31-2-26"/><path class="flower-cut" d="M1-11 10-16M-5-20-12-25"/></g></defs><g class="river-snake-back"/><g filter="url(#${this.id}-ink)"><path class="river-thread-a"/><path class="river-thread-b"/></g><g class="river-ribbon-pattern"/><g class="river-snake-front"/><g class="river-flowers"/></svg><div class="river-row" data-row="0"></div><div class="river-row" data-row="1"></div></div><div class="river-details" id="${this.id}-details" role="region" aria-label="Значение слова" aria-live="polite" hidden><h3></h3><p class="river-language"></p><p class="river-meaning"></p><p class="river-pronunciation"></p><p class="river-disclaimer" id="${this.id}-note" tabindex="-1">${disclaimer}</p></div>`;
  this.stage=root.querySelector('.river-stage');this.details=root.querySelector('.river-details');
  this.resize=new ResizeObserver(()=>this.measure());this.resize.observe(root);
  const map=root.id==='word-river'?document.querySelector('#voices'):null;if(map){this.mapResize=new ResizeObserver(()=>this.alignAfterMap());this.mapResize.observe(map);this.mapResize.observe(map.querySelector('.voices-inner'))}
  this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible&&this.pendingTheme){this.pendingTheme=false;this.build()}if(this.visible&&!this.viewed){this.viewed=true;this.emit('word_stream_view')}this.wake()},{threshold:.1});this.observer.observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.release();this.wake()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&this.selected){event.preventDefault();this.release()}});
  window.addEventListener('pointerup',event=>this.finishHold(event.pointerId));
  window.addEventListener('pointercancel',event=>this.release(event.pointerId));
  window.addEventListener('scroll',()=>{if(this.selected&&!this.holding?.keyboard)this.release()},{passive:true});
  root.addEventListener('focusout',event=>{if(!event.relatedTarget?.closest('.river-row')){this.focusPaused=false;if(this.holding?.keyboard)this.release();this.wake()}});
  new MutationObserver(()=>this.changeTheme()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  reduced.addEventListener('change',()=>{root.classList.toggle('is-reduced',reduced.matches);this.measure();this.wake()});
  this.obstacles=new ResizeObserver(()=>this.measureFrames());this.obstacles.observe(document.body);document.querySelectorAll('.game-header,.game-window-group').forEach(frame=>this.obstacles.observe(frame));
  this.build();
 }
 emit(name,word=this.selected?.word){const detail={name,stream_id:this.id,theme:this.theme};if(word)Object.assign(detail,{word_id:word.id,word:word.word,language:word.language,pronunciation_status:word.pronunciationStatus});this.root.dispatchEvent(new CustomEvent('pesni:analytics',{bubbles:true,detail}))}
 alignAfterMap(){
  if(this.root.id!=='word-river')return;
  const map=document.querySelector('#voices');if(!map)return;
  const candidates=[map.querySelector('.map-column'),map.querySelector('.section-heading'),map.querySelector('.land-panel')].filter(e=>e&&!e.hidden);
  const bottom=Math.max(...candidates.map(e=>e.getBoundingClientRect().bottom));
  const empty=map.getBoundingClientRect().bottom-bottom;
  this.root.style.marginTop=-Math.max(0,empty-12)+'px';
 }
 wave(x,index){const p=config[this.theme],amplitude=this.width<760?p.amplitude*.73:p.amplitude,flow=this.flowIndex||0;
  const phase=config.phase+flow*Math.PI*.45,tilt=flow?(flow%2?-1:1)*(this.width<760?65:110):0;
  const angle=x/Math.max(1,this.width)*Math.PI*2*config.waves+phase,sign=index?-1:1;
  return {y:this.height/2+(x/Math.max(1,this.width)-.5)*tilt+sign*amplitude*Math.sin(angle),sine:sign*Math.sin(angle),slope:tilt/Math.max(1,this.width)+sign*amplitude*Math.PI*2*config.waves/Math.max(1,this.width)*Math.cos(angle)}
 }

 drawLines(){
  const svg=this.root.querySelector('.river-lines');svg.setAttribute('viewBox',`0 0 ${this.width} ${this.height}`);
  for(let row=0;row<2;row++){
   const step=this.width/12;let d='';
   for(let i=0;i<12;i++){const x=i*step,x2=(i+1)*step,a=this.wave(x,row),b=this.wave(x2,row);if(!i)d=`M0 ${a.y}`;d+=`C${x+step/3} ${a.y+a.slope*step/3} ${x2-step/3} ${b.y-b.slope*step/3} ${x2} ${b.y}`}
   svg.querySelector(row?'.river-thread-b':'.river-thread-a').setAttribute('d',d);
  }
  const flowers=svg.querySelector('.river-flowers');flowers.replaceChildren();
  const anchors=this.width<760?[{u:.11,row:0,size:.46,kind:'flower',tilt:-22},{u:.23,row:1,size:.51,kind:'bud',tilt:27},{u:.37,row:0,size:.44,kind:'sprig',tilt:-14},{u:.55,row:1,size:.58,kind:'flower',tilt:32},{u:.69,row:0,size:.48,kind:'bud',tilt:-28},{u:.82,row:1,size:.5,kind:'sprig',tilt:20},{u:.92,row:0,size:.38,kind:'flower',tilt:-36}]:Array.from({length:13},(_,i)=>({u:.055+i*.074,row:i%2,size:[.46,.62,.5,.57][i%4],kind:['flower','bud','sprig','flower'][i%4],tilt:[-30,22,-12,34][i%4]}));
  for(const anchor of anchors){const x=this.width*anchor.u,wave=this.wave(x,anchor.row),flower=document.createElementNS('http://www.w3.org/2000/svg','use');flower.setAttribute('href',`#${this.id}-${anchor.kind}`);const inward=wave.sine<0?180:0,size=anchor.size*clamp(Math.abs(wave.sine)*1.35,.42,1);flower.setAttribute('transform',`translate(${x} ${wave.y}) rotate(${inward+Math.atan(wave.slope)*180/Math.PI+anchor.tilt}) scale(${anchor.row?-size:size} ${size})`);flowers.append(flower)}
  const pattern=svg.querySelector('.river-ribbon-pattern');pattern.replaceChildren();
  for(let x=12,i=0;x<this.width;x+=22,i++){const wave=this.wave(x,0),mark=document.createElementNS('http://www.w3.org/2000/svg','path');mark.setAttribute('d',i%3===1?'M-5-2-2 0-5 2M1-2 4 0 1 2':'M-4 0 0-2.3 4 0 0 2.3ZM-7 0h1m12 0h1');mark.setAttribute('transform',`translate(${x} ${wave.y}) rotate(${Math.atan(wave.slope)*180/Math.PI})`);pattern.append(mark)}
  this.drawSnake(svg);
 }
 drawSnake(svg){
  const back=svg.querySelector('.river-snake-back'),front=svg.querySelector('.river-snake-front');back.replaceChildren();front.replaceChildren();
  const mobile=this.width<760,extended=(this.flowIndex||0)>0,growth=extended?1.15:1,coils=extended?6:3;
  const baseLength=Math.min(mobile?122:204,this.width*.31),length=baseLength*(extended?2:1),row=0;
  const start=this.flowIndex===1?this.width-length+18:this.flowIndex===2?-length*.5:this.width*(mobile?.36:.55);
  const point=t=>{const x=start+t*length,wave=this.wave(x,row);return {x,y:wave.y+9*Math.sin(t*Math.PI*2*coils)*(1-.3*t)}};
  const radius=t=>(1.0+2.8*Math.sin(Math.PI*t/2))*growth,normal=t=>{const a=point(Math.max(0,t-.002)),b=point(Math.min(1,t+.002)),d=Math.hypot(b.x-a.x,b.y-a.y);return {x:-(b.y-a.y)/d,y:(b.x-a.x)/d}};
  const silhouette=(from,to)=>{const sides=[[],[]];for(let i=0;i<=70;i++){const t=from+(to-from)*i/70,p=point(t),n=normal(t),r=radius(t);for(let side=0;side<2;side++){const sign=side?1:-1;sides[side].push(`${p.x+n.x*r*sign} ${p.y+n.y*r*sign}`)}}return 'M'+sides[0].join('L')+'L'+sides[1].reverse().join('L')+'Z'};
  const add=(group,d,cls)=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);p.setAttribute('class',cls);group.append(p);return p};
  add(back,silhouette(0,1),'snake-body');
  for(let i=0;i<coils;i++){const d=silhouette(i/coils,(i+.5)/coils);add(front,d,'snake-clear');add(front,d,'snake-body')}
  const scales=document.createElementNS('http://www.w3.org/2000/svg','g');scales.setAttribute('class','snake-scales');
  for(let t=.08;t<.98;t+=.032/(extended?2:1)){const p=point(t),n=normal(t),angle=Math.atan2(-n.x,n.y)*180/Math.PI,mark=add(scales,'M-1.6-1.8Q0 .8 1.6-1.8M-1.6 1Q0 3.2 1.6 1','snake-scale');mark.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle})`)}front.append(scales);
  const head=point(1),near=point(.99),angle=Math.atan2(head.y-near.y,head.x-near.x)*180/Math.PI,g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform',`translate(${head.x} ${head.y}) rotate(${angle}) scale(${growth})`);add(g,'M-4-3.2Q1-6.5 11-1L13 0 11 1Q1 6.5-4 3.2Z','snake-head');add(g,'M5-2.5h.25','snake-eye');add(g,'M12 0h4m0 0 2-1.3m-2 1.3 2 1.3','snake-tongue');front.append(g);
 }

 build(){
  this.root.classList.toggle('is-reduced',reduced.matches);
  const dictionary=words.filter(word=>word.theme===this.theme);
  this.rows=[...this.root.querySelectorAll('.river-row')].map((element,index)=>{
   element.replaceChildren();const row={element,index,phase:index?180:-240,total:1,items:[]};
   ordered(dictionary,this.seed+index*137).forEach((word,i)=>{
    const button=document.createElement('button');button.type='button';button.className='flowing-word';button.textContent=displayWord(word.word);button.lang=word.languageCode;button.dataset.wordId=word.id;button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',this.details.id);button.setAttribute('aria-describedby',this.id+'-help');button.setAttribute('aria-label',displayWord(word.word)+' — нажмите или удерживайте, чтобы узнать значение');
    const item={button,word,rank:(i*7+index)%3,row,offset:0,x:0,sx:1,sy:1,rotation:0,y:0,bendX:0,skew:0};
    button.addEventListener('pointerdown',event=>{
     if(event.button!==0||!event.isPrimary)return;this.release();
     this.holding={item,pointerId:event.pointerId,x:event.clientX,y:event.clientY,started:performance.now(),keyboard:false};
     button.setPointerCapture(event.pointerId);
     this.open(item);
    });
    button.addEventListener('pointermove',event=>{const hold=this.holding;if(hold?.item===item&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>config.holdSlop)this.release(event.pointerId)});
    button.addEventListener('lostpointercapture',event=>this.release(event.pointerId));
    button.addEventListener('contextmenu',event=>event.preventDefault());
    button.addEventListener('click',event=>{event.preventDefault();if(event.detail===0&&!this.selected&&!this.holding){this.open(item);this.closeTimer=setTimeout(()=>this.release(),config.tapPreviewMs)}});
    button.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(event.repeat)return;this.release();this.holding={item,keyboard:true,key:event.key,started:performance.now()};this.open(item)}});
    button.addEventListener('keyup',event=>{if(this.holding?.keyboard&&this.holding.key===event.key){event.preventDefault();this.finishHold()}});
    button.addEventListener('focus',()=>{if(!button.matches(':focus-visible'))return;this.focusPaused=true;if(item.x<40||item.x>this.width-40){row.phase+=this.width/2-item.x;this.render(0)}this.wake()});
    element.append(button);row.items.push(item);
   });return row;
  });this.measure();this.wake();
 }
 measureFrames(){
  const stage=this.stage.getBoundingClientRect();this.frames=[...document.querySelectorAll('.game-header,.game-window-group')].map(el=>{const b=el.getBoundingClientRect();return {left:b.left-stage.left,top:b.top-stage.top,width:b.width,height:b.height}}).filter(b=>b.top+b.height>-250&&b.top<this.height+250);
 }
 measure(){
  if(!this.rows.length)return;this.width=this.root.clientWidth;this.height=this.stage.clientHeight||260;const mobile=this.width<760;
  // Batch style writes before reading text bounds, avoiding a layout for every word.
  for(const row of this.rows)for(const item of row.items)item.button.style.fontSize=((mobile?29:38)+item.rank*(mobile?3:4))/2+'px';
  for(const row of this.rows){let offset=0;for(const item of row.items){item.width=item.button.offsetWidth;item.height=item.button.offsetHeight;const slot=item.width*config.slotScale+(mobile?config.mobileGap:config.desktopGap);item.offset=offset+slot/2;offset+=slot}row.total=offset}
  this.drawLines();this.alignAfterMap();this.measureFrames();this.render(0);if(this.selected)this.positionDetails();
 }
 positionDetails(){
  if(!this.selected)return;const box=this.selected.button.getBoundingClientRect(),card=this.details.getBoundingClientRect();
  const left=clamp(box.left+box.width/2-card.width/2,56,Math.max(56,innerWidth-card.width-16));
  const below=box.bottom+10;const top=below+card.height<innerHeight-12?below:box.top-card.height-10;
  this.details.style.left=left+'px';this.details.style.top=clamp(top,12,Math.max(12,innerHeight-card.height-12))+'px';
 }
 open(item){
  clearTimeout(this.closeTimer);this.velocity=0;this.selected=item;this.emit('word_click');this.root.classList.add('has-selection');item.button.setAttribute('aria-expanded','true');
  this.details.querySelector('h3').textContent=displayWord(item.word.word);this.details.querySelector('.river-language').textContent=item.word.language+' язык';this.details.querySelector('.river-meaning').textContent='Значение: '+item.word.meaning;
  const pronunciation=this.details.querySelector('.river-pronunciation');pronunciation.replaceChildren(document.createTextNode('Произношение (МФА): '+item.word.pronunciation));
  if(item.word.pronunciationStatus==='preliminary'){const note=document.createElement('button');note.type='button';note.className='river-star-note';note.textContent='*';note.setAttribute('aria-label','Предварительный вариант произношения — пояснение');note.setAttribute('aria-describedby',this.id+'-note');note.title='Предварительная транскрипция';note.addEventListener('click',()=>this.root.querySelector('.river-disclaimer').focus({preventScroll:true}));pronunciation.append(note)}
  this.details.hidden=false;this.render(0);this.positionDetails();this.emit('word_details_open');this.wake();
 }
 finishHold(pointerId){
  if(!this.holding||(pointerId!==undefined&&this.holding.pointerId!==pointerId))return;
  const elapsed=performance.now()-this.holding.started;this.holding=null;
  if(elapsed<config.quickTapMs){this.closeTimer=setTimeout(()=>this.release(),Math.max(0,config.tapPreviewMs-elapsed))}else this.release();
 }
 release(pointerId){
  if(pointerId!==undefined&&this.holding?.pointerId!==pointerId)return;
  clearTimeout(this.closeTimer);this.holding=null;
  if(this.selected){this.emit('word_details_close');this.selected.button.setAttribute('aria-expanded','false');this.selected=null;this.details.hidden=true;this.root.classList.remove('has-selection')}
  this.focusPaused=false;this.wake();
 }
 changeTheme(){const theme=document.documentElement.dataset.theme==='death'?'death':'life';if(theme===this.theme)return;this.release();this.theme=theme;this.emit('word_mode_change');if(!this.visible){clearTimeout(this.themeTimer);this.pendingTheme=true;return}this.root.classList.add('is-changing');clearTimeout(this.themeTimer);this.themeTimer=setTimeout(()=>{this.build();this.root.classList.remove('is-changing')},reduced.matches?0:config.transitionMs)}
 wake(){
  cancelAnimationFrame(this.frame);this.last=0;if(!this.visible||document.hidden||reduced.matches){this.render(0);return}
  const tick=now=>{const dt=this.last?Math.min(64,now-this.last)/1000:0;this.last=now;this.render(dt);if(this.velocity>0||!(this.selected||this.focusPaused))this.frame=requestAnimationFrame(tick)};this.frame=requestAnimationFrame(tick);
 }
 render(dt){
  const p=config[this.theme],target=this.selected||this.focusPaused?0:1;this.velocity+=(target-this.velocity)*Math.min(1,dt*14);if(!target&&this.velocity<.002)this.velocity=0;
  for(const row of this.rows){
   if(!reduced.matches)row.phase+=(row.index?-1:1)*((this.flowIndex||0)%2?-1:1)*p.speed*dt*this.velocity;
   for(const item of row.items){
    const x=mod(item.offset+row.phase+190,row.total)-190;item.x=x;if(reduced.matches)continue;
    const u=x/Math.max(1,this.width),first=this.wave(x,0),branch=row.index?(first.sine>=0?0:1):(first.sine>=0?1:0),wave=this.wave(x,branch),crest=Math.abs(wave.sine);
    const edge=smooth(Math.min(u,1-u)/config.edgeWidth);const interior=p.minScale+(p.maxScale-p.minScale)*crest;
    let scale=config.edgeScale+(interior-config.edgeScale)*edge,sx=scale*(1+p.stretch*crest),sy=scale;
    let rotation=clamp(Math.atan(wave.slope)*180/Math.PI,-p.rotation,p.rotation),y=wave.y+(row.index?1:-1)*(item.height*sy/2+Math.abs(Math.sin(rotation*Math.PI/180))*item.width*sx/2+13);
    const bend=frameDeflection(x,y,item.height*sy/2,this.frames||[]);let bendX=bend.dx,skew=bend.skew;sx*=bend.sx;sy*=bend.sy;y+=bend.dy;
    if(this.selected===item){sx=item.sx;sy=item.sy;rotation=item.rotation;y=item.y;bendX=item.bendX;skew=item.skew}
    const ease=dt?Math.min(1,dt*11):1;item.sx+=(sx-item.sx)*ease;item.sy+=(sy-item.sy)*ease;item.rotation+=(rotation-item.rotation)*ease;item.y+=(y-item.y)*ease;item.bendX+=(bendX-item.bendX)*ease;item.skew+=(skew-item.skew)*ease;

   }
  }
  if(reduced.matches)return;
  // Keep the two word currents legible where the red threads cross.
  const bounds=item=>{const angle=Math.abs(item.rotation)*Math.PI/180;return {w:item.width*item.sx*Math.cos(angle)+item.height*item.sy*Math.sin(angle),h:item.height*item.sy*Math.cos(angle)+item.width*item.sx*Math.sin(angle)}};
  const upper=this.rows[0].items.filter(item=>item.x>-200&&item.x<this.width+200),lower=this.rows[1].items.filter(item=>item.x>-200&&item.x<this.width+200);
  const shifts=new Map();
  for(const a of upper)for(const b of lower){const aa=bounds(a),bb=bounds(b),distance=Math.abs(a.x-b.x),span=(aa.w+bb.w)/2;if(distance>span+28)continue;const influence=smooth((span+28-distance)/28),gap=(aa.h+bb.h)/2+10,overlap=(gap-(b.y-a.y))*influence;if(overlap<=0)continue;shifts.set(a,Math.max(shifts.get(a)||0,overlap/2));shifts.set(b,Math.max(shifts.get(b)||0,overlap/2))}
  for(const row of this.rows)for(const item of row.items){const shift=(shifts.get(item)||0)*(row.index?1:-1),safe=safeWordPlacement({x:item.x+item.bendX,y:item.y+shift,sx:item.sx,sy:item.sy,width:item.width,height:item.height,rotation:item.rotation,skew:item.skew,stageHeight:this.height},this.frames||[]);item.button.style.transform=`translate3d(${safe.x}px,${safe.y}px,0) translate(-50%,-50%) rotate(${item.rotation}deg) skewX(${item.skew}deg) scale(${safe.sx},${safe.sy})`}
 }
}
await document.fonts.ready;
await document.fonts.load('300 38px RiverRoot');
document.querySelectorAll('[data-word-stream]').forEach(root=>new WordStream(root));
