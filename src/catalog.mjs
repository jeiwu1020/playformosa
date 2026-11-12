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
    ,{id:'sprint-100m',title:'四肢各有想法｜100公尺',event:'100 公尺',href:'/games/sprint-100m/',status:'available',image:'/assets/sprint-100m-card.png',imageStyle:'illustration',kicker:'蹲好起跑，挺胸搶線。'}
    ,{id:'run-400m',title:'四肢各有想法｜400公尺',event:'400 公尺',href:'/games/run-400m/',status:'available',image:'/assets/run-400m-card.png',imageStyle:'illustration',kicker:'腿先不要下班，留力給最後。'}
    ,{id:'run-1500m',title:'四肢各有想法｜1500公尺',event:'1500 公尺',href:'/games/run-1500m/',status:'available',image:'/assets/run-1500m-card.png',imageStyle:'illustration',kicker:'跟跑、搶位，最後一圈見真章。'}
    ,{id:'javelin',title:'四肢各有想法｜標槍',event:'標槍',href:'/games/javelin/',status:'available',image:'/assets/javelin-card.png',imageStyle:'illustration',kicker:'助跑送力，出手還要煞得住。'}
  ],
  minigames: [
    {id:'overtime-pinball',title:'不准加班公司',event:'辦公室人體彈珠台',href:'/games/overtime-pinball/',status:'available',image:'/assets/overtime-pinball-card.png',imageStyle:'scene',kicker:'1 分鐘、3 分鐘或不限時，守住你的加班費。',input:'鍵盤／觸控'},
    {id:'courtesy-contest',title:'客氣大賽',event:'捷運互讓座',href:'/games/courtesy-contest/',status:'available',image:'/assets/courtesy-contest-card.jpg',imageStyle:'scene',kicker:'你先坐！不，你先坐！',input:'滑鼠／觸控／方向鍵'},
    {id:'reaction-rod', title:'接棒啦！', event:'夜市反應力', href:'/games/reaction-rod/', status:'available', image:'/assets/reaction-rod-card.png', imageStyle:'illustration', kicker:'十根棒子，手腦各憑本事。', input:'滑鼠／觸控／鍵盤'},
    {id:'beer-slide', title:'別灑啊！', event:'啤酒精準推杯', href:'/games/beer-slide/', status:'available', image:'/assets/beer-slide-card-v2.webp', imageStyle:'illustration', kicker:'杯子要到站，啤酒別下班。', input:'滑鼠／觸控／空白鍵'},
    {id:'tower-climb',title:'上樓不容易',event:'室內登高',href:'/games/tower-climb/',status:'available',image:'/assets/tower-climb-card.png',imageStyle:'illustration',kicker:'60 秒，挑戰十層樓。',input:'鍵盤／觸控'},
    {id:'fast-hands',title:'快手王｜鴨沒漏補',event:'一筆往返手速挑戰',href:'/games/fast-hands/?intro=1',status:'available',image:'/assets/fast-hands-card-v2.webp',imageStyle:'illustration',kicker:'放鈔、抓鴨、回接，一筆完成。',input:'滑鼠／觸控'},
    {id:'fast-hands-catch',title:'快手王｜彈無虛接',event:'逐關加速接彈挑戰',href:'/games/fast-hands/catch.html?intro=1',status:'available',image:'/games/fast-hands/assets/intro-catch-generated.webp',imageStyle:'illustration',kicker:'看準掌心，看看能接到第幾關。',input:'滑鼠／觸控／空白鍵'},
    {id:'fast-hands-duel',title:'快手王｜快手對決',event:'十回合反應對決',href:'/games/fast-hands/duel.html?intro=1',status:'available',image:'/games/fast-hands/assets/intro-duel-generated.webp',imageStyle:'illustration',kicker:'等訊號、搶驚喜，十回合分勝負。',input:'滑鼠／觸控／空白鍵'}
  ],
  events: ['100 公尺','跳遠','鉛球','跳高','400 公尺','110 公尺跨欄','鐵餅','撐竿跳高','標槍','1500 公尺']
};
