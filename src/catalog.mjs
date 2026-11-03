import {readExternalCatalog} from './external-catalog.mjs';
// Add an actual game here only after its self-contained build is available.
export const catalog = {
  ...readExternalCatalog(),
  games: [
    {id:'long-jump', title:'四肢各有想法｜跳遠', event:'跳遠', href:'/games/long-jump/', status:'available'},
    {id:'hurdles', title:'四肢各有想法｜110公尺跨欄', event:'110 公尺跨欄', href:'/games/hurdles/', status:'available', image:'/assets/hurdles-card.png', imageStyle:'illustration', kicker:'八道欄杆，四肢過招。'},
    {id:'high-jump',title:'四肢各有想法｜跳高',event:'跳高',href:'/games/high-jump/',status:'available',image:'/assets/high-jump-card.png',imageStyle:'illustration',kicker:'助跑衝高度，空中拗姿勢。'},
    {id:'pole-vault',title:'四肢各有想法｜撐竿跳',event:'撐竿跳高',href:'/games/pole-vault/',status:'available',image:'/assets/pole-vault-card.png',imageStyle:'illustration',kicker:'你能跳得比什麼還高？'},
    {id:'shot-put',title:'四肢各有想法｜鉛球',event:'鉛球',href:'/games/shot-put/',status:'available',image:'/assets/shot-put-card.png',imageStyle:'illustration',kicker:'短蓄力，準出手，空中接力。'},
    {id:'discus',title:'四肢各有想法｜鐵餅',event:'鐵餅',href:'/games/discus/',status:'available',image:'/assets/discus-card.png',imageStyle:'illustration',kicker:'旋轉出手，順風遠行。'}
    ,{id:'sprint-100m',title:'四肢各有想法｜100公尺衝刺',event:'100 公尺',href:'/games/sprint-100m/',status:'available',image:'/assets/sprint-100m-card.png',imageStyle:'illustration',kicker:'蹲好起跑，挺胸搶線。'}
    ,{id:'javelin',title:'四肢各有想法｜標槍',event:'標槍',href:'/games/javelin/',status:'available',image:'/assets/javelin-card.png',imageStyle:'illustration',kicker:'助跑送力，出手還要煞得住。'}
  ],
  minigames: [
    {id:'reaction-rod', title:'接棒啦！', event:'夜市反應力', href:'/games/reaction-rod/', status:'available', image:'/assets/reaction-rod-card.png', imageStyle:'illustration', kicker:'十根棒子，手腦各憑本事。', input:'滑鼠／觸控／鍵盤'},
    {id:'beer-slide', title:'別灑啊！', event:'啤酒精準推杯', href:'/games/beer-slide/', status:'available', image:'/assets/beer-slide-card.svg', kicker:'杯子要到站，啤酒別下班。', input:'滑鼠／觸控／空白鍵'},
    {id:'tower-climb',title:'上樓不容易',event:'室內登高',href:'/games/tower-climb/',status:'available',image:'/assets/tower-climb-card.png',imageStyle:'illustration',kicker:'60 秒，挑戰十層樓。',input:'鍵盤／觸控'}
  ],
  events: ['100 公尺','跳遠','鉛球','跳高','400 公尺','110 公尺跨欄','鐵餅','撐竿跳高','標槍','1500 公尺']
};

