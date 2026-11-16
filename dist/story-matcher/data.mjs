export const questions=[
 {id:'q1',text:'Какая стихия тебе ближе?',answers:[['Земля','earth'],['Воздух','air'],['Огонь','flame'],['Вода','water']]},
 {id:'q2',text:'Где ты найдёшь приют в незнакомой земле?',answers:[['У костра','campfire'],['В роще','grove'],['В башне','tower'],['У воды','water']]},
 {id:'q3',text:'Чему ты останешься верен перед невозможным выбором?',answers:[['Любви','heart'],['Свободе','wind'],['Истине','eye'],['Долгу','shield']]}
];
export const weights=[
 [[3,0,0,0,1,1,1],[0,2,2,0,0,3,1],[0,3,2,1,2,1,1],[1,0,2,3,2,1,2]],
 [[2,1,1,3,0,2,1],[2,2,1,0,1,3,0],[0,1,0,1,3,0,3],[2,3,3,0,0,1,2]],
 [[1,1,2,3,0,3,1],[2,3,1,1,2,3,0],[1,2,3,1,3,0,1],[2,1,2,0,1,0,3]]
];
export const serviceUrl='https://mtsbooks.onelink.me/zdZb/t75hb4td';
export const collectionUrl='https://mtsbooks.onelink.me/zdZb/t75hb4td';
const storyUrls=['https://mtsbooks.onelink.me/zdZb/2y5x9p54', 'https://mtsbooks.onelink.me/zdZb/jce0jbvp', 'https://mtsbooks.onelink.me/zdZb/j74qgr6x', 'https://mtsbooks.onelink.me/zdZb/2ui31gw4', 'https://mtsbooks.onelink.me/zdZb/t8zxvuww', 'https://mtsbooks.onelink.me/zdZb/53p6oe0h', 'https://mtsbooks.onelink.me/zdZb/y2t4ofj7'];
export const stories=[
 ['Маска человека','Мария Воробьи'],['Сладки ягоды, да смертью пахнут','Екатерина Звонцова'],['Свадьба воды','Анна Кавалли'],['Ради тебя, любовь-нелюбовь','Денис Лукьянов'],['Где деревья до небес','Наталия Осояну'],['Останешься со мной','Дарина Стрельченко'],['Золотая казна','Юлия Шляпникова']
].map(([title,author],index)=>({id:'S0'+(index+1),order:index+1,title,author,coverUrl:index===5?'story-matcher/covers/s06.jpg':`story-matcher/covers/s0${index+1}.webp`,storyUrl:storyUrls[index],collectionUrl}));
