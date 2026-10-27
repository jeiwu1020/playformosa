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


// Hand-authored event lines, not claims that every combinatorial caption is newly written.
export const EVENT_LINES=Object.freeze({
 near:['距離先保密，氣勢有出來。','這一跳很節能，移動範圍很環保。','目的地不遠，動作倒是很多。','跳遠暫緩，先完成跳一下。','售票口還沒走到，就先降落了。','四肢準備環遊世界，先從門口開始。'],
 far:['別人是跳遠，你是國際轉機。','機票錢省下來，膝蓋先加班。','沙坑量到一半，決定改用地圖。','距離太有想法，裁判換了把尺。','四肢成功把運動會辦成旅遊團。','飛成這樣，已經不是校外教學。'],
 fall:['沙坑等了一整天，你選擇在門口躺下。','四肢還沒表決完，跑道先收工了。','旅程尚未開始，膝蓋已宣布放假。','助跑很有想法，地板很有吸引力。','今天的目的地：起點附近。','還沒離境，就先貼地旅行。'],
 foul:['飛得很有誠意，越線很沒禮貌。','裁判不認這一跳，海關倒是很忙。','護照蓋了章，成績蓋了不通過。','四肢飛出國，腳趾先違規。','世界很大，規則還是那一條線。','距離沒有問題，問題是越線。'],
 loop:['環遊世界回來，四肢還沒和好。','地球一圈了，腳還在找停車位。','別人跳遠，你在替地球量腰圍。','繞回起點不是零分，是飛行履歷。','環球航線完成，屁股準備下車。','飛了一圈，發現家裡早餐最好吃。'],
 backslide:['腳談好的距離，屁股不同意。','前面很精彩，最後倒退嚕。','落地先得分，身體隨後申請退款。','腳都簽收了，手又把包裹往回拖。','沙坑表示：以最後那個屁股印為準。','落點有進步，坐姿有退步。'],
 flipfeet:['翻得像洗衣機，落得像選手。','四肢吵了一路，最後居然有共識。','轉了幾圈，竟然沒有忘記腳在哪。','空中像事故，落地像故意的。','旋轉門開完，雙腳準時下班。','本來以為要出事，結果有點帥。'],
 head:['用頭腦參賽，不是這個意思。','腦袋先辦入住，腿還在找櫃台。','額頭說：這一站我先下。','全身都是乘客，腦袋是機頭。','里程累積到了額頭。','以為是跳遠，結果是頭等艙。'],
 butt:['屁股提前辦理入住。','飛行很努力，坐下很自然。','沙坑沙發試坐員，遠端出差中。','雙腿負責夢想，屁股負責簽收。','這不是失誤，是坐著觀光。','身體抵達，屁股搶到第一排。'],
 hand:['先握手，再著陸。','雙手替你辦好入境了。','腳還沒同意，手先按了確認。','空中快遞，手動簽收。','這次旅行，手比腳還積極。','落地時先伸手，禮貌滿分。'],
 recovery:['差點翻車，四肢臨時開了董事會。','搖得像要散架，居然救回來了。','身體說不行，你說再一下。','危機公關成功，姿勢仍待改善。','前半段是事故，後半段是技術。','四肢終於肯看同一份行程表。'],
 feet:['四肢終於達成共識。','這次真的是用腳抵達。','姿勢先不論，目的地有到。','地心引力今天跟你協商成功。','跑道給一個起點，你給它一段旅程。','腳先落地，尊嚴暫時保住。'],
 body:['全身都有參與感。','著陸方式，自成一派。','飛行很專業，停車很隨緣。','世界收到一份全身快遞。','姿勢還在路上，身體已到站。','四肢各自抵達，請自行集合。']
});
export const PLACE_LINES=Object.freeze({
 taiwan:['台灣落點：早餐店還在等你。','台灣到了，先吃一份蛋餅。','台灣這站，熟悉的地板最對味。','台灣組觀眾：這姿勢我們認得。'],
 sea:['太平洋到了，泳圈沒帶。','海面簽到，救生員正在皺眉。','目的地太平洋，訂房網站找不到。','太平洋這站，沒有月台。'],
 japan:['日本到了，拉麵還是熱的。','這次從台灣跳到日本，免排登機門。','日本組觀眾：入境姿勢很特別。','落點日本，下一餐可以換菜單了。'],
 egypt:['埃及到了，沙坑豪華升級。','埃及的沙，現在有你的形狀。','從台灣跳到埃及，行李只有四肢。','埃及這站，沙子管夠。'],
 france:['巴黎到了，入住方式比較激烈。','法國這站，優雅稍後補交。','從台灣跳到法國，先找一個可頌。','巴黎組觀眾：這也算行為藝術。'],
 usa:['美國到了，時差交給屁股處理。','落點美國，回程還能用同一雙腿嗎？','從台灣跳到美國，機票錢省下了。','美國這站，四肢正在倒時差。']
});
export const AUTHORED_CAPTION_COUNT=new Set([...Object.values(EVENT_LINES).flat(),...Object.values(PLACE_LINES).flat()]).size;
export const VERDICT_HISTORY_KEY='pf-longjump-verdicts-v8';
export function verdictCategory(info){const part=info.firstContact||info.nearestPart||'';return info.fallen?'fall':info.foul?'foul':info.loops>0?'loop':info.landingLoss>.35?'backslide':/腳/.test(part)&&info.flips>0?'flipfeet':/頭|額/.test(part)?'head':/屁/.test(part)?'butt':/手|肘/.test(part)?'hand':info.recoveries>0?'recovery':info.rawDistance>=210?'far':info.rawDistance!==null&&info.rawDistance<6?'near':/腳|膝/.test(part)?'feet':'body';}
export function pickVerdict(info,recent=[]){const category=verdictCategory(info),region=Object.hasOwn(PLACE_LINES,info.region)?info.region:'taiwan',a=EVENT_LINES[category],b=PLACE_LINES[region];const candidates=[];for(let j=0;j<b.length;j++)for(let i=0;i<a.length;i++)candidates.push({id:category+':'+region+':'+i+':'+j,category,text:a[i]+' '+b[j]});const blocked=new Set(recent);let choice=candidates.find(c=>!blocked.has(c.id));if(!choice)choice=candidates.reduce((x,y)=>recent.lastIndexOf(x.id)<recent.lastIndexOf(y.id)?x:y);return choice;}
const sessionHistories=new WeakMap();let unavailableStorageHistory=[];
const storageObject=storage=>storage!==null&&(typeof storage==='object'||typeof storage==='function');
export function readVerdictHistory(storage){if(storageObject(storage)&&sessionHistories.has(storage))return sessionHistories.get(storage).slice();let history=[];try{const a=JSON.parse(storage.getItem(VERDICT_HISTORY_KEY));history=Array.isArray(a)?a.filter(x=>typeof x==='string').slice(-24):[];}catch{}if(storageObject(storage))sessionHistories.set(storage,history);else history=unavailableStorageHistory;return history.slice();}
export function saveVerdictHistory(storage,history,id){const next=[...history,id].slice(-24);if(storageObject(storage))sessionHistories.set(storage,next);else unavailableStorageHistory=next;try{storage.setItem(VERDICT_HISTORY_KEY,JSON.stringify(next));}catch{}return next;}
export function settleVerdict(s,info,storage){const history=readVerdictHistory(storage),pick=pickVerdict({...info,firstContact:s.landingPart||s.firstPart,nearestPart:s.markPart,region:info.destination.id,loops:info.destination.loop,fallen:s.fallen,foul:s.foul,flips:s.rotations,recoveries:s.recoveries},history);s.verdict=pick.text;saveVerdictHistory(storage,history,pick.id);return pick;}
