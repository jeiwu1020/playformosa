const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export class ExpandedSportsRepository {
 constructor(db,scope){this.db=db;this.scope=scope;}
 async top(game,b){const r=await this.db.prepare(`SELECT nickname,score FROM leaderboard_best WHERE scope=? AND game=? AND rules=? ORDER BY score ${b.direction==='asc'?'ASC':'DESC'}, updated_at ASC, device ASC LIMIT 20`).bind(this.scope,game,b.rules).all();return r.results;}
 ownQuery(game,b,device){
  const better=b.direction==='asc'?'<':'>',nearest=b.direction==='asc'?'MAX':'MIN';
  return this.db.prepare(`SELECT me.nickname,me.score,
   (SELECT count(*)+1 FROM leaderboard_best other WHERE other.scope=me.scope AND other.game=me.game AND other.rules=me.rules AND other.score ${better} me.score) AS rank,
   (SELECT ${nearest}(other.score) FROM leaderboard_best other WHERE other.scope=me.scope AND other.game=me.game AND other.rules=me.rules AND other.score ${better} me.score) AS previous
   FROM leaderboard_best me WHERE me.scope=? AND me.game=? AND me.rules=? AND me.device=?`).bind(this.scope,game,b.rules,device||'');
 }
 ownRow(row){if(!row)return null;return {nickname:row.nickname,score:row.score,rank:Number(row.rank),gap:row.previous===null?null:Math.abs(row.previous-row.score)};}
 async own(game,b,deviceId){return deviceId?this.ownRow(await this.ownQuery(game,b,await digest(this.scope+':'+deviceId)).first()):null;}
 async board(game,b,deviceId=null){
  const device=deviceId?await digest(this.scope+':'+deviceId):null;
  const result=await this.db.batch([
   this.db.prepare(`SELECT nickname,score,device FROM leaderboard_best WHERE scope=? AND game=? AND rules=? ORDER BY score ${b.direction==='asc'?'ASC':'DESC'},updated_at ASC,device ASC LIMIT 20`).bind(this.scope,game,b.rules),this.ownQuery(game,b,device)]);
  let rank=0,prior=null;const entries=result[0].results.map((row,i)=>{if(row.score!==prior)rank=i+1;prior=row.score;return {nickname:row.nickname,score:row.score,rank,isMe:device!==null&&row.device===device};});
  return {entries,own:this.ownRow(result[1].results[0])};
 }
 async submit(data,b,now){
  const device=await digest(this.scope+':'+data.deviceId),payload=await digest(JSON.stringify(data)),day=Math.floor(now/86400000);
  const p=(sql,...args)=>this.db.prepare(sql).bind(...args);
  const existing=await p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId).first();
  if(existing)return existing.payload===payload?{accepted:true,duplicate:true,bestUpdated:false,own:await this.own(data.game,b,data.deviceId)}:{error:'conflict'};
  const rows=await this.db.batch([
   p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId),
   p('SELECT score FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?',this.scope,data.game,data.rules,device),
   p('DELETE FROM leaderboard_submissions WHERE rowid IN (SELECT rowid FROM leaderboard_submissions WHERE scope=? AND game=? AND rules=? AND created_at<? LIMIT 100)',this.scope,data.game,data.rules,now-7*86400000),
   p(`INSERT OR IGNORE INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE
    NOT EXISTS(SELECT 1 FROM leaderboard_submissions WHERE scope=? AND device=? AND created_at>? AND game=?)
    AND (SELECT count(*) FROM leaderboard_submissions WHERE scope=? AND day=?)<1000
    AND (EXISTS(SELECT 1 FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?) OR (SELECT count(*) FROM leaderboard_best WHERE scope=?)<10000)`,this.scope,data.submissionId,payload,device,data.game,data.rules,data.nickname,data.score,now,day,this.scope,device,now-60000,data.game,this.scope,day,this.scope,data.game,data.rules,device,this.scope),
   p(`INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at)
     SELECT scope,game,rules,device,nickname,score,created_at FROM leaderboard_submissions WHERE scope=? AND id=? AND payload=?
     ON CONFLICT(scope,game,rules,device) DO UPDATE SET nickname=excluded.nickname,score=excluded.score,updated_at=excluded.updated_at
     WHERE excluded.score ${b.direction==='asc'?'<':'>'} leaderboard_best.score`,this.scope,data.submissionId,payload),
   p('SELECT score FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?',this.scope,data.game,data.rules,device),
   p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId),
   p(`SELECT CASE
    WHEN (SELECT count(*) FROM leaderboard_submissions WHERE scope=? AND day=?)>=1000 THEN 'daily_limit'
    WHEN CASE
     WHEN EXISTS(SELECT 1 FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?) THEN 0
     ELSE (SELECT count(*) FROM leaderboard_best WHERE scope=?)>=10000
    END THEN 'capacity'
    ELSE (SELECT MAX(created_at) FROM leaderboard_submissions WHERE scope=? AND device=? AND game=? AND created_at>?)
    END AS limitation
    WHERE NOT EXISTS(SELECT 1 FROM leaderboard_submissions WHERE scope=? AND id=?)`,this.scope,day,this.scope,data.game,data.rules,device,this.scope,this.scope,device,data.game,now-60000,this.scope,data.submissionId)
  ]);
  const accepted=rows[6].results?.[0];
  if(!accepted){
   // Read in the same atomic batch as admission, so a concurrent request cannot change the reason.
   const limitation=rows[7].results[0].limitation;
   if(limitation==='daily_limit'||limitation==='capacity')return {error:'limited',reason:limitation};
   return {error:'limited',reason:'cooldown',retryAfterSeconds:Math.max(1,Math.ceil((limitation+60000-now)/1000))};
  }
  if(accepted.payload!==payload)return {error:'conflict'};
  const duplicate=Boolean(rows[0].results?.length),before=rows[1].results?.[0]?.score,after=rows[5].results?.[0]?.score;
  return {accepted:true,duplicate,bestUpdated:!duplicate&&after!==undefined&&(before===undefined||after!==before),own:await this.own(data.game,b,data.deviceId)};
 }
}
