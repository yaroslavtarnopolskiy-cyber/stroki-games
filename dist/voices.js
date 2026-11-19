(function(){
const storyUrls={'komi': 'https://mtsbooks.onelink.me/zdZb/2y5x9p54', 'kalyazin': 'https://mtsbooks.onelink.me/zdZb/jce0jbvp', 'chuvashia': 'https://mtsbooks.onelink.me/zdZb/j74qgr6x', 'caucasus': 'https://mtsbooks.onelink.me/zdZb/2ui31gw4', 'moscow': 'https://mtsbooks.onelink.me/zdZb/t8zxvuww', 'udmurtia': 'https://mtsbooks.onelink.me/zdZb/53p6oe0h', 'kazan': 'https://mtsbooks.onelink.me/zdZb/y2t4ofj7'};
const lands=[
{id:'komi',name:'Урал',x:1200,y:180,question:'В тебе живут человек и зверь. Кто из них однажды возьмёт верх?',description:'Богатырь страдает от своей двойственной природы и хочет жениться на человеческой девушке, чтобы обуздать животную сущность.',story:'«Маска человека» · Мария Воробьи'},
{id:'kalyazin',name:'Калязин',x:360,y:240,question:'Новая жизнь — по ту сторону болота. Осмелишься пойти?',description:'1654 год. Вокруг свирепствует мор, а в болотах близ Калязина, по преданию, спрятаны древние сокровища.',story:'«Сладки ягоды, да смертью пахнут» · Екатерина Звонцова'},
{id:'chuvashia',name:'Чувашия',x:720,y:520,question:'Чтобы спасти целую деревню, придётся пожертвовать собой. Согласишься?',description:'Деревне грозит засуха. Чтобы вернуть милость реки, жителям придётся обратиться к древнему обряду.',story:'«Свадьба воды» · Анна Кавалли'},
{id:'caucasus',name:'Кавказ',x:480,y:830,question:'Тебе говорят: отпусти его. А ты сможешь?',description:'После смерти мужа Амипат остаётся один на один с чужими обвинениями. В поисках ответов она отправляется к чудесному рынку.',story:'«Ради тебя, любовь-нелюбовь» · Денис Лукьянов'},
{id:'moscow',name:'Подмосковье',x:420,y:500,question:'Если тебе предложат прикоснуться к запретным знаниям — согласишься?',description:'1735 год. В усадьбе Якова Брюса, чернокнижника и бывшего сподвижника Петра I, переплетаются тайны прошлого и поиски запретных знаний.',story:'«Где деревья до небес» · Наталия Осояну'},
{id:'udmurtia',name:'Удмуртия',x:1090,y:440,question:'Если судьбу за тебя решили другие, хватит ли смелости спорить?',description:'Италмас любит одного человека, но её судьбу решили за неё. Когда люди не оставляют ей выбора, она обращается к лесу, реке и земле.',story:'«Останешься со мной» · Дарина Стрельченко'},
{id:'kazan',name:'Татарстан',x:1040,y:690,question:'Если твой дом в опасности, а помощи ждать неоткуда — на что решишься?',description:'1552 год. Казань в осаде. Молодой мурза ищет способ защитить родную землю и её сокровища.',story:'«Золотая казна» · Юлия Шляпникова'}
];
const deathQuestions={
 komi:'Сможешь ли ты снять маску перед тем, кого любишь?',
 kalyazin:'Вокруг мор, а тебе протягивают горсть сладких ягод. Возьмёшь?',
 chuvashia:'Тебе предстоит стать женихом реки. Попытаешься избежать этой участи?',
 caucasus:'Если все скажут, что ты виновата, — поверишь им?',
 moscow:'Если тебе предложат разгадать тайну смерти — согласишься?',
 udmurtia:'Сможешь ли ты жить без любви?',
 kazan:'Если спасение родной земли потребует самого дорогого — отдашь?'
};
const landGames={komi:[['Добеги до любимой','games'],['Человек или зверь','game-human-beast']],caucasus:[['Три дара','game-gifts']]};
const gameLinks=document.createElement('nav');gameLinks.className='land-games';gameLinks.setAttribute('aria-label','Игры по этой истории');gameLinks.hidden=true;document.querySelector('.land-copy').append(gameLinks);
let worldMode='life';
try{worldMode=localStorage.getItem('pesni-theme')==='death'?'death':'life'}catch{}
let selected=-1;
document.querySelector('.land-panel').hidden=true;
document.querySelector('.composition').classList.add('awaiting-selection');
const markers=document.querySelector('#markers'),dots=document.querySelector('#overview-dots');
// Keep the approved sheet drawings intact; SVG viewports isolate each object.
const engravingCrops={"komi": [25, 30, 380, 400], "kalyazin": [435, 25, 320, 410], "chuvashia": [727, 60, 430, 365], "caucasus": [1200, 0, 310, 435], "moscow": [45, 505, 470, 430], "udmurtia": [555, 515, 420, 420], "kazan": [1015, 525, 485, 410]};
function engravingIcon(id){
 const [x,y,w,h]=engravingCrops[id];
 if(id==='udmurtia') return `<svg viewBox="0 0 1200 1320" aria-hidden="true" class="engraved-marker italmas-marker"><image class="engraving-life" href="map-study/assets/markers/udmurtia-italmas.png" width="1200" height="1320"/><image class="engraving-death" href="map-study/assets/markers/udmurtia-italmas.png" width="1200" height="1320"/></svg>`;
 return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" class="engraved-marker"><image class="engraving-life" href="map-study/assets/markers/${id}-life-baked.webp" width="${w}" height="${h}"/><image class="engraving-death" href="map-study/assets/markers/${id}-death-baked.webp" width="${w}" height="${h}"/></svg>`;
}

lands.forEach((land,index)=>{const marker=document.createElement('button');marker.className='marker';marker.style.left=land.x/1536*100+'%';marker.style.top=land.y/1024*100+'%';marker.setAttribute('aria-label',`${String(index+1).padStart(2,'0')}. ${land.name}`);marker.setAttribute('aria-controls','land-title');marker.setAttribute('aria-pressed','false');marker.dataset.index=index;marker.innerHTML=`<span class="marker-symbol">${engravingIcon(land.id)}<span class="marker-number">${String(index+1).padStart(2,'0')}</span></span><span class="marker-label">${land.name}</span>`;marker.addEventListener('click',()=>select(index,true));markers.append(marker);const dot=document.createElement('span');dot.className='map-dot';dot.style.left=marker.style.left;dot.style.top=marker.style.top;dots.append(dot)});
// One gentle invitation, only when the map first comes into view; no selection is made.
if('IntersectionObserver' in window){
 const mapHint=new IntersectionObserver(entries=>{
  if(!entries.some(entry=>entry.isIntersecting))return;
  mapHint.disconnect();
  if((matchMedia('(prefers-reduced-motion: reduce)').matches||window.pesniConnection?.canAnimate()===false)||markers.querySelector('[aria-pressed="true"]'))return;
  const symbol=markers.querySelector('[data-index="2"] .marker-symbol');
  symbol?.animate([{transform:'scale(1)'},{transform:'scale(1.16)',offset:.45},{transform:'scale(1)'}],{duration:1300,easing:'ease-in-out'});
 },{threshold:.45});
 mapHint.observe(markers);
}

// A soft, irregular flood front spreads from the chosen place inside its region.
const mapSvg=document.querySelector('.selection-art');
const mapDefs=mapSvg.querySelector('defs');
mapDefs.insertAdjacentHTML('beforeend',`<radialGradient id="water-front"><stop offset="0" stop-color="white"/><stop offset=".72" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><filter id="water-ripple" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".012 .018" numOctaves="2" seed="8" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter>`);
// SVG masks affect painting, but do not exclude transparent pixels from hit testing.
const landSilhouette = document.querySelector('.map-life-image');
let landPixels;
mapSvg.parentElement.addEventListener('click', event => {
 if (event.target.closest('button') || !landSilhouette.naturalWidth) return;
 const point = new DOMPoint(event.clientX,event.clientY).matrixTransform(mapSvg.getScreenCTM().inverse());
 const x = Math.floor(point.x), y = Math.floor(point.y);
 if (x < 0 || x >= 1536 || y < 0 || y >= 1024) return;
 if (!landPixels) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1024;
  const context = canvas.getContext('2d', {willReadFrequently:true});
  context.drawImage(landSilhouette, 0, 0, canvas.width, canvas.height);
  landPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
 }
 if (landPixels[(y * 1536 + x) * 4 + 3] < 32) return;
 const index = lands.findIndex(land => waterRegions.get(land.id).isPointInFill(point));
 if (index >= 0) select(index, true);
});
const waterCircles=new Map(),waterRegions=new Map();
lands.forEach(land=>{
 const ns='http://www.w3.org/2000/svg';
 const region=mapSvg.querySelector('[data-land="'+land.id+'"]');
 const bounds=region.getBBox(),padding=32;
 // Fixed filter bounds prevent an expanding circle from allocating an enormous offscreen bitmap.
 const filter=mapDefs.querySelector('#water-ripple').cloneNode(true);
 filter.id='water-ripple-'+land.id;filter.setAttribute('filterUnits','userSpaceOnUse');
 for(const [key,value] of Object.entries({x:bounds.x-padding,y:bounds.y-padding,width:bounds.width+2*padding,height:bounds.height+2*padding}))filter.setAttribute(key,value);
 mapDefs.append(filter);
 waterRegions.set(land.id,region);
 const mask=document.createElementNS(ns,'mask');
 mask.id='water-'+land.id;
 mask.setAttribute('maskUnits','userSpaceOnUse');
 for(const [key,value] of Object.entries({x:bounds.x-padding,y:bounds.y-padding,width:bounds.width+2*padding,height:bounds.height+2*padding}))mask.setAttribute(key,value);
 mask.style.maskType='alpha';
 const circle=document.createElementNS(ns,'circle');
 circle.setAttribute('cx',land.x);circle.setAttribute('cy',land.y);
 circle.setAttribute('r','0');circle.setAttribute('fill','url(#water-front)');
 circle.setAttribute('filter','url(#'+filter.id+')');
 mask.append(circle);mapDefs.append(mask);
 region.setAttribute('mask','url(#'+mask.id+')');
 waterCircles.set(land.id,circle);
});
let waterFrame=0, floodedLand=null;
function floodRegion(id){
 if(id===floodedLand)return;
 floodedLand=id;cancelAnimationFrame(waterFrame);
 const circle=waterCircles.get(id);
 const region=waterRegions.get(id);region.setAttribute('mask','url(#water-'+id+')');
 const land=lands.find(item=>item.id===id);
 const extent=Math.hypot(Math.max(land.x,1536-land.x),Math.max(land.y,1024-land.y))*1.45;
 if((matchMedia('(prefers-reduced-motion: reduce)').matches||window.pesniConnection?.canAnimate()===false)){circle.setAttribute('r',extent);region.removeAttribute('mask');return}
 circle.setAttribute('r','0');
 const started=performance.now();
 function frame(now){
  const t=Math.min(1,(now-started)/1450);
  // Ease gently into the flood, then let the water settle at its boundary.
  const eased=t*t*(3-2*t);
  circle.setAttribute('r',extent*eased);
  if(t<1)waterFrame=requestAnimationFrame(frame);else region.removeAttribute('mask');
 }
 waterFrame=requestAnimationFrame(frame);
}
function select(index,focusStory=false){document.querySelector('.land-panel').hidden=false;document.querySelector('.composition').classList.remove('awaiting-selection');selected=(index+lands.length)%lands.length;const land=lands[selected];floodRegion(land.id);const artwork=document.querySelector('#land-artwork');const artDescriptions={kazan:'Извивающийся змей с тонкими усиками и фактурной чешуёй',moscow:'Парусный корабль с наполненными парусами на завитках волн',caucasus:'Женский профиль с круглым височным украшением и длинными подвесками',chuvashia:'Женская фигура с текучими волосами и силуэтом воды, кувшинки у основания',kalyazin:'Девушка с длинной косой в полный рост, держащая серп за спиной',udmurtia:'Робкий шаг женских ног среди крупных цветов, лоза вдоль щиколотки',komi:'Лицо мужчины в медвежьей маске, фактурная печатная графика'};artwork.hidden=!artDescriptions[land.id];document.querySelector('.land-card').classList.toggle('has-artwork',!artwork.hidden);if(!artwork.hidden){const illustration=document.querySelector('#land-illustration');illustration.src='map-study/assets/'+land.id+'-'+worldMode+(land.id==='kalyazin'&&worldMode==='life'?'-v2':'')+'.webp';illustration.alt=artDescriptions[land.id];illustration.removeAttribute('width');illustration.removeAttribute('height')};document.querySelector('#counter').textContent=`${String(selected+1).padStart(2,'0')} / 07`;document.querySelector('#land-title').textContent=land.name;document.querySelector('#question').textContent=worldMode==='death'?deathQuestions[land.id]:land.question;document.querySelector('#description').textContent=land.description;document.querySelector('#story').textContent=land.story;const storyLink=document.querySelector('.story-link');storyLink.href=storyUrls[land.id];storyLink.setAttribute('aria-label','Читать '+land.story);gameLinks.replaceChildren(...(landGames[land.id]||[]).map(([label,id])=>{const a=document.createElement('a');a.href='#'+id;a.textContent=label+' ↗';return a}));gameLinks.hidden=!landGames[land.id];document.querySelectorAll('.land-region').forEach(region=>region.classList.toggle('selected',region.dataset.land===land.id));document.querySelectorAll('[data-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.index)===selected)));if(focusStory)document.dispatchEvent(new CustomEvent('pesni:land-selected',{detail:{land:land.id}}))}
const regionCard=document.querySelector('.land-story-focus');
let regionTransition;
window.createRegionSwipe?.({element:regionCard,canSwipe:()=>selected>=0&&matchMedia('(max-width:760px), (pointer:coarse)').matches,onSwipe:direction=>{
 select(selected+direction);
 regionTransition?.cancel();
 if(window.pesniConnection?.canAnimate()!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches)regionTransition=regionCard.animate([{opacity:.65,transform:`translateX(${direction*12}px)`},{opacity:1,transform:'translateX(0)'}],{duration:180,easing:'ease-out'});
}});
document.querySelector('#land-illustration').draggable=false;
document.querySelector('#previous').addEventListener('click',()=>select(selected-1,true));document.querySelector('#next').addEventListener('click',()=>select(selected+1,true));document.querySelector('#view-toggle').addEventListener('click',event=>{const overview=document.querySelector('.map-viewport').classList.toggle('overview');event.currentTarget.setAttribute('aria-pressed',String(overview));event.currentTarget.textContent=overview?'К землям':'Общий вид'});


// A single cubic path changes shape continuously; the trailing border stays thin.
const switchShapes={"life": [-12, 70, 0, 110, -12, 165, 30, 210, 68, 245, 94, 350, 95, 373, 95, 392, 76, 392, 53], "death": [53, 8, 76, 27, 95, 50, 95, 155, 94, 190, 68, 235, 30, 290, -12, 330, 0, 400, -12]};
let flowCoordinates=[...switchShapes[worldMode]], flowFrame=0, switchReady=false;
const fadeShapes={life:[1,1,1,0,0],death:[0,0,1,1,1]};
let flowOpacity=[...fadeShapes[worldMode]];
const flowFadeStops=[...document.querySelectorAll('.flow-fade-stop')];
function applyFlowFade(values){flowFadeStops.forEach((stop,i)=>stop.setAttribute('stop-opacity',values[i%values.length]))}
function flowPath(a){return 'M 0 '+a[0]+' C '+[1,7,13].map(i=>a.slice(i,i+6).join(' ')).join(' C ')+' L 400 108 H 0 Z'}
const inViewSwitches=new Set();
if('IntersectionObserver' in window){
 const switchVisibility=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)inViewSwitches.add(entry.target);else inViewSwitches.delete(entry.target)}},{rootMargin:'40px'});
 document.querySelectorAll('.flow-liquid').forEach(shape=>switchVisibility.observe(shape));
}
function visibleSwitchShapes(){return [...inViewSwitches]}

function animateSwitchShape(mode,visible){
 const allShapes=[...document.querySelectorAll('.flow-liquid')];
 // Morph only switches in view; synchronize the others once at completion.
 const shapes=visible||visibleSwitchShapes();
 const visibleStops=flowFadeStops.filter(stop=>shapes.some(shape=>shape.ownerSVGElement===stop.ownerSVGElement));
 const applyShape=(coordinates,all=false)=>{const d=flowPath(coordinates);(all?allShapes:shapes).forEach(shape=>shape.setAttribute('d',d))};
 const applyVisibleFade=values=>visibleStops.forEach((stop,i)=>stop.setAttribute('stop-opacity',values[i%values.length]));
 cancelAnimationFrame(flowFrame);
 const from=[...flowCoordinates],to=switchShapes[mode];
 const fadeFrom=[...flowOpacity],fadeTo=fadeShapes[mode];
 const duration=switchReady&&!(matchMedia('(prefers-reduced-motion: reduce)').matches||window.pesniConnection?.canAnimate()===false)?360:0;
 switchReady=true;
 if(!duration){flowCoordinates=[...to];flowOpacity=[...fadeTo];applyFlowFade(flowOpacity);applyShape(to,true);return}
 const start=performance.now();
 function frame(now){const t=Math.min(1,(now-start)/duration);const e=1-Math.pow(1-t,3);flowCoordinates=from.map((v,i)=>v+(to[i]-v)*e);applyShape(flowCoordinates);flowOpacity=fadeFrom.map((v,i)=>v+(fadeTo[i]-v)*e);applyVisibleFade(flowOpacity);if(t<1)flowFrame=requestAnimationFrame(frame);else{applyShape(to,true);applyFlowFade(flowOpacity)}}
 flowFrame=requestAnimationFrame(frame);
}

function setWorldMode(mode){
 const nextMode=mode==='death'?'death':'life';
 if(switchReady&&worldMode===nextMode)return;
 const visible=visibleSwitchShapes();
 worldMode=nextMode;
 document.documentElement.dataset.worldMode=worldMode;
 animateSwitchShape(worldMode,visible);
 document.querySelectorAll('[data-map-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapMode===worldMode)));
 if(window.setSiteTheme&&document.documentElement.dataset.theme!==worldMode)window.setSiteTheme(worldMode);
 try{localStorage.setItem('pesni-theme',worldMode)}catch{}
 if(selected>=0)select(selected);
}
document.querySelectorAll('[data-map-mode]').forEach(button=>button.addEventListener('click',()=>setWorldMode(button.dataset.mapMode)));
window.addEventListener('storage',event=>{if(event.key==='pesni-theme')setWorldMode(event.newValue)});
window.setMapWorldMode=setWorldMode;
setWorldMode(worldMode);

})();
