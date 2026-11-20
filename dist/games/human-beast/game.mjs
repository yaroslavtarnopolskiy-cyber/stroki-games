import {endingCopy} from './ending-copy.mjs?v=1';
import {CardGame,collectionUrl,shareText} from './engine.mjs?v=1';
import {formatCardText} from './reading-layout.mjs?v=1';
import {alignNatureChoices} from './nature-choices.mjs?v=1';
const $=id=>document.getElementById(id),embedded=parent!==window,channel='pesni-cards';
let game,paused=true,menuOpen=false,shareUrl=location.origin+location.pathname.replace(/games\/human-beast\/.*$/,'')+'#game-human-beast',drag=null,ignoreClickUntil=0,soundEnabled=true,musicUrl='',wasPlaying=false;
const pageTurn=new Audio('assets/page-turn.mp3');pageTurn.preload='none';pageTurn.volume=.55;
let swipeIntroduced=false;
let flashTimer=0,visualAnimations=[],pendingTurn=null,settling=false,settleTimer=0;
const music=new Audio();music.loop=true;music.preload='none';music.volume=.6;
function send(type,extra={}){if(embedded)parent.postMessage({channel,type,...extra},location.origin)}
function syncAudio(){if(paused||menuOpen||document.hidden||!soundEnabled)pageTurn.pause();if(!paused&&!menuOpen&&!document.hidden&&soundEnabled&&musicUrl)music.play().catch(()=>{});else music.pause()}
function turnSound(){if(!paused&&!menuOpen&&!document.hidden&&soundEnabled){pageTurn.currentTime=0;pageTurn.play().catch(()=>{})}}
function motionAllowed(){try{return !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches&&!navigator.connection?.saveData&&(!embedded||parent.pesniConnection?.canAnimate()!==false)}catch{return false}}
function dismissSwipeGuide(){$('swipe-caption').dataset.guide='false'}
function stopVisuals(){for(const animation of visualAnimations)animation.cancel();visualAnimations=[]}
function animateIn(node,frames,options){if(!motionAllowed()||!node.animate)return;const animation=node.animate(frames,options);if(animation)visualAnimations.push(animation)}
function commitFeedback(right){const delta=game.current[right?'right':'left']?.scale||0;if(!delta)return;clearTimeout(flashTimer);$('nature-balance').dataset.flash=delta<0?'human':'bear';flashTimer=setTimeout(()=>{$('nature-balance').dataset.flash=''},360)}
function clearPreview(){$('nature-glow').style.opacity='0';$('nature-glow').dataset.nature='';$('game').dataset.direction='';$('nature-balance').dataset.preview='';$('nature-balance').style.setProperty('--pull','0');$('card').dataset.direction=''}
function preview(side,pull){$('game').dataset.direction=side;const delta=game.current[side]?.scale||0;$('nature-balance').dataset.preview=delta<0?'human':delta>0?'bear':'';$('nature-glow').dataset.nature=delta<0?'human':delta>0?'bear':'';$('nature-glow').style.opacity=String(pull);$('nature-balance').style.setProperty('--pull',String(pull));$('balance-ribbon').style.setProperty('--preview',Math.max(0,Math.min(100,game.stats+delta))+'%')}
function flushTurn(){if(!pendingTurn)return;const draw=pendingTurn;pendingTurn=null;clearTimeout(settleTimer);settling=false;draw()}
function pause(value){if(value)flushTurn();paused=value;if(value){pageTurn.pause();stopVisuals();clearTimeout(flashTimer);$('nature-balance').dataset.flash=''}drag=null;clearPreview();$('card').style.transform='';$('card').style.opacity='1';$('card').dataset.direction='';syncAudio()}
function openMenu(){flushTurn();if(!game)return;if(menuOpen){exit();return}menuOpen=true;$('finish-title').textContent=game.inEnding?'Узнай, что скрывает Костэ':'Человек или зверь';$('continue').hidden=game.current.type==='book';$('repeat').textContent='Выбрать другой путь';$('finish-copy').textContent=game.inEnding?'Открой «Маску человека» Марии Воробьи в сборнике «Песни Земли».':'Продолжишь путь Кудым-Оша?';$('finish').showModal();send('menu',{open:true});syncAudio()}
function closeMenu(){menuOpen=false;$('finish').close();send('menu',{open:false});syncAudio()}
function exit(){if(menuOpen)closeMenu();pause(true);send('exit');if(!embedded)location.assign('../../#game-human-beast')}
function render(direction=0){
 stopVisuals();clearPreview();$('card').style.transform='';$('card').style.opacity='1';$('card').dataset.dragging='false';const c=game.current,copy=endingCopy(c.type);$('story').textContent=copy?copy.text:formatCardText(c);$('ending-lead').hidden=!copy;$('ending-lead').textContent=copy?.lead||'';$('name').textContent=c.cardName||'';$('portrait').src=c.choice_number===1&&!game.inEnding?'assets/girl-figure-only-v1.png':c.portraitUrl;$('portrait').draggable=false;$('balance').value=game.stats;$('balance-ribbon').style.setProperty('--balance',game.stats+'%');
 $('card').setAttribute('aria-label',c.cardName||'Сюжетная карточка');
 const ending=(c.type||'').startsWith('ending');
 if(ending)send('screen',{screen:'result'});
 const choices=!!(c.left?.label?.trim()||c.right?.label?.trim());
 $('ending-title').hidden=!ending;$('ending-title').textContent=ending?(c.cardName||'').replace(/^Концовка:\s*/,''):'';$('next').textContent='дальше →';$('ending-actions').hidden=!ending;$('ending-read').href=collectionUrl;
 $('card').style.opacity='1';$('card').dataset.ornament=c.choice_number%2?'bear':'rhombus';$('card').dataset.mode=ending?'ending':choices?'choice':'story';$('card').dataset.opening=String(c.choice_number===1&&!game.inEnding);$('card').dataset.direction='';$('phase-title').textContent=ending?'твой выбор привёл тебя сюда':choices?'твой выбор':'история';$('hint').textContent=ending?'продолжение — в рассказе «Маска человека»':choices?'листай влево или вправо, чтобы выбирать':'коснись, чтобы продолжить';
 $('swipe-caption').dataset.guide='false';
 $('left').parentElement.hidden=!choices;$('next').hidden=choices||ending;
 $('left').textContent=c.type==='book'?'Играть заново':c.left?.label||'дальше ←';$('right').textContent=c.type==='book'?'К истории →':c.right?.label||'дальше →';
 if((c.musicName||'').toLowerCase()==='stop'){musicUrl='';music.pause()}else if(c.musicUrl&&c.musicUrl!==musicUrl){musicUrl=c.musicUrl;music.src=musicUrl}
 animateIn($('card'),[{opacity:0,transform:choices?'scale(.985)':'translateY(10px)'},{opacity:1,transform:'translate(0,0) rotate(0deg)'}],{duration:choices?300:340,easing:'cubic-bezier(.22,.61,.36,1)'});
 if(choices&&!swipeIntroduced&&c.type!=='book'){
  swipeIntroduced=true;$('swipe-caption').dataset.guide='true';
  animateIn($('card'),[{transform:'translateX(0) rotate(0)'},{transform:'translateX(14px) rotate(1.5deg)',offset:.22},{transform:'translateX(-14px) rotate(-1.5deg)',offset:.62},{transform:'translateX(0) rotate(0)'}],{delay:340,duration:1600,easing:'ease-in-out'});
 }
 syncAudio();
 if(c.type==='book'&&!menuOpen)openMenu();
}
function choose(right,swipe=false){
 if(!game||paused||menuOpen||settling||game.inEnding)return;
 const transform=$('card').style.transform||'translateX(0) rotate(0deg)',opacity=Number($('card').style.opacity||1);
 const currentX=Number(transform.match(/translateX\(([-\d.]+)px\)/)?.[1]||0),exitDistance=Math.max(400,$('card').clientWidth*1.3,Math.abs(currentX)+$('card').clientWidth*.8);
 turnSound();commitFeedback(right);const result=game.choose(right);
 if(result.action==='read'){window.open(collectionUrl,'_blank','noopener,noreferrer');return}
 if(swipe&&motionAllowed()&&$('card').animate){
  settling=true;pendingTurn=()=>render(right?1:-1);const draw=pendingTurn;const finishThis=()=>{if(pendingTurn===draw)flushTurn()};
  const animation=$('card').animate([{transform,opacity},{transform:`translateX(${(right?1:-1)*exitDistance}px) rotate(${right?14:-14}deg)`,opacity:0}],{duration:155,easing:'cubic-bezier(.25,.46,.45,.94)',fill:'forwards'});
  if(animation)visualAnimations.push(animation);
  if(animation?.finished?.then){animation.finished.then(finishThis).catch(()=>{});settleTimer=setTimeout(finishThis,210)}else flushTurn();
 }else render(right?1:-1);
}
$('next').addEventListener('click',()=>{if(performance.now()>ignoreClickUntil)choose(true)});
function restartStory(){flushTurn();game.restart();swipeIntroduced=false;if(menuOpen)closeMenu();render()}
$('ending-read').addEventListener('click',event=>{if(paused||menuOpen||performance.now()<=ignoreClickUntil)event.preventDefault()});
$('ending-repeat').addEventListener('click',()=>{if(!paused&&!menuOpen)restartStory()});
$('continue').addEventListener('click',closeMenu);$('repeat').addEventListener('click',restartStory);$('exit').addEventListener('click',exit);
$('finish').addEventListener('cancel',event=>{event.preventDefault();exit()});
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'Выключить звук':'Включить звук');$('sound').setAttribute('title',soundEnabled?'Выключить звук':'Включить звук');$('sound').dataset.muted=String(!soundEnabled);syncAudio()});
$('share').addEventListener('click',async()=>{
 const text=game.inEnding&&game.current.type!=='book'?`${game.current.cardName}. ${shareText}`:shareText;
 try{if(navigator.share)await navigator.share({title:'Человек или зверь — Песни Земли',text,url:shareUrl});else {await navigator.clipboard.writeText(text+'\n'+shareUrl);$('share-status').textContent='Текст и ссылка скопированы'}}catch(error){if(error.name!=='AbortError')$('share-status').textContent='Не удалось поделиться. Попробуй ещё раз.'}
});
function control(code){
 dismissSwipeGuide();
 if(!game||paused||menuOpen||settling||game.inEnding)return;
 const choice=$('card').dataset.mode==='choice',side=code==='ArrowLeft'?'left':code==='ArrowRight'?'right':'';
 if(!choice){if(['ArrowLeft','ArrowRight','Space','Enter'].includes(code))choose(true);return}
 if(side){if($('card').dataset.direction===side){choose(side==='right');$('card').style.transform=''}else{stopVisuals();$('card').dataset.direction=side;$('game').dataset.direction=side;preview(side,1);$('card').style.transform=`translateX(${side==='left'?-22:22}px) rotate(${side==='left'?-2:2}deg)`}}
 else if(['Space','Enter'].includes(code)&&$('card').dataset.direction){choose($('card').dataset.direction==='right');$('card').style.transform=''}
}
document.addEventListener('keydown',event=>{
 if(event.code==='Escape'&&!menuOpen&&!paused){event.preventDefault();openMenu();return}
 if(paused||menuOpen||event.repeat||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
 if(['Space','Enter'].includes(event.code)&&event.target.closest('button,a'))return;
 if(['ArrowLeft','ArrowRight','Space','Enter'].includes(event.code)){event.preventDefault();control(event.code)}
});
const card=$('card');
card.addEventListener('pointerdown',event=>{if(paused||menuOpen||settling||event.button!==0||event.target.closest('button,a'))return;dismissSwipeGuide();stopVisuals();drag={id:event.pointerId,x:event.clientX,y:event.clientY,choice:card.dataset.mode==='choice',started:performance.now()};card.setPointerCapture(event.pointerId)});
card.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id||!drag.choice)return;const x=event.clientX-drag.x,y=event.clientY-drag.y;if(Math.abs(x)>Math.abs(y)&&Math.abs(x)>8){event.preventDefault();card.dataset.dragging='true';card.dataset.direction=x<0?'left':'right';preview(card.dataset.direction,Math.min(1,Math.abs(x)/Math.max(36,Math.min(62,card.clientWidth*.13))));card.style.transform=`translateX(${x*.96}px) rotate(${Math.max(-12,Math.min(12,x/28))}deg)`;card.style.opacity=String(Math.max(.08,1-Math.abs(x)/(card.clientWidth*.8)))}});
card.addEventListener('pointerup',event=>{
 if(!drag||event.pointerId!==drag.id)return;
 const dx=event.clientX-drag.x,dy=event.clientY-drag.y,choice=drag.choice,elapsed=performance.now()-drag.started;
 drag=null;card.dataset.dragging='false';
 const flick=elapsed>0&&elapsed<240&&Math.abs(dx)>24&&Math.abs(dx)/elapsed>.55;
 if(choice&&Math.abs(dx)>Math.abs(dy)&&(Math.abs(dx)>Math.max(36,Math.min(62,card.clientWidth*.13))||flick)){
  ignoreClickUntil=performance.now()+300;choose(dx>0,true);return;
 }
 clearPreview();card.style.transform='';card.style.opacity='1';
 if(!choice&&((Math.abs(dx)<12&&Math.abs(dy)<12)||(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))))choose(true);
});
card.addEventListener('dragstart',event=>event.preventDefault());
card.addEventListener('pointercancel',()=>{drag=null;card.dataset.dragging='false';clearPreview();card.style.transform='';card.style.opacity='1'});
window.addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==location.origin||event.data?.channel!==channel)return;
 const m=event.data;
 if(m.type==='configure'){try{const u=new URL(m.shareUrl);if(u.origin===location.origin)shareUrl=u.href}catch{}}
 if(m.type==='resume')pause(false);
 if(m.type==='pause')pause(true);
 if(m.type==='finish')openMenu();
 if(m.type==='exit')exit();
 if(m.type==='control')control(m.code);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){wasPlaying=!paused;pause(true)}else if(wasPlaying&&!embedded){pause(false);wasPlaying=false}syncAudio()});
try{const response=await fetch('./cards.json?v=1');if(!response.ok)throw Error('Карточки недоступны');game=new CardGame(alignNatureChoices(await response.json()));render();if(!embedded)pause(false);send('ready')}catch(error){$('error').hidden=false;$('error').textContent='Не удалось загрузить игру. Проверь соединение и попробуй ещё раз.';send('error',{message:$('error').textContent})}
