// One deterministic, performance-specific line per completed result; no random replay changes.
const lines={
 fall:['四肢開會，重心先離席。','跑道沒有動，是重心先轉台。','今天的地板，搶先收到你的擁抱。'],
 runpast:['橫桿以為你是來巡場的。','助跑很完整，起跳忘了出席。','這條跑道，你走得比裁判還熟。'],
 under:['這次走的是地下通道。','橫桿：我在上面，你往哪裡去？','高度還在路上，人已經先到了。'],
 head:['頭先打招呼，橫桿先請假。','額頭刷卡了，這裡不是感應門。','想法很高，頭卻先碰到現實。'],
 hip:['髖部通關文件，還差一個章。','肩膀過關，屁股還在排隊。','腰過去了，髖部決定再聊兩句。'],
 foot:['人過了，鞋子留下來加班。','腳跟：等等，我還沒上車！','鞋底蓋章成功，過桿申請退件。'],
 arm:['手說先扶一下，橫桿說不用。','手臂很熱情，橫桿有點招架不住。','這不是扶手，手先別客氣。'],
 shoulder:['肩膀想扛全場，順便扛了橫桿。','背影很帥，橫桿看得太近。','肩背先進場，通行證還沒拿好。'],
 early:['起跳很有誠意，離橫桿還有點遠。','升空通知發得比登機時間還早。','飛得起來，只是目的地還沒到。'],
 late:['起跳時機：已讀，但晚回。','這一跳發車了，月台剛好過站。','腿收到起跳通知時，橫桿已在旁邊。'],
 miss:['這一跳先存檔，下次再破關。','四肢各有想法，還沒喬好同一班車。','橫桿今天暫時保住主場優勢。'],
 recovery:['剛才差點散會，最後全員過桿。','重心一度請假，你又把它叫回來了。','這個救回來，比直接過還有戲。'],
 sky:['房東正在研究加蓋天花板。','這個高度，電梯開始懷疑自己的工作。','橫桿：我只是上班，不想上太空。'],
 high:['電梯按鈕：這位直接略過我。','樓上的鄰居，請收下這個背影。','地心引力今天被你加班處理了。'],
 middle:['房門表示：高度方面我認輸。','背一弓，今天的門改開在樓上。','橫桿看著你過去，連請假理由都省了。'],
 clear:['過了！橫桿這次保住工作。','四肢終於搭上同一班車。','膝蓋點頭，腳跟也準時收工。']};
export function verdictCategory(s){if(s.success)return s.recoveries>0?'recovery':s.height>=30?'sky':s.height>=10?'high':s.height>=3?'middle':'clear';if(s.fallen)return'fall';if(!s.launches)return'runpast';const part=s.hitPart||'';if(/頭/.test(part))return'head';if(/髖/.test(part))return'hip';if(/腳|膝/.test(part))return'foot';if(/手/.test(part))return'arm';if(/肩|背/.test(part))return'shoulder';if(s.underBar)return'under';if(s.launchX<-2.3)return'early';if(s.launchX>-1)return'late';return'miss';}
export function selectVerdict(s){const category=verdictCategory(s),pool=lines[category];let hash=2166136261;const signature=[category,s.launchX,s.takeoffSpeed,s.target,s.peak,s.t].map(v=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(3):String(v??'')).join('|');for(const c of signature)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;return pool[hash%pool.length];}
