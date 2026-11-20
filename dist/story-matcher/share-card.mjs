// Resolve the landing directory on any host, including /pesni-zemli/ in S3.
const publicUrl=new URL('../',import.meta.url).href;
export function storyShareUrl(story){const url=new URL(publicUrl);url.searchParams.set('story',story.id);url.hash='story-matcher';return url.href}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
function lines(ctx,text,x,y,width,lineHeight){let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){ctx.fillText(line,x,y);y+=lineHeight;line=word}else line=next}ctx.fillText(line,x,y);return y+lineHeight}
const landProfiles={
 S01:{name:'Урал',art:'komi'},S02:{name:'Калязин',art:'kalyazin'},
 S03:{name:'Чувашия',art:'chuvashia'},S04:{name:'Кавказ',art:'caucasus'},
 S05:{name:'Подмосковье',art:'moscow'},S06:{name:'Удмуртия',art:'udmurtia'},
 S07:{name:'Татарстан',art:'kazan'}
};
export function storyShareText(story){const land=landProfiles[story.id].name;return `${land} зовёт меня к себе. «${story.title}» — ${story.author}. Песни Земли.`}
function fitImage(c,img,x,y,w,h){const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function ornament(c,img,x,y,size,opacity=1){c.save();c.globalAlpha=opacity;c.drawImage(img,x,y,size,size);c.restore()}
export async function createStoryCard(story,theme){
 await document.fonts.load('52px Glanz');
 const land=landProfiles[story.id];
 const [cover,art,moon,flowers,mountains,kion,logo,bear]=await Promise.all([
  story.coverUrl,`map-study/assets/${land.art}-death.webp`,'assets/hero-moon-life.webp',
  'assets/hero_italmas_life.webp','assets/hero_mountains_death.webp',
  'assets/kion_stroki_logo_white.svg','assets/logo_dark.svg','games/human-beast/assets/ornament-bear.svg'
 ].map(loadImage));
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1360;const c=canvas.getContext('2d');
 c.fillStyle='#111310';c.fillRect(0,0,1080,1440);
 const glow=c.createRadialGradient(780,730,30,620,720,760);glow.addColorStop(0,'#472021');glow.addColorStop(.55,'#221a16');glow.addColorStop(1,'#111310');c.fillStyle=glow;c.fillRect(0,0,1080,1440);
 // Fine print grain, deterministic across exports; no new raster assets to load.
 for(let i=0;i<16000;i++){const x=(i*137.508)%1080,y=(i*89.337)%1440;c.fillStyle=i%2?'#ffffff04':'#0000000a';c.fillRect(x,y,1.3,1.3)}
 c.save();c.globalAlpha=.2;c.drawImage(mountains,-110,825,1300,390);c.restore();
 // The existing red moon and botanical engraving form a layered landscape.
 c.save();c.globalAlpha=.92;c.drawImage(moon,300,390,760,760);c.restore();
 c.save();c.globalAlpha=.24;c.translate(110,790);c.rotate(-.42);c.drawImage(flowers,-140,-220,370,420);c.restore();
 fitImage(c,art,315,445,715,620);
 c.save();c.translate(270,818);c.rotate(-.105);c.shadowColor='#000c';c.shadowBlur=38;c.shadowOffsetY=20;
 const h=442,w=h*cover.naturalWidth/cover.naturalHeight;c.drawImage(cover,-w/2,-h/2,w,h);c.shadowColor='transparent';c.strokeStyle='#f3e9db66';c.lineWidth=1;c.strokeRect(-w/2,-h/2,w,h);c.restore();
 c.save();c.translate(975,1030);c.rotate(.2);c.drawImage(flowers,-70,-220,320,360);c.restore();
 // Keep the editorial typography on a quiet field below the illustration.
 const fade=c.createLinearGradient(0,1005,0,1160);fade.addColorStop(0,'#11131000');fade.addColorStop(1,'#111310');c.fillStyle=fade;c.fillRect(0,1005,1080,435);
 c.textAlign='center';fitImage(c,kion,430,47,220,30);fitImage(c,logo,453,101,174,153);
 c.fillStyle='#f2eadb';c.font='90px Glanz';c.fillText(land.name,540,346,930);c.font='32px Glanz';c.fillStyle='#c3b7a8';c.fillText('зовёт меня к себе',540,396);
 // Reuse the game's engraved motif; retain open edges rather than a heavy frame.
 ornament(c,bear,54,278,42,.65);ornament(c,bear,984,278,42,.65);
 c.strokeStyle='#ef4438';c.lineWidth=2;c.beginPath();c.moveTo(72,1091);c.bezierCurveTo(320,1035,735,1154,1008,1081);c.stroke();
 ornament(c,bear,518,1071,44);
 c.fillStyle='#f2eadb';c.font='52px Glanz';const y=lines(c,story.title,540,1185,900,58);
 c.font='32px Glanz';c.fillStyle='#c3b7a8';c.fillText(story.author,540,y+12);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('card export')),'image/png'));
}
export async function openStoryShare(story,theme){
 const report=(name,method)=>document.dispatchEvent(new CustomEvent('pesni:analytics',{detail:{name,story_id:story.id,method}}));
 const trigger=document.activeElement,blob=await createStoryCard(story,theme),objectUrl=URL.createObjectURL(blob),file=new File([blob],`pesni-zemli-${story.id}.png`,{type:'image/png'}),url=storyShareUrl(story),text=storyShareText(story);
 const dialog=document.createElement('dialog');dialog.className='story-share-dialog';dialog.setAttribute('aria-labelledby','share-card-title');dialog.innerHTML='<button class="share-close" aria-label="Закрыть">×</button><h2 id="share-card-title" class="sr-only">Карточка земли</h2><img alt="Карточка выбранного рассказа"><div class="share-card-actions"><button class="share-send">Поделиться</button><a class="share-save" download>Сохранить</a><button class="share-copy" aria-label="Скопировать ссылку" title="Скопировать ссылку"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg></button></div><p role="status" aria-live="polite"></p>';
 dialog.querySelector('#share-card-title').textContent='Карточка земли — '+landProfiles[story.id].name;dialog.querySelector('img').alt=landProfiles[story.id].name+' — «'+story.title+'», '+story.author;dialog.querySelector('img').src=objectUrl;const save=dialog.querySelector('.share-save');save.href=objectUrl;save.download=file.name;
 save.addEventListener('click',()=>report('story_card_save','download_click'));
 const status=dialog.querySelector('[role=status]');
 dialog.querySelector('.share-send').addEventListener('click',async()=>{try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Песни Земли',text,url});report('story_share_complete','file')}else if(navigator.share){await navigator.share({title:'Песни Земли',text,url});report('story_share_complete','link')}else{status.textContent='Сохрани карточку и скопируй ссылку, чтобы отправить их другу.'}}catch(error){if(error.name!=='AbortError')status.textContent='Сохрани карточку и отправь её вместе со ссылкой.'}});
 dialog.querySelector('.share-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text+'\n'+url);status.textContent='Текст и ссылка скопированы.';report('story_share_copy','clipboard')}catch{status.textContent=url}});
 dialog.querySelector('.share-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 dialog.addEventListener('close',()=>{URL.revokeObjectURL(objectUrl);dialog.remove();trigger?.focus({preventScroll:true})},{once:true});document.body.append(dialog);dialog.showModal();
}
