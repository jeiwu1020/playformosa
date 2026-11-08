import {readExternalCatalog} from './external-catalog.mjs';
// Add an actual game here only after its self-contained build is available.
export const catalog = {
  ...readExternalCatalog(),
  games: [{id:'long-jump', title:'四肢各有想法', event:'跳遠', href:'/games/long-jump/', status:'available'}, {id:'hurdles',title:'四肢各有想法｜110公尺跨欄',event:'110 公尺跨欄',href:'/games/hurdles/',status:'available',image:'/assets/hurdles-card.png',kicker:'八道欄杆，四肢過招。'}, {id:'high-jump',title:'四肢各有想法｜跳高',event:'跳高',href:'/games/high-jump/',status:'available',image:'/assets/high-jump-card.png',kicker:'助跑衝高度，空中拗姿勢。'}],
  minigames:[{id:'reaction-rod',title:'接棒啦！',event:'夜市反應力',href:'/games/reaction-rod/',status:'available',image:'/assets/reaction-rod-card.png',imageStyle:'illustration',kicker:'十根棒子，手腦各憑本事。',input:'滑鼠／觸控／鍵盤'},
    {id:'fast-hands',title:'快手王｜鴨沒漏補',event:'一筆往返手速挑戰',href:'/games/fast-hands/?intro=1',status:'available',image:'/assets/fast-hands-card-v2.webp',imageStyle:'illustration',kicker:'放鈔、抓鴨、回接，一筆完成。',input:'滑鼠／觸控'},
    {id:'fast-hands-catch',title:'快手王｜彈無虛接',event:'逐關加速接彈挑戰',href:'/games/fast-hands/catch.html?intro=1',status:'available',image:'/games/fast-hands/assets/intro-catch-generated.webp',imageStyle:'illustration',kicker:'看準掌心，看看能接到第幾關。',input:'滑鼠／觸控／空白鍵'},
    {id:'fast-hands-duel',title:'快手王｜快手對決',event:'十回合反應對決',href:'/games/fast-hands/duel.html?intro=1',status:'available',image:'/games/fast-hands/assets/intro-duel-generated.webp',imageStyle:'illustration',kicker:'等訊號、搶驚喜，十回合分勝負。',input:'滑鼠／觸控／空白鍵'}],
 events: ['100 公尺','跳遠','鉛球','跳高','400 公尺','110 公尺跨欄','鐵餅','撐竿跳高','標槍','1500 公尺']
};
