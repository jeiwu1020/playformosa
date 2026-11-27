// Best-effort recorded starts; never awaited by gameplay, no offline queue or heartbeat.
export async function recordPlayStart(win,game){
 try{
 if(!['overtime-pinball','long-jump','hurdles','courtesy-contest','pole-vault','shot-put','discus','sprint-100m','run-400m','run-1500m','javelin','beer-slide','tower-climb','swing','horizontal-bar','turbo-slide'].includes(game))return;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;let deviceId;
 try{deviceId=win.localStorage.getItem('pf-leaderboard-device-v1')}catch{}
 if(!uuid.test(deviceId||'')){deviceId=win.crypto.randomUUID();try{win.localStorage.setItem('pf-leaderboard-device-v1',deviceId)}catch{}}
 const body=JSON.stringify({game,deviceId,runId:win.crypto.randomUUID(),startedAt:Date.now()});
 for(let attempt=0;attempt<2;attempt++){
 const controller=new win.AbortController(),timer=win.setTimeout(()=>controller.abort(),5000);let retry=false;
 try{const response=await win.fetch('/api/play-counts/starts',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal});retry=response.status===429||response.status===503;}catch{retry=true}finally{win.clearTimeout(timer)}
 if(!retry||attempt===1)return;
 await new Promise(resolve=>win.setTimeout(resolve,2500));
 }
 }catch{} // Storage/crypto/runtime failures must not interrupt a round.
}
