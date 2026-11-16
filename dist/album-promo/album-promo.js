const root=document.querySelector('#album-promo');
const config={topDuration:40,bottomDuration:47,characters:['guslar','dancer','gusli'],top:[0,1,2,1,0,2],bottom:[1,2,0,2,1,0]};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(max-width:760px)');

const connection=navigator.connection;
const canAnimate=()=>!reduced.matches&&window.pesniConnection?.canAnimate()!==false;
let loaded=false,viewed=false,serial=0,count=0,templates,ensembleLoaded=false,sectionVisible=false;
function syncMotion(){root.dataset.motion=canAnimate()?'animated':'static';root.style.setProperty('--album-play',sectionVisible&&!document.hidden&&canAnimate()?'running':'paused');syncBandImages()}
function emit(name){root.dispatchEvent(new CustomEvent('pesni:analytics',{bubbles:true,detail:{name,section:'album_promo',album:'istochnik',artist:'on_label',theme:document.documentElement.dataset.theme,placement:'landing_footer'}}))}
root.querySelector('.album-listen').addEventListener('click',()=>emit('album_promo_click'));
// Only the two large foreground characters need independent inline animation.
function instance(source,theme,phase){
 const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
 const prefix=`ap${serial++}-`;
 // Scope the supplied SVG's definitions, classes and keyframes so repeated figures stay independent.
 let markup=new XMLSerializer().serializeToString(svg);
 const ids=[...svg.querySelectorAll('[id]')].map(e=>e.id);
 for(const id of ids)markup=markup.replaceAll(`id="${id}"`,`id="${prefix+id}"`).replaceAll(`#${id}`,`#${prefix+id}`);
 const names=new Set([...svg.querySelectorAll('[class]')].flatMap(e=>e.getAttribute('class').split(/\s+/)));
 for(const name of names){markup=markup.replace(new RegExp('\\.'+name+'(?![\\w-])','g'),'.'+prefix+name)}
 markup=markup.replace(/class="([^"]+)"/g,(_,value)=>`class="${value.split(/\s+/).map(n=>prefix+n).join(' ')}"`);
 const keyframes=[...markup.matchAll(/@keyframes\s+([\w-]+)/g)].map(m=>m[1]);
 for(const name of keyframes)markup=markup.replace(new RegExp('(?<![\\w-])'+name+'(?![\\w-])','g'),prefix+name);
 const node=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement;
 node.classList.add(`album-${theme}`);node.setAttribute('aria-hidden','true');node.setAttribute('focusable','false');node.removeAttribute('aria-labelledby');node.style.setProperty('--phase',`${phase}s`);
 return document.importNode(node,true);
}
function buildEnsemble(){
 for(const character of ['dancer','guslar']){const layer=root.querySelector(`.ensemble-${character}`);if(!layer)return;layer.replaceChildren();for(const theme of ['life','death'])layer.append(instance(templates[`${character}-${theme}`],theme,character==='dancer'?-.9:0))}
}
function buildRows(){
 const size=innerWidth<=760?88.8:126.8,next=Math.max(6,Math.ceil(root.clientWidth/size/6)*6);if(count===next)return;count=next;
 root.querySelectorAll('[data-procession]').forEach((row,index)=>{
  const r=index%2;
  const track=document.createElement('div');track.className='album-track';track.style.setProperty('--duration',`${r?config.bottomDuration:config.topDuration}s`);
  for(let copy=0;copy<2;copy++){
   const group=document.createElement('div');group.className='album-sequence';
   for(let i=0;i<count;i++){
    const figure=document.createElement('span');figure.className='album-character';const character=config.characters[(r?config.bottom:config.top)[i%6]];
    for(const theme of ['life','death']){
     const image=document.createElement('img');image.className=`album-${theme}`;
     image.dataset.src=`album-promo/assets/album_${character}_${theme}.svg`;
     image.alt='';image.width=73;image.height=34;image.decoding='async';image.draggable=false;
     figure.append(image);
    }
    group.append(figure);
    // Complete cadence in both duplicated sequences: two figures/sun, one figure/tree.
    if(r===1||(i+1)%2===0){const mark=document.createElement('span');mark.className='album-pattern';const image=document.createElement('img');image.src=`album-promo/assets/album_pattern_${r?'tree':'sun'}.svg`;image.alt='';image.width=28;image.height=28;mark.append(image);group.append(mark)}
   }track.append(group);
  }row.replaceChildren(track);
 });
 syncBandImages();
}
function syncBandImages(){
 const theme=document.documentElement.dataset.theme==='death'?'death':'life';
 const suffix='-static.svg';
 root.querySelectorAll('.album-processions').forEach(band=>{const visible=!document.hidden&&band.dataset.inView==='true';band.style.setProperty('--album-play',visible&&canAnimate()?'running':'paused');
 band.querySelectorAll('.album-character>img').forEach(image=>{if(visible&&image.classList.contains(`album-${theme}`)){const src=image.dataset.src.replace(/\.svg$/,suffix);if(image.getAttribute('src')!==src)image.src=src}});
 });
}
async function ensureEnsemble(){
 if(ensembleLoaded||mobile.matches||!canAnimate())return;ensembleLoaded=true;
 try{templates=Object.fromEntries(await Promise.all(['guslar','dancer'].flatMap(c=>['life','death'].map(async t=>{const response=await fetch(`album-promo/assets/album_${c}_${t}.svg`);if(!response.ok)throw Error('Missing album character');return [`${c}-${t}`,await response.text()]}))));
 const mount=()=>{buildEnsemble();syncMotion()};
 if('requestIdleCallback' in window)requestIdleCallback(mount,{timeout:500});else setTimeout(mount,0);
 }catch(error){ensembleLoaded=false;console.error('Album scene could not be loaded',error)}
}
function load(){
 if(loaded)return;loaded=true;
 // Warm the tiny static ribbon variants near the section, not at page startup.
 const themes=canAnimate()?['life','death']:[document.documentElement.dataset.theme==='death'?'death':'life'];
 for(const character of config.characters)for(const theme of themes){const image=new Image();image.decoding='async';image.src=`album-promo/assets/album_${character}_${theme}-static.svg`;if(image.decode)image.decode().catch(()=>{})}
 for(const character of ['guslar','dancer']){const layer=root.querySelector(`.ensemble-${character}`);if(layer&&!layer.children.length)for(const theme of ['life','death']){const image=new Image();image.className=`album-${theme}`;image.src=`album-promo/assets/album_${character}_${theme}-static.svg`;image.alt='';image.decoding='async';layer.append(image)}}
 buildRows();ensureEnsemble();new ResizeObserver(()=>{buildRows();syncBandImages()}).observe(root);
}
const preload=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();preload.disconnect()}},{rootMargin:'120px'});preload.observe(root);
const visibility=new IntersectionObserver(entries=>{const visible=entries.some(e=>e.isIntersecting);sectionVisible=visible;syncMotion();if(visible&&!viewed){viewed=true;emit('album_promo_view')}},{threshold:.08});visibility.observe(root);

const bandVisibility=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.dataset.inView=String(entry.isIntersecting);syncBandImages()},{rootMargin:"30px"});root.querySelectorAll(".album-processions").forEach(band=>bandVisibility.observe(band));

new MutationObserver(syncBandImages).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
document.addEventListener('visibilitychange',syncMotion);
reduced.addEventListener('change',syncMotion);
window.addEventListener('pesni:connection-change',()=>{syncMotion();if(loaded)ensureEnsemble()});
mobile.addEventListener('change',()=>{if(loaded)ensureEnsemble()});
syncMotion();

document.fonts.ready.then(()=>requestAnimationFrame(syncBandImages));
