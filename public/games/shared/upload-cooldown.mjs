/** Per-controller/game deadline survives new rounds; timers never submit a score. */
export function createUploadCooldown(win,onChange){
 let until=0,timer=null,kind='cooldown';
 const remaining=()=>Math.max(0,Math.ceil((until-win.Date.now())/1000));
 function cancel(){if(timer!==null)win.clearTimeout(timer);timer=null}
 function tick(){cancel();onChange();if(remaining()>0)timer=win.setTimeout(tick,Math.min(1000,until-win.Date.now()))}
 function start(seconds,reason='cooldown'){kind=reason;until=win.Date.now()+Math.min(60,seconds)*1000;tick()}
 return {
  remaining,
  message(){const seconds=remaining();return seconds>0?(kind==='cooldown'?'本關上傳冷卻中':'提交暫時達限')+'，請等待 '+seconds+' 秒後手動重試；不會自動上傳。':''},
  accepted(data){if(data?.duplicate!==true)start(60)},
  limited(response,data){
   if(data?.reason==='daily_limit')return '排行榜今日提交總量已達每日上限，請於每日額度重設後再手動重試；仍可繼續遊玩。';
   if(data?.reason==='capacity')return '排行榜容量已滿，目前無法收錄；請稍後確認服務恢復再手動重試。';
   const body=Number(data?.retryAfterSeconds),header=response.headers?.get?.('Retry-After');
   const parsed=header===null||header===undefined?NaN:Number(header);
   const seconds=Number.isFinite(body)&&body>0?body:Number.isFinite(parsed)&&parsed>0?parsed:Math.max(0,(Date.parse(header)-win.Date.now())/1000);
   start(Number.isFinite(seconds)&&seconds>0?Math.ceil(seconds):60,data?.reason==='cooldown'?'cooldown':'limited');
   return this.message();
  },
  destroy(){cancel();until=0}
 };
}
