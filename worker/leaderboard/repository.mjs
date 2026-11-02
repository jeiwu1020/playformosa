const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export class LeaderboardRepository {
 constructor(db,scope){this.db=db;this.scope=scope;}
 ordering(b){return `score ${b.direction==='asc'?'ASC':'DESC'}${b.secondary?',secondary_score DESC':''},device ASC`;}
 better(b,left,right){const op=b.direction==='asc'?'<':'>';return b.secondary?`(${left}.score,${left}.secondary_score)>(${right}.score,${right}.secondary_score)`:`${left}.score ${op} ${right}.score`;}
 async top(game,b){return (await this.board(game,b)).entries.map(({nickname,score,...rest})=>({nickname,score,...(b.secondary?{secondaryScore:rest.secondaryScore}:{})}));}
 ownQuery(game,b,device){
  const better=this.better(b,'other','me'),reverse=b.direction==='asc'?'DESC':'ASC';
  const from=`FROM leaderboard_best other WHERE other.scope=me.scope AND other.game=me.game AND other.rules=me.rules AND ${better}`;
  const order=`ORDER BY other.score ${reverse}${b.secondary?',other.secondary_score ASC':''} LIMIT 1`;
  return this.db.prepare(`SELECT me.nickname,me.score,me.secondary_score,
   (SELECT count(*)+1 ${from}) AS rank,
   (SELECT other.score ${from} ${order}) AS previous,
   (SELECT other.secondary_score ${from} ${order}) AS previous_secondary
   FROM leaderboard_best me WHERE me.scope=? AND me.game=? AND me.rules=? AND me.device=?`).bind(this.scope,game,b.rules,device||'');
 }
 ownRow(row,b){if(!row)return null;const secondaryGap=b.secondary&&row.previous===row.score;return {nickname:row.nickname,score:row.score,rank:Number(row.rank),gap:row.previous===null?null:Math.abs(secondaryGap?row.previous_secondary-row.secondary_score:row.previous-row.score),...(b.secondary?{secondaryScore:row.secondary_score,gapMetric:row.previous===null?null:secondaryGap?'rating':'catches'}:{})};}
 async own(game,b,deviceId){return deviceId?this.ownRow(await this.ownQuery(game,b,await digest(this.scope+':'+deviceId)).first(),b):null;}
 async board(game,b,deviceId=null){
  const device=deviceId?await digest(this.scope+':'+deviceId):null;
  const result=await this.db.batch([
   this.db.prepare(`SELECT nickname,score,secondary_score,device FROM leaderboard_best WHERE scope=? AND game=? AND rules=? ORDER BY ${this.ordering(b)} LIMIT 20`).bind(this.scope,game,b.rules),this.ownQuery(game,b,device)]);
  let rank=0,prior=null,secondary=null;const entries=result[0].results.map((row,i)=>{if(row.score!==prior||(b.secondary&&row.secondary_score!==secondary))rank=i+1;prior=row.score;secondary=row.secondary_score;return {nickname:row.nickname,score:row.score,rank,isMe:device!==null&&row.device===device,...(b.secondary?{secondaryScore:row.secondary_score}:{})};});
  return {entries,own:this.ownRow(result[1].results[0],b)};
 }
 async submit(data,b,now){
  const device=await digest(this.scope+':'+data.deviceId),payload=await digest(JSON.stringify(data)),day=Math.floor(now/86400000);
  const p=(sql,...args)=>this.db.prepare(sql).bind(...args);
  const existing=await p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId).first();
  if(existing)return existing.payload===payload?{accepted:true,duplicate:true,bestUpdated:false,own:await this.own(data.game,b,data.deviceId)}:{error:'conflict'};
  const rows=await this.db.batch([
   p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId),
   p('SELECT score,secondary_score FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?',this.scope,data.game,data.rules,device),
   p('DELETE FROM leaderboard_submissions WHERE rowid IN (SELECT rowid FROM leaderboard_submissions WHERE scope=? AND created_at<? LIMIT 100)',this.scope,now-7*86400000),
   p(`INSERT OR IGNORE INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day,secondary_score)
    SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE
    NOT EXISTS(SELECT 1 FROM leaderboard_submissions WHERE scope=? AND device=? AND created_at>?)
    AND (SELECT count(*) FROM leaderboard_submissions WHERE scope=? AND day=?)<1000
    AND (EXISTS(SELECT 1 FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?) OR (SELECT count(*) FROM leaderboard_best WHERE scope=?)<10000)`,this.scope,data.submissionId,payload,device,data.game,data.rules,data.nickname,data.score,now,day,data.secondaryScore??0,this.scope,device,now-60000,this.scope,day,this.scope,data.game,data.rules,device,this.scope),
   p(`INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at,secondary_score)
     SELECT scope,game,rules,device,nickname,score,created_at,secondary_score FROM leaderboard_submissions WHERE scope=? AND id=? AND payload=?
     ON CONFLICT(scope,game,rules,device) DO UPDATE SET nickname=excluded.nickname,score=excluded.score,updated_at=excluded.updated_at,secondary_score=excluded.secondary_score
     WHERE ${this.better(b,'excluded','leaderboard_best')}`,this.scope,data.submissionId,payload),
   p('SELECT score,secondary_score FROM leaderboard_best WHERE scope=? AND game=? AND rules=? AND device=?',this.scope,data.game,data.rules,device),
   p('SELECT payload FROM leaderboard_submissions WHERE scope=? AND id=?',this.scope,data.submissionId)
  ]);
  const accepted=rows.at(-1).results?.[0];if(!accepted)return {error:'limited'};if(accepted.payload!==payload)return {error:'conflict'};
  const duplicate=Boolean(rows[0].results?.length),before=rows[1].results?.[0],after=rows.at(-2).results?.[0];
  return {accepted:true,duplicate,bestUpdated:!duplicate&&after!==undefined&&(before===undefined||after.score!==before.score||after.secondary_score!==before.secondary_score),own:await this.own(data.game,b,data.deviceId)};
 }
}
