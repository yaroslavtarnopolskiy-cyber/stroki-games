const lands=[
{id:'komi',name:'Коми-Пермь / Урал',x:1200,y:180,question:'Можно ли быть собой, если в тебе живут две разные природы?',description:'В Кудым-Оше живут две природы — человеческая и звериная. И ни одну из них невозможно просто оставить позади.',story:'«Маска человека» · Мария Воробьи'},
{id:'kalyazin',name:'Калязин',x:360,y:240,question:'Новая жизнь — по ту сторону болота. Осмелишься пойти?',description:'1654 год. Вокруг свирепствует мор, а в болотах близ Калязина, по преданию, спрятаны древние сокровища.',story:'«Сладки ягоды, да смертью пахнут» · Екатерина Звонцова'},
{id:'chuvashia',name:'Чувашия',x:720,y:520,question:'Если на кону целая деревня, а расплачиваться придётся тебе — согласишься?',description:'Деревне грозит засуха. Чтобы вернуть милость реки, жителям придётся обратиться к древнему обряду.',story:'«Свадьба воды» · Анна Кавалли'},
{id:'caucasus',name:'Кавказ',x:480,y:830,question:'Тебе говорят: отпусти его. А ты сможешь?',description:'После смерти мужа Амипат остаётся один на один с чужими обвинениями. В поисках ответов она отправляется к чудесному рынку.',story:'«Ради тебя, любовь-нелюбовь» · Денис Лукьянов'},
{id:'moscow',name:'Подмосковье',x:420,y:500,question:'Если прошлое однажды заговорит с тобой — станешь слушать?',description:'1735 год. В усадьбе Якова Брюса прошлое, слухи о колдовстве и запретные знания оказываются теснее связаны, чем кажется.',story:'«Где деревья до небес» · Наталия Осояну'},
{id:'udmurtia',name:'Удмуртия',x:1090,y:440,question:'Что делать, когда свою жизнь выбрать нельзя?',description:'Италмас любит одного человека, но её судьбу решили за неё. Когда люди не оставляют ей выбора, она обращается к лесу, реке и земле.',story:'«Останешься со мной» · Дарина Стрельченко'},
{id:'kazan',name:'Казань / Татарстан',x:1040,y:690,question:'Если твой дом в опасности, а помощи ждать неоткуда — на что решишься?',description:'1552 год. Казань в осаде. Молодой мурза ищет способ защитить родную землю и её сокровища.',story:'«Золотая казна» · Юлия Шляпникова'}
];
const deathQuestions={
 komi:'Если все отвернутся, когда увидят тебя настоящего, — снимешь маску?',
 kalyazin:'Вокруг мор, а тебе протягивают горсть сладких ягод. Возьмёшь?',
 chuvashia:'Если река потребует расплаты за чужую смерть — станешь искать виновного?',
 caucasus:'Если все скажут, что ты виновата, — поверишь им?',
 moscow:'Если перед тобой откроется запретное — осмелишься посмотреть?',
 udmurtia:'Если лес предложит тебе другой путь, но промолчит о цене — пойдёшь?',
 kazan:'Если спасение родной земли потребует самого дорогого — отдашь?'
};
let worldMode='life';
try{worldMode=localStorage.getItem('pesni-theme')==='death'?'death':'life'}catch{}
let selected=-1;
document.querySelector('.land-panel').hidden=true;
document.querySelector('.composition').classList.add('awaiting-selection');
const markers=document.querySelector('#markers'),list=document.querySelector('#land-list'),dots=document.querySelector('#overview-dots');
// Keep the approved sheet drawings intact; SVG viewports isolate each object.
const engravingCrops={"komi": [25, 30, 380, 400], "kalyazin": [435, 25, 320, 410], "chuvashia": [727, 60, 430, 365], "caucasus": [1200, 0, 310, 435], "moscow": [45, 505, 470, 430], "udmurtia": [555, 515, 420, 420], "kazan": [1015, 525, 485, 410]};
document.body.insertAdjacentHTML('afterbegin',`<svg width="0" height="0" aria-hidden="true" style="position:absolute;pointer-events:none"><defs><filter id="engraving-life" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.2126 -.7152 -.0722 1 0"/></filter><filter id="engraving-death" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .2126 .7152 .0722 -.067 0"/></filter></defs></svg>`);
function engravingIcon(id){
 const [x,y,w,h]=engravingCrops[id];
 const clip=id==='kalyazin'?'<path d="M435 25H755V155H705V435H435Z"/>':`<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
 return `<svg viewBox="${x} ${y} ${w} ${h}" aria-hidden="true" class="engraved-marker"><defs><clipPath id="engraving-crop-${id}" clipPathUnits="userSpaceOnUse">${clip}</clipPath></defs><g clip-path="url(#engraving-crop-${id})"><image class="engraving-life" href="assets/markers/engraved-sheet-life-v1.png" width="1536" height="1024" filter="url(#engraving-life)"/><image class="engraving-death" href="assets/markers/engraved-sheet-death-v1.png" width="1536" height="1024" filter="url(#engraving-death)"/></g></svg>`;
}

lands.forEach((land,index)=>{const marker=document.createElement('button');marker.className='marker';marker.style.left=land.x/1536*100+'%';marker.style.top=land.y/1024*100+'%';marker.setAttribute('aria-label',`${String(index+1).padStart(2,'0')}. ${land.name}`);marker.setAttribute('aria-controls','land-title');marker.setAttribute('aria-pressed','false');marker.dataset.index=index;marker.innerHTML=`<span class="marker-symbol">${engravingIcon(land.id)}<span class="marker-number">${String(index+1).padStart(2,'0')}</span></span><span class="marker-label">${land.name}</span>`;marker.addEventListener('click',()=>select(index));markers.append(marker);const choice=document.createElement('button');choice.className='land-choice';choice.dataset.index=index;choice.setAttribute('aria-pressed','false');choice.innerHTML=`<small>${String(index+1).padStart(2,'0')}</small><span>${land.name}</span>`;choice.addEventListener('click',()=>select(index));list.append(choice);const dot=document.createElement('span');dot.className='map-dot';dot.style.left=marker.style.left;dot.style.top=marker.style.top;dots.append(dot)});
// A soft, irregular flood front spreads from the chosen place inside its region.
const mapSvg=document.querySelector('.selection-art');
const mapDefs=mapSvg.querySelector('defs');
mapDefs.insertAdjacentHTML('beforeend',`<radialGradient id="water-front"><stop offset="0" stop-color="white"/><stop offset=".72" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><filter id="water-ripple" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".012 .018" numOctaves="2" seed="8" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter>`);
const waterCircles=new Map();
lands.forEach(land=>{
 const ns='http://www.w3.org/2000/svg';
 const mask=document.createElementNS(ns,'mask');
 mask.id='water-'+land.id;
 mask.setAttribute('maskUnits','userSpaceOnUse');
 mask.setAttribute('x','-100');mask.setAttribute('y','-100');
 mask.setAttribute('width','1736');mask.setAttribute('height','1224');
 mask.style.maskType='alpha';
 const circle=document.createElementNS(ns,'circle');
 circle.setAttribute('cx',land.x);circle.setAttribute('cy',land.y);
 circle.setAttribute('r','0');circle.setAttribute('fill','url(#water-front)');
 circle.setAttribute('filter','url(#water-ripple)');
 mask.append(circle);mapDefs.append(mask);
 mapSvg.querySelector('[data-land="'+land.id+'"]').setAttribute('mask','url(#'+mask.id+')');
 waterCircles.set(land.id,circle);
});
let waterFrame=0, floodedLand=null;
function floodRegion(id){
 if(id===floodedLand)return;
 floodedLand=id;cancelAnimationFrame(waterFrame);
 const circle=waterCircles.get(id);
 const land=lands.find(item=>item.id===id);
 const extent=Math.hypot(Math.max(land.x,1536-land.x),Math.max(land.y,1024-land.y))*1.45;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){circle.setAttribute('r',extent);return}
 circle.setAttribute('r','0');
 const started=performance.now();
 function frame(now){
  const t=Math.min(1,(now-started)/1450);
  // Ease gently into the flood, then let the water settle at its boundary.
  const eased=t*t*(3-2*t);
  circle.setAttribute('r',extent*eased);
  if(t<1)waterFrame=requestAnimationFrame(frame);
 }
 waterFrame=requestAnimationFrame(frame);
}
function select(index){document.querySelector('.land-panel').hidden=false;document.querySelector('.composition').classList.remove('awaiting-selection');selected=(index+lands.length)%lands.length;const land=lands[selected];floodRegion(land.id);const artwork=document.querySelector('#land-artwork');const artDescriptions={kazan:'Извивающийся змей с тонкими усиками и фактурной чешуёй',moscow:'Парусный корабль с наполненными парусами на завитках волн',caucasus:'Женский профиль с круглым височным украшением и длинными подвесками',chuvashia:'Женская фигура с текучими волосами и силуэтом воды, кувшинки у основания',kalyazin:'Девушка с длинной косой в полный рост, держащая серп за спиной',udmurtia:'Робкий шаг женских ног среди крупных цветов, лоза вдоль щиколотки',komi:'Лицо мужчины в медвежьей маске, фактурная печатная графика'};artwork.hidden=!artDescriptions[land.id];document.querySelector('.land-card').classList.toggle('has-artwork',!artwork.hidden);if(!artwork.hidden){const illustration=document.querySelector('#land-illustration');illustration.src='assets/'+land.id+'-'+worldMode+(land.id==='kalyazin'&&worldMode==='life'?'-v2':'')+'.png';illustration.alt=artDescriptions[land.id];illustration.removeAttribute('width');illustration.removeAttribute('height')};document.querySelector('#counter').textContent=`${String(selected+1).padStart(2,'0')} / 07`;document.querySelector('#land-title').textContent=land.name;document.querySelector('#question').textContent=worldMode==='death'?deathQuestions[land.id]:land.question;document.querySelector('#description').textContent=land.description;document.querySelector('#story').textContent=land.story;document.querySelectorAll('.land-region').forEach(region=>region.classList.toggle('selected',region.dataset.land===land.id));document.querySelectorAll('[data-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.index)===selected)))}
document.querySelector('#previous').addEventListener('click',()=>select(selected-1));document.querySelector('#next').addEventListener('click',()=>select(selected+1));document.querySelector('#view-toggle').addEventListener('click',event=>{const overview=document.querySelector('.map-viewport').classList.toggle('overview');event.currentTarget.setAttribute('aria-pressed',String(overview));event.currentTarget.textContent=overview?'К землям':'Общий вид'});


// A single cubic path changes shape continuously; the trailing border stays thin.
const switchShapes={"life": [-12, 70, 0, 110, -12, 165, 30, 210, 68, 245, 94, 350, 95, 373, 95, 392, 76, 392, 53], "death": [53, 8, 76, 27, 95, 50, 95, 155, 94, 190, 68, 235, 30, 290, -12, 330, 0, 400, -12]};
let flowCoordinates=[...switchShapes[worldMode]], flowFrame=0, switchReady=false;
const fadeShapes={life:[1,1,1,0,0],death:[0,0,1,1,1]};
let flowOpacity=[...fadeShapes[worldMode]];
function applyFlowFade(values){document.querySelectorAll('.flow-fade-stop').forEach((stop,i)=>stop.setAttribute('stop-opacity',values[i]))}
function flowPath(a){return 'M 0 '+a[0]+' C '+[1,7,13].map(i=>a.slice(i,i+6).join(' ')).join(' C ')+' L 400 108 H 0 Z'}
function animateSwitchShape(mode){
 const shape=document.querySelector('.flow-liquid');
 cancelAnimationFrame(flowFrame);
 const from=[...flowCoordinates],to=switchShapes[mode];
 const fadeFrom=[...flowOpacity],fadeTo=fadeShapes[mode];
 const duration=switchReady&&!matchMedia('(prefers-reduced-motion: reduce)').matches?560:0;
 switchReady=true;
 if(!duration){flowCoordinates=[...to];flowOpacity=[...fadeTo];applyFlowFade(flowOpacity);shape.setAttribute('d',flowPath(to));return}
 const start=performance.now();
 function frame(now){const t=Math.min(1,(now-start)/duration);const e=t*t*(3-2*t);flowCoordinates=from.map((v,i)=>v+(to[i]-v)*e);shape.setAttribute('d',flowPath(flowCoordinates));flowOpacity=fadeFrom.map((v,i)=>v+(fadeTo[i]-v)*e);applyFlowFade(flowOpacity);if(t<1)flowFrame=requestAnimationFrame(frame)}
 flowFrame=requestAnimationFrame(frame);
}

function setWorldMode(mode){
 worldMode=mode==='death'?'death':'life';
 document.documentElement.dataset.worldMode=worldMode;
 animateSwitchShape(worldMode);
 document.querySelectorAll('[data-map-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapMode===worldMode)));
 document.querySelector('#mode-caption').textContent='Примерка · '+(worldMode==='life'?'Жизнь':'Смерть');
 try{localStorage.setItem('pesni-theme',worldMode)}catch{}
 if(selected>=0)select(selected);
}
document.querySelectorAll('[data-map-mode]').forEach(button=>button.addEventListener('click',()=>setWorldMode(button.dataset.mapMode)));
window.addEventListener('storage',event=>{if(event.key==='pesni-theme')setWorldMode(event.newValue)});
setWorldMode(worldMode);
