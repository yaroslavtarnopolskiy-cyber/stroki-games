// Editorial alignment of the supplied choices: left = human, right = bear.
// The source CardTable JSON is preserved. Only the live game's side/score mapping changes.
export const humanSourceSide={3:'right',5:'right',7:'right',9:'right',10:'left',12:'right',13:'right'};
export function alignNatureChoices(cards){
 return cards.map(card=>{
  const human=humanSourceSide[card.choice_number];if(!human||card.type==='book')return card;
  const bear=human==='left'?'right':'left';
  return {...card,left:{...card[human],scale:-Math.abs(card[human].scale||10)},right:{...card[bear],scale:Math.abs(card[bear].scale||10)}};
 });
}
