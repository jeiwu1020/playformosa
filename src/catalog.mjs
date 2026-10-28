// Add an actual game here only after its self-contained build is available.
export const catalog = {
  games: [
    {id:'long-jump', title:'四肢各有想法', event:'跳遠', href:'/games/long-jump/', status:'available'},
    {id:'hurdles', title:'四肢各有想法－跨欄', event:'110 公尺跨欄', href:'/games/hurdles/', status:'available', image:'/assets/hurdles-card.jpg', kicker:'八道欄杆，四肢過招。', label:'測試版'}
  ],
  minigames: [
    {id:'reaction-rod', title:'接棒啦！', event:'夜市反應力', href:'/games/reaction-rod/', status:'available', image:'/assets/reaction-rod-card.png', kicker:'十根棒子，手腦各憑本事。', label:'測試版', input:'滑鼠／觸控／鍵盤'},
    {id:'beer-slide', title:'別灑啊！', event:'啤酒精準推杯', href:'/games/beer-slide/', status:'available', image:'/assets/beer-slide-card.svg', kicker:'杯子要到站，啤酒別下班。', label:'測試版', input:'滑鼠／觸控／空白鍵'}
  ],
  events: ['100 公尺','跳遠','鉛球','跳高','400 公尺','110 公尺跨欄','鐵餅','撐竿跳高','標槍','1500 公尺']
};
