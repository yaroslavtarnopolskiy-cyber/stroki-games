/* One bridge for landing events → Yandex.Metrika. No tracking requests outside Metrika. */
(() => {
 const counter=89251519;
 const allowed=new Set(['word_stream_view','word_click','word_details_open','word_details_close','word_mode_change','album_promo_view','album_promo_click','story_quiz_answer','story_quiz_answer_change','story_quiz_complete','story_quiz_result_view','story_quiz_book_click','story_carousel_select','story_carousel_swipe','story_share_preview','story_share_complete','story_share_copy','story_card_save']);
 const fields=new Set(['stream_id','word_id','word','language','pronunciation_status','section','album','artist','placement','answers','recommended_story_id','focused_story_id','question_id','answer_id','story_id','method']);
 function goal(name,params={}){
  const clean={theme:document.documentElement.dataset.theme||'life',environment:location.hostname==='landings.stroki.mts.ru'?'prod':location.hostname==='landings.rc.stage.books.mts.ru'?'rc':'preview',...params};
  try{if(typeof window.ym==='function')window.ym(counter,'reachGoal',name,clean)}catch{}
 }
 document.addEventListener('pesni:analytics',event=>{
  const d=event.detail;if(!d||!allowed.has(d.name))return;
  const params={};for(const [key,value] of Object.entries(d))if(fields.has(key)&&(typeof value==='string'||typeof value==='number'||Array.isArray(value)))params[key]=value;
  goal(d.name,params);
 });
 document.addEventListener('pesni:land-selected',e=>{if(e.detail?.land)goal('land_open',{land_id:e.detail.land})});
 document.addEventListener('click',e=>{
  const el=e.target.closest?.('a,button');if(!el)return;
  const section=el.closest('section')?.id||'header';
  if(el.matches('[data-set-theme]'))goal('theme_change',{to:el.dataset.setTheme,section});
  if(el.matches('.runner-launch'))goal('game_launch_click',{game_id:section});
  if(el.matches('.runner-toggle'))goal('game_pause_click',{game_id:section});
  if(el.matches('.runner-pause'))goal('game_continue_click',{game_id:section});
  if(el.matches('.runner-close'))goal('game_close_click',{game_id:section});
  if(el.matches('.sound-button'))goal('music_toggle_click',{to:el.getAttribute('aria-pressed')==='true'?'pause':'play'});
  if(el.matches('.hero-bottom a,.hero-bottom button,[data-section],[data-go]'))goal('navigation_click',{section,target:el.dataset.section||el.dataset.go||el.getAttribute('href')});
  if(el.tagName!=='A'||el.matches('.matcher-read'))return;
  let url;try{url=new URL(el.href)}catch{return}
  if(url.hostname==='mtsbooks.onelink.me')goal(url.pathname.endsWith('/t75hb4td')?'collection_read_click':'story_read_click',{section,story_link:url.pathname,placement:el.closest('footer')?'footer':section});
  if(el.closest('.co-brand')&&url.origin!==location.origin)goal('partner_click',{section,partner:el.getAttribute('aria-label')||el.textContent.trim()});
 });
 const games=new Map([['pesni-runner','games'],['pesni-gifts','game-gifts'],['pesni-cards','game-human-beast']]);
 const seenReady=new WeakSet();
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!games.has(e.data?.channel))return;
  const id=games.get(e.data.channel),frame=document.querySelector('#'+id+' iframe');
  if(!frame||e.source!==frame.contentWindow)return;
  const m=e.data,params={game_id:id};
  if(m.type==='ready'&&!seenReady.has(e.source)){seenReady.add(e.source);goal('game_ready',params)}
  if(m.type==='error')goal('game_load_error',params);
  if(m.type==='restarting'){seenReady.delete(e.source);goal('game_restart',params)}
  if(m.type==='exit')goal('game_exit',params);
  if(m.type==='menu'&&m.open)goal('game_menu_open',params);
  if(m.type==='screen'&&['result','final'].includes(m.screen))goal('game_result_view',{...params,screen:m.screen});
 });
})();
