export const OFFER_SECONDS=1.2;
export const CHORD_GUARD=.04;
export const ACTIVITIES={
 launcher:{id:'launcher',title:'公文彈射台',duration:1.2,reward:160,phases:['公文台升起！','所選部門，空運直達！','職涯規劃：直接彈出去！'],exitVz:22,exitX:12},
 clock:{id:'clock',title:'準時下班打三卡',duration:6,reward:1100,phases:['打卡鐘：你今天已經下班三次！','跟著亮燈，三次蓋章！','打卡成功，人卡在公司！'],exitVz:-27,exitX:11},
 microwave:{id:'microwave',title:'便當熱到升職',duration:6,reward:1250,phases:['便當放進去，薪水還沒熱！','長按加熱，綠燈放手！','便當升溫，人直接升空！'],exitVz:-28,exitX:12},
 parcel:{id:'parcel',title:'把自己寄下班',duration:6,reward:1000,phases:['快遞收件：連本人一起包！','左右交替，貼六條膠帶！','收件人：明天的自己！'],exitVz:-29,exitX:10},
 shredder:{id:'shredder',special:true,title:'碎紙救薪水',duration:3,reward:2600,phases:['薪資單進錯洞！快拉回來！','左右拉！薪水不能變紙屑！','救回薪水！碎的是老闆的預算！'],exitVz:-30,exitX:12},
 server:{id:'server',special:true,title:'重開機救全公司',duration:3,reward:3000,phases:['全公司斷線！先別拔錯線！','長按充電，亮燈就放手！','系統復活！風扇把工程師吹飛！'],exitVz:-31,exitX:11},
 busy:{id:'busy',title:'假裝很忙',duration:3.4,reward:650,phases:['主管來了，快坐好！','鍵盤敲到冒煙，進度還是 99%','下班前，再開一個視窗！'],exitVz:-20,exitX:9},
 coffee:{id:'coffee',title:'打翻咖啡擦地',duration:3.8,reward:800,phases:['啊！咖啡比薪水還貴！','跪著擦地，獎金另算','地板太乾淨，人先滑走！'],exitVz:-24,exitX:12},
 copier:{id:'copier',title:'拯救卡紙',duration:3.5,reward:700,phases:['又卡紙？先伸手看看','一張、兩張……報表拉不完！','影印機：連人一起退件！'],exitVz:-22,exitX:10},
 water:{id:'water',title:'接水順便摸魚',duration:3.2,reward:550,phases:['先接一杯，獎金另計','水壓是不是有點太大？','喝飽了，公司幫你噴出去！'],exitVz:-23,exitX:9},
 chair:{id:'chair',title:'辦公椅轉職',duration:3.1,reward:600,phases:['坐一下，想想人生','職涯發展：高速原地旋轉','轉職成功？是轉到飛出去！'],exitVz:-21,exitX:14},
 boss:{id:'boss',title:'加班單再改一版',duration:3.3,reward:850,phases:['主管，可以簽加班單嗎？','這裡再調整一下……','核准方式：用腳蓋章！'],exitVz:20,exitX:8}
};
export function activityFor(o){return ACTIVITIES[o.activity||(o.id==='desk2'?'coffee':o.type==='desk'?'busy':o.type)];}
export const stageYaw=(view='reverse')=>view==='reverse'?Math.PI+.55:0;
export function dockFor(o,view='reverse'){const a=activityFor(o);if(a.id==='launcher')return{x:o.x,z:o.z};const d=(({clock:2.6,microwave:2.6,parcel:2.4})[a.id]??(a.id==='chair'?0:a.id==='busy'?1.85:a.id==='coffee'?3.1:a.id==='copier'?3.6:a.id==='water'?2.1:a.special?2.4:2.2))*(o.visualScale||1),yaw=stageYaw(view);return {x:o.x+Math.sin(yaw)*d,z:o.z-Math.cos(yaw)*d};}
export function exitFor(o,side,view='reverse',radius=.65){const sign=side==='left'?-1:1;if(view==='original')return {x:Math.max(-17.15,Math.min(17.15,o.x+sign*.9)),z:o.z-(o.r+radius+1.1)};return {x:Math.max(-17.15,Math.min(17.15,o.x+sign*(o.r+radius+1.1))),z:o.z+.75};}
