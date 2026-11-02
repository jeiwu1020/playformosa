export async function loadPlayCounts(document,{fetcher=(...args)=>document.defaultView.fetch(...args)}={}){
 const nodes=[...document.querySelectorAll('[data-play-count],[data-home-count]')];if(!nodes.length)return;
 const win=document.defaultView;let timer;
 try{const controller=new win.AbortController();timer=win.setTimeout(()=>controller.abort(),5000);const response=await fetcher('/api/play-counts',{signal:controller.signal});if(!response.ok)throw Error('unavailable');const data=await response.json();for(const n of nodes){const count=data.counts?.[n.hasAttribute('data-home-count')?'home':n.dataset.playCount]?.count;n.textContent=Number.isSafeInteger(count)&&count>=0?(n.hasAttribute('data-home-count')?'累積瀏覽 ':'已開玩 ')+count.toLocaleString()+' 次':'次數暫時讀不到';}}
 catch{for(const n of nodes)n.textContent='次數暫時讀不到';}finally{win.clearTimeout(timer)}
}

const homeWindow=1800000,marker='pf-home-view-until-v1',uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function recordHomeView(win,{fetcher=(...args)=>win.fetch(...args)}={}){
 try{
 const now=Date.now();let until,deviceId;try{until=Number(win.localStorage.getItem(marker));deviceId=win.localStorage.getItem('pf-leaderboard-device-v1')}catch{}
 if(uuid.test(deviceId||'')&&Number.isFinite(until)&&until>now&&until<=now+homeWindow)return;
 if(!uuid.test(deviceId||'')){deviceId=win.crypto.randomUUID();try{win.localStorage.setItem('pf-leaderboard-device-v1',deviceId)}catch{}}
 const body=JSON.stringify({game:'home',deviceId,runId:win.crypto.randomUUID(),startedAt:now});
 for(let attempt=0;attempt<2;attempt++){
 const controller=new win.AbortController(),timer=win.setTimeout(()=>controller.abort(),5000);let retry=false;
 try{const r=await fetcher('/api/play-counts/views',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal});if(r.ok){const result=await r.json(),expiry=result.nextEligibleAt;if(result.accepted===true&&Number.isSafeInteger(expiry)&&expiry>Date.now()&&expiry<=Date.now()+homeWindow){try{win.localStorage.setItem(marker,String(expiry))}catch{}}return;}retry=r.status===503||r.status===429;}catch{retry=true}finally{win.clearTimeout(timer)}
 if(!retry||attempt===1)return;await new Promise(resolve=>win.setTimeout(resolve,2500));
 }
 }catch{} // Storage, crypto, network and quota failure never blocks navigation.
}
const initialized=new WeakMap();
export function initializeHomeCounts(document,options={}){
 if(initialized.has(document))return initialized.get(document);
 const task=(async()=>{
 if(document.visibilityState==='hidden'||document.prerendering)await new Promise(resolve=>{const ready=()=>{if(document.visibilityState!=='hidden'&&!document.prerendering){document.removeEventListener('visibilitychange',ready);document.removeEventListener('prerenderingchange',ready);resolve();}};document.addEventListener('visibilitychange',ready);document.addEventListener('prerenderingchange',ready);});
 if(document.querySelector('[data-home-count]'))await recordHomeView(document.defaultView,options);
 await loadPlayCounts(document,options);
 })();initialized.set(document,task);return task;
}
if(typeof document!=='undefined')void initializeHomeCounts(document);
