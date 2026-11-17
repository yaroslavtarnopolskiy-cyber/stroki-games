const root=document.documentElement;
const themeButtons=[...document.querySelectorAll('[data-set-theme]')];
let theme='life';try{theme=localStorage.getItem('pesni-theme')==='death'?'death':'life'}catch{}
function setTheme(value){theme=value;root.dataset.theme=value;if(window.setMapWorldMode&&root.dataset.worldMode!==value)window.setMapWorldMode(value);themeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.setTheme===value)));document.querySelector('meta[name="theme-color"]').content=value==='life'?'#f8f6f2':'#111111';try{localStorage.setItem('pesni-theme',value)}catch{}}
themeButtons.forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.setTheme)));
const audio=document.querySelector('#background-music');
const soundButton=document.querySelector('.sound-button');
let isPlaying=false,audioAction=0;
audio.volume=.55;
function showAudioState(playing){isPlaying=playing;soundButton.setAttribute('aria-pressed',String(playing));soundButton.setAttribute('aria-label',playing?'Поставить песнь земли на паузу':'Включить песнь земли');document.querySelector('.audio-status').textContent=playing?'Музыка включена':'Музыка выключена'}
async function toggleSound(){
 const action=++audioAction;
 soundButton.disabled=true;
 try{if(isPlaying){audio.pause();showAudioState(false)}else{await audio.play();if(action===audioAction)showAudioState(true)}}
 catch{if(action!==audioAction)return;showAudioState(false);document.querySelector('.audio-status').textContent='Не удалось включить музыку. Попробуй ещё раз.'}
 finally{if(action===audioAction)soundButton.disabled=false}
}
soundButton.addEventListener('click',toggleSound);
document.addEventListener('pesni:game-activate',()=>{audioAction++;audio.pause();showAudioState(false);soundButton.disabled=false});
audio.addEventListener('error',()=>{showAudioState(false);document.querySelector('.audio-status').textContent='Музыка недоступна. Попробуй позже.'});
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();else if(isPlaying)audio.play().catch(()=>showAudioState(false))});
const menu=document.querySelector('#menu'),menuButton=document.querySelector('.menu-button'),menuNote=document.querySelector('.menu-note');
function openMenu(){if(!menu.open)menu.showModal();menuButton?.setAttribute('aria-expanded','true')}
menuButton?.addEventListener('click',openMenu);document.querySelector('.close-menu').addEventListener('click',()=>menu.close());menu.addEventListener('close',()=>menuButton?.setAttribute('aria-expanded','false'));
menu.addEventListener('click',event=>{if(event.target===menu){const box=menu.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)menu.close()}});
document.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.section==='Карта голосов'){menu.close();window.goToSection('voices');return}if(button.dataset.section==='Игры'){menu.close();window.goToSection('games');return}if(button.dataset.section==='Чат-бот'){menu.close();window.goToSection('story-bot');return}if(button.dataset.section==='Статьи'){menu.close();window.goToSection('project-media');return}if(button.dataset.section==='Музыка'){menu.close();window.goToSection('album-promo');return}if(button.dataset.section==='Истории'){menu.close();window.goToSection('story-matcher');return}openMenu();menuNote.textContent=`«${button.dataset.section}» появится на следующем этапе. Уже доступны первый экран и карта семи земель.`}));
window.setSiteTheme=setTheme;
setTheme(theme);
