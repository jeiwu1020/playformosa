export class LeaderboardRepository {
 constructor(db,scope){this.db=db;this.scope=scope;}
 async top(game,b){const r=await this.db.prepare(`SELECT nickname,score FROM leaderboard_best WHERE scope=? AND game=? AND rules=? ORDER BY score ${b.direction==='asc'?'ASC':'DESC'}, updated_at ASC, device ASC LIMIT 20`).bind(this.scope,game,b.rules).all();return r.results;}
 async submit(data,b,now){
  const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const device=await digest(this.scope+':'+data.deviceId),payload=await digest(JSON.stringify(data)),day=Math.floor(now/86400000);
  const p=(sql,...args)=>this.db.prepare(sql).bind(...args);
  const existing=await p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId).first();
  if(existing)return existing.payload===payload?{accepted:true,duplicate:true}:{error:'conflict'};
  const rows=await this.db.batch([
   p('DELETE FROM leaderboard_submissions WHERE rowid IN (SELECT rowid FROM leaderboard_submissions WHERE scope=? AND created_at<? LIMIT 100)',this.scope,now-7*86400000),
   p(`INSERT OR IGNORE INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE
    NOT EXISTS(SELECT 1 FROM leaderboard_submissions WHERE scope=? AND device=? AND created_at>?)
    AND (SELECT count(*) FROM leaderboard_submissions WHERE scope=? AND day=?)<1000
    AND (EXISTS(SELECT 1 FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?) OR (SELECT count(*) FROM leaderboard_best WHERE scope=?)<10000)`,this.scope,data.submissionId,payload,device,data.game,data.rules,data.nickname,data.score,now,day,this.scope,device,now-60000,this.scope,day,this.scope,data.game,data.rules,device,this.scope),
   p(`INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at)
     SELECT scope,game,rules,device,nickname,score,created_at FROM leaderboard_submissions WHERE scope=? AND id=? AND payload=?
     ON CONFLICT(scope,game,rules,device) DO UPDATE SET nickname=excluded.nickname,score=excluded.score,updated_at=excluded.updated_at
     WHERE excluded.score ${b.direction==='asc'?'<':'>'} leaderboard_best.score`,this.scope,data.submissionId,payload),
   p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId)
  ]);
  const accepted=rows.at(-1).results?.[0];return !accepted?{error:'limited'}:accepted.payload!==payload?{error:'conflict'}:{accepted:true,duplicate:false};
 }
}
