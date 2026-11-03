import {handlePlayCounts} from '../play-counts/index.mjs';
import {LeaderboardRepository} from './repository.mjs';
import {ReactionRodRepository} from './reaction-rod-repository.mjs';
export const BOARDS=Object.freeze({
 'long-jump':Object.freeze({rules:'journey-km-v1',unit:'km',status:'valid',direction:'desc',max:Number.MAX_VALUE}),
 hurdles:Object.freeze({rules:'110m-8h-v1',unit:'s',status:'done',direction:'asc',max:180}),
 'reaction-rod':Object.freeze({rules:'catch-rating-v1',unit:'catches',status:'done',direction:'desc',max:10,secondary:true})
});
const fields=['game','rules','unit','status','score','nickname','deviceId','submissionId'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateBaseSubmission(value){
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==fields.length||Object.keys(value).some(k=>!fields.includes(k)))throw Error('invalid_fields');
 const b=typeof value.game==='string'&&Object.hasOwn(BOARDS,value.game)?BOARDS[value.game]:null;if(!b||value.rules!==b.rules||value.unit!==b.unit||value.status!==b.status)throw Error('invalid_board');
 if(typeof value.score!=='number'||!Number.isFinite(value.score)||value.score<=0||value.score>b.max)throw Error('invalid_score');
 if(typeof value.nickname!=='string'||value.nickname!==value.nickname.trim()||[...value.nickname].length<1||[...value.nickname].length>20||new TextEncoder().encode(value.nickname).length>80||/[<>\p{Cc}\p{Cf}]/u.test(value.nickname))throw Error('invalid_nickname');
 if(typeof value.deviceId!=='string'||typeof value.submissionId!=='string'||!uuid.test(value.deviceId)||!uuid.test(value.submissionId))throw Error('invalid_id');
 return Object.fromEntries(fields.map(k=>[k,k==='deviceId'||k==='submissionId'?value[k].toLowerCase():value[k]]));
}
export function validateSubmission(value){
 if(value?.game!=='reaction-rod')return validateBaseSubmission(value);
 if(!Number.isInteger(value.score)||typeof value.secondaryScore!=='number'||!Number.isFinite(value.secondaryScore)||value.secondaryScore<0||value.secondaryScore>10)throw Error('invalid_secondary');
 const {secondaryScore,...base}=value;
 return {...validateBaseSubmission(base),secondaryScore};
}
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
export async function handleRequest(request,env,now=Date.now()){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/play-counts'))return handlePlayCounts(request,env,now);
 if(!url.pathname.startsWith('/api/leaderboard'))return env.ASSETS?.fetch(request)??new Response('Not found',{status:404});
 if(env.LEADERBOARD_ENABLED!=='true'||!['qa','production'].includes(env.LEADERBOARD_SCOPE)||!env.DB||env.LEADERBOARD_ORIGIN!==url.origin)return json({error:'unavailable'},503);
 const repository=game=>game==='reaction-rod'?new ReactionRodRepository(env.DB,env.LEADERBOARD_SCOPE):new LeaderboardRepository(env.DB,env.LEADERBOARD_SCOPE);
 try{
  if(request.method==='GET'&&url.pathname==='/api/leaderboard'){
   const game=url.searchParams.get('game'),board=Object.hasOwn(BOARDS,game)?BOARDS[game]:null;
   if(!board||[...url.searchParams.keys()].some(k=>k!=='game'))return json({error:'invalid_board'},400);
   const device=request.headers.get('X-Leaderboard-Device');if(device!==null&&!uuid.test(device))return json({error:'invalid_id'},400);
   return json({game,rules:board.rules,unit:board.unit,...await repository(game).board(game,board,device?.toLowerCase())},200,{'Cache-Control':device?'private, no-store':'public, max-age=30','Vary':'X-Leaderboard-Device'});
  }
  if(request.method!=='POST'||url.pathname!=='/api/leaderboard/submissions')return json({error:'method_not_allowed'},405);
  if(request.headers.get('Origin')!==env.LEADERBOARD_ORIGIN)return json({error:'origin'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return json({error:'content_type'},415);
  if(Number(request.headers.get('Content-Length'))>2048)return json({error:'too_large'},413);
  const reader=request.body?.getReader();if(!reader)return json({error:'invalid_body'},400);
  let total=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>2048){await reader.cancel();return json({error:'too_large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(total);let off=0;for(const c of chunks){bytes.set(c,off);off+=c.length;}
  let data;try{data=validateSubmission(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch{return json({error:'invalid_submission'},400);}
  const result=await repository(data.game).submit(data,BOARDS[data.game],now);
  return json(result,result.error==='conflict'?409:result.error==='limited'?429:200,result.error==='limited'?{'Retry-After':'60'}:{});
 }catch{return json({error:'temporarily_unavailable'},503);}
}
export default {fetch(request,env){return handleRequest(request,env);}};
