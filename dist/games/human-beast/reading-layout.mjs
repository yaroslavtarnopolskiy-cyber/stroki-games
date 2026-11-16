// Presentation-only line breaks; narrative words and game data are unchanged.
const breaks={
 1:['Но кто она?'],
 3:['Кто должен стать следующим памом?','Но он еще молод.','Может, стоит выбрать кого-то опытнее?'],
 5:['Ты видишь как в куст сиганул русак.'],
 7:['«Тебе нужна хорошая жена'],
 9:['Река тут неспокойная.','Мужики, которых ты взял с собой'],
 10:['«Я Вокуль.','Зачем ты тревожишь мою рыбу?'],
 12:['«Кто ты, воин?»'],
 13:['Попросив руки дочери,','А не выполнив обещание']
};
export function formatCardText(card){
 let text=card.text||'';
 for(const anchor of breaks[card.choice_number]||[]){const i=text.indexOf(anchor);if(i>0)text=text.slice(0,i).trimEnd()+'\n\n'+text.slice(i)}
 if((card.type||'').startsWith('ending')){const i=text.indexOf('. ');if(i>25)text=text.slice(0,i+1)+'\n\n'+text.slice(i+2)}
 return text;
}
