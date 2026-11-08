const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export class PlayCountsRepository{
 constructor(db,scope){this.db=db;this.scope=scope;}
 async totals(){const rows=await this.db.prepare('SELECT counter_key,total,since FROM play_count_totals WHERE scope=? AND counter_key IN (?,?,?,?,?,?,?,?,?)').bind(this.scope,'long-jump','hurdles','high-jump','reaction-rod','fast-hands','fast-hands-catch','fast-hands-duel','home','taiwanfighter').all();const out={taiwanfighter:{count:0,since:null},'high-jump':{count:0,since:null},'long-jump':{count:0,since:null},hurdles:{count:0,since:null},'reaction-rod':{count:0,since:null},'fast-hands':{count:0,since:null},'fast-hands-catch':{count:0,since:null},'fast-hands-duel':{count:0,since:null},home:{count:0,since:null}};for(const r of rows.results)out[r.counter_key]={count:r.total,since:r.since};return out;}
 async start(data,now){const device=await digest(this.scope+':'+data.deviceId),payload=await digest(JSON.stringify([data.game,data.deviceId,data.runId,data.startedAt])),day=Math.floor(now/86400000),p=(q,...args)=>this.db.prepare(q).bind(...args);
 const home=data.game==='home',windowMs=home?1800000:2000;
 const rows=await this.db.batch([
 p('SELECT payload FROM play_count_receipts WHERE scope=? AND id=?',this.scope,data.runId),
 p('DELETE FROM play_count_receipts WHERE rowid IN (SELECT rowid FROM play_count_receipts WHERE scope=? AND created_at<? LIMIT 100)',this.scope,now-7*86400000),
 p(`INSERT OR IGNORE INTO play_count_receipts(scope,id,payload,device,counter_key,created_at,day)
 SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM play_count_receipts WHERE scope=? AND device=? AND created_at>? AND ${home?"counter_key='home'":"counter_key!='home'"})
 AND (SELECT count(*) FROM play_count_receipts WHERE scope=? AND day=? AND device=?)<100
 AND (SELECT COALESCE(SUM(day_total),0) FROM play_count_totals WHERE scope=? AND day=?)<10000`,this.scope,data.runId,payload,device,data.game,now,day,this.scope,device,now-windowMs,this.scope,day,device,this.scope,day),
 // Immediately follows receipt INSERT: changes() belongs to that INSERT, never cleanup.
 p(`INSERT INTO play_count_totals(scope,counter_key,total,since,day,day_total) SELECT ?,?,1,?,?,1 WHERE changes()=1
 ON CONFLICT(scope,counter_key) DO UPDATE SET total=play_count_totals.total+1,day=excluded.day,day_total=CASE WHEN play_count_totals.day=excluded.day THEN play_count_totals.day_total+1 ELSE 1 END`,this.scope,data.game,now,day),
 p('SELECT payload FROM play_count_receipts WHERE scope=? AND id=?',this.scope,data.runId),
 ...(home?[p("SELECT created_at FROM play_count_receipts WHERE scope=? AND device=? AND created_at>? AND counter_key='home' ORDER BY created_at DESC LIMIT 1",this.scope,device,now-1800000)]:[])]);
 const receipt=rows[4].results[0],lastHome=rows[5]?.results[0]?.created_at,nextEligibleAt=lastHome==null?null:lastHome+1800000;if(!receipt){if(home&&nextEligibleAt>now)return{accepted:true,counted:false,nextEligibleAt};return{error:'limited'}};if(receipt.payload!==payload)return{error:'conflict'};return{accepted:true,duplicate:rows[0].results.length>0,...(home?{counted:rows[0].results.length===0,nextEligibleAt}:{})};
 }
}

