const bands={
 head:['腦袋先到，腿還在開會','用頭腦參賽，不是這個意思','腦袋先交卷，身體還在趕路','頭等艙乘客，頭等艙著陸','腦袋已到站，地心引力請查收'],
 butt:['屁股提前辦理入住','沙坑沙發試坐員','屁股搶到沙坑第一排','坐著飛，也坐著收工','這個屁股，搭的是長途班機'],
 hand:['先握手，再著陸','雙手先幫你簽到','手掌抵達，腳還在觀望','空中快遞，手動簽收','手都伸到隔壁縣市了'],
 feet:['沙坑點到為止','有點帥，差點更帥','四肢終於達成共識','地心引力剛才在打瞌睡','這不是跳遠，是國內航班'],
 body:['全身都有參與感','沙坑收到一份全身快遞','著陸方式，自成一派','身體先抵達，姿勢還在路上','飛行很專業，停車很隨緣']
};
export function distanceBand(distance){return distance<2?0:distance<6?1:distance<10?2:distance<15?3:4;}
export function selectVerdict({firstContact='',nearestPart='',rawDistance=null,foul=false,flips=0,airTime=0,glides=0}){
 const part=firstContact||nearestPart,kind=/頭|額/.test(part)?'head':/屁/.test(part)?'butt':/手|肘/.test(part)?'hand':/腳|膝/.test(part)?'feet':'body';
 if(rawDistance===null){if(foul)return part?'越線很積極，沙坑沒接到':'腳趾先報到，成績沒跟上';if(kind==='head')return'腦袋先打卡，沙坑還沒到';if(kind==='butt')return'屁股提前下班，沙坑還在遠方';return part?'著陸成功，只是地址不對':'四肢開完會，忘了出發';}
 if(foul){const far=rawDistance>=10;if(kind==='head')return far?'腦袋飛很遠，腳趾先違規':'頭先落地，腳先違規';if(kind==='butt')return far?'屁股坐遠了，成績坐沒了':'屁股坐穩了，成績坐沒了';if(kind==='hand')return far?'手伸得再遠，也搆不回成績':'手都到了，成績沒過關';return far?'飛得很遠，規則一公分都不讓':'腳趾搶跑，成績放假';}
 const tier=distanceBand(rawDistance);
 if(kind==='feet'&&flips>0)return tier>=3?'翻了一圈，順便飛過想像':'翻得像洗衣機，落得像選手';
 if(kind==='feet'&&tier>=3&&glides===2&&airTime>1.8)return tier===4?'地心引力：你有在聽嗎？':'空中續杯，沙坑加班';
 return bands[kind][tier];
}
