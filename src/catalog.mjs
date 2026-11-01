// Add an actual game here only after its self-contained build is available.
export const catalog = {
  games: [
    {id:'long-jump', title:'四肢各有想法', event:'跳遠', href:'/games/long-jump/', status:'available'},
    {id:'hurdles', title:'四肢各有想法－跨欄', event:'110 公尺跨欄', href:'/games/hurdles/', status:'available', image:'/assets/hurdles-card.png', imageStyle:'illustration', kicker:'八道欄杆，四肢過招。', label:'測試版'},
    {id:'high-jump',title:'跳高・今天直接越過去',event:'跳高',href:'/games/high-jump/',status:'available',image:'/assets/high-jump-card.png',imageStyle:'illustration',kicker:'助跑衝高度，空中拗姿勢。',label:'測試版'},
    {id:'pole-vault',title:'四肢各有想法－撐竿跳',event:'撐竿跳高',href:'/games/pole-vault/',status:'available',image:'/assets/pole-vault-card.png',imageStyle:'illustration',kicker:'你能跳得比什麼還高？',label:'測試版'}
  ],
  minigames: [
    {id:'reaction-rod', title:'接棒啦！', event:'夜市反應力', href:'/games/reaction-rod/', status:'available', image:'/assets/reaction-rod-card.png', imageStyle:'illustration', kicker:'十根棒子，手腦各憑本事。', label:'測試版', input:'滑鼠／觸控／鍵盤'},
    {id:'beer-slide', title:'別灑啊！', event:'啤酒精準推杯', href:'/games/beer-slide/', status:'available', image:'/assets/beer-slide-card.svg', kicker:'杯子要到站，啤酒別下班。', label:'測試版', input:'滑鼠／觸控／空白鍵'}
  ],
  events: ['100 公尺','跳遠','鉛球','跳高','400 公尺','110 公尺跨欄','鐵餅','撐竿跳高','標槍','1500 公尺']
};

