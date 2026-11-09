export const ranks=[{min:12,grade:'SSS',title:'全車廂禮貌擔當',line:'你把座位讓成了非物質文化遺產。'},{min:8,grade:'S',title:'客氣界的太極宗師',line:'這不是讓座，這是兩個人的膝關節外交。'},{min:5,grade:'A',title:'有禮到站不穩',line:'阿姨：這孩子有前途，就是有點難請坐。'},{min:2,grade:'B',title:'禮貌點到為止',line:'有來有往，屁股也有地方安放。'},{min:0,grade:'C',title:'謝謝派務實乘客',line:'客氣是美德，坐著也是。你選擇了腰椎。'}];
export function resultFor(count,seated,reason){if(reason==='stolen')return{grade:'F',title:'客氣到被插隊',line:'你們還在交換禮貌，人家已經交換座位。'};if(!seated)return{grade:count>=8?'F+':'F',title:count>=8?'站著輸，禮貌贏':'禮貌性滑壘',line:count>=8?'你贏得阿姨的尊重，卻輸給牛頓的定律。':'人還沒坐下，靈魂已經抵達下一站。'};return ranks.find(x=>count>=x.min);}

export function seatedAtDeparture(pose,busy,accepted=false){return accepted===true&&pose===4&&!busy;}
export function seatProgress(){return 0;}
export function countdownVisible(remaining){return Number.isFinite(remaining)&&remaining>19;}
export function countdownWarningVisible(remaining){return countdownVisible(remaining)&&Math.ceil(remaining)<=22;}
export const THREAT_SECONDS=3;
export const THREAT_WINDUP=.8;
export function canStartThreat({count,remaining,active,busy,cooldown,occupied=false}){return count>=4&&remaining>=4.8&&!active&&!busy&&!occupied&&cooldown<=0;}
export function chooseIntruder(random,last=-1){const pick=Math.min(2,Math.floor(random*3));return pick===last?(pick+1)%3:pick;}
export function seatAnchoredY(seatY,frameHeight,hipY,scale){return seatY+(frameHeight-hipY)*scale;}
export const INTRUDERS=[
 {name:'阿伯',warning:'阿伯：你們不坐，我坐喔！',repelled:'阿伯：我只是伸展一下！',stolen:'阿伯：禮貌你們留著，位子我收下。'},
 {name:'學生',warning:'學生盯上空位了！',repelled:'學生：好啦，我去站著滑。',stolen:'學生：這不是搶座，是精準卡位。'},
 {name:'上班族',warning:'上班族準備下班衝刺！',repelled:'上班族：抱歉，職業反射！',stolen:'上班族：這個座位，我先排進行程。'}
];
export function courtesyLines(count){if(count>=10)return['您坐，我站到終點！','這份禮貌，我接不住！'];if(count>=7)return['不坐就是不給我面子！','那我更不能坐了！'];if(count>=4)return['我腿是裝飾，您先坐！','我練深蹲，你坐啦！'];return[['你請坐！','您先，您先！','阿姨，您坐啦！','真的不用客氣！'][count%4],['我不累，你先坐！','少年仔，你才要坐！','我快到了，你坐！','毋免客氣，坐啦！'][count%4]];}

export function musicRate(remaining){
 const progress=Math.max(0,Math.min(1,1-remaining/30));
 return 1+.5*Math.pow(progress,1.8);
}
