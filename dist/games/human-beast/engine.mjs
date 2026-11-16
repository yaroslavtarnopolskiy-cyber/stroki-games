// Port of the supplied GameManager.cs; UI and platform lifecycle are separate.
export const collectionUrl='https://mtsbooks.onelink.me/zdZb/t75hb4td';
export const shareText='Человек или зверь — кого ты выберешь в себе? Пройди путь Кудым-Оша и найди равновесие в игре по мотивам «Маски человека» из «Песен Земли».';
export class CardGame{
 constructor(cards,random=Math.random){this.cards=cards;this.random=random;this.story=cards.filter(c=>!c.type||c.type==='story').sort((a,b)=>a.choice_number-b.choice_number);this.endings=cards.filter(c=>(c.type||'').startsWith('ending'));this.book=cards.find(c=>c.type==='book');if(!this.story.length)throw Error('Нет сюжетных карточек');this.restart()}
 restart(){this.stats=50;this.index=0;this.inEnding=false;this.current=this.story[this.index++];return this.current}
 ending(type){this.inEnding=true;const options=this.endings.filter(c=>c.type===type);this.current=options[Math.min(options.length-1,Math.floor(this.random()*options.length))]||this.book;return this.current}
 choose(right){
  if(this.current.type==='book')return right?{action:'read'}:{action:'restart',card:this.restart()};
  if(this.inEnding){this.current=this.book||this.restart();return {card:this.current}}
  const choice=this.current[right?'right':'left'];this.stats=Math.max(0,Math.min(100,this.stats+(choice?.scale||0)));
  if(this.stats<=0)return {card:this.ending('ending_low')};
  if(this.stats>=100)return {card:this.ending('ending_high')};
  this.current=this.index>=this.story.length?this.ending('ending_final'):this.story[this.index++];return {card:this.current};
 }
}
