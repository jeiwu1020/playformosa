import {handlePlayCounts} from '../play-counts/index.mjs';
import {LeaderboardRepository} from './repository.mjs';
import {NOTE_FLOOR_MS} from '../../public/games/fast-hands/challenge.mjs';
export const BOARDS=Object.freeze({
 'long-jump':Object.freeze({rules:'journey-km-v1',unit:'km',status:'valid',direction:'desc',max:Number.MAX_VALUE}),
 hurdles:Object.freeze({rules:'110m-8h-v1',unit:'s',status:'done',direction:'asc',max:180}),
 'high-jump':Object.freeze({rules:'cleared-height-v1',unit:'m',status:'cleared',direction:'desc',max:Number.MAX_VALUE}),
 'pole-vault':Object.freeze({rules:'highest-feet-v1',unit:'m',status:'done',direction:'desc',max:Number.MAX_VALUE}),
 'shot-put':Object.freeze({rules:'relay-distance-v1',unit:'m',status:'valid',direction:'desc',max:Number.MAX_VALUE}),
 discus:Object.freeze({rules:'wind-ufo-distance-v1',unit:'m',status:'valid',direction:'desc',max:Number.MAX_VALUE}),
 'reaction-rod':Object.freeze({rules:'catch-rating-v1',unit:'catches',status:'done',direction:'desc',max:10,secondary:true}),
 'beer-slide':Object.freeze({rules:'accuracy-retention-v1',unit:'points',status:'valid',direction:'desc',max:10}),
 'tower-climb':Object.freeze({rules:'indoor-10floors-v1',unit:'s',status:'summit',direction:'asc',max:60})
});
// Fast Hands rules isolate the two input modes without changing the nine legacy boards.
export const FAST_HANDS_BOARDS=Object.freeze({
 mouse:Object.freeze({rules:'shuttle-v3-mouse',unit:'ms',status:'success',direction:'asc',max:NOTE_FLOOR_MS,exclusiveMax:true}),
 touch:Object.freeze({rules:'shuttle-v3-touch',unit:'ms',status:'success',direction:'asc',max:NOTE_FLOOR_MS,exclusiveMax:true})
});
function resolveBoard(game,rules){
 if(game==='fast-hands')return Object.values(FAST_HANDS_BOARDS).find(board=>board.rules===rules)??null;
 return typeof game==='string'&&Object.hasOwn(BOARDS,game)?BOARDS[game]:null;
}
const fields=['game','rules','unit','status','score','nickname','deviceId','submissionId'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateSubmission(value){
 if(!value||Array.isArray(value)||typeof value!=='object'||(Object.keys(value).length!==fields.length&&Object.keys(value).length!==fields.length+1)||fields.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!fields.includes(k)&&k!=='secondaryScore'))throw Error('invalid_fields');
 if(value.game==='fast-hands'&&Object.keys(value).length!==fields.length)throw Error('invalid_fields');
 const b=resolveBoard(value.game,value.rules);if(!b||value.rules!==b.rules||value.unit!==b.unit||value.status!==b.status)throw Error('invalid_board');
 if(typeof value.score!=='number'||!Number.isFinite(value.score)||value.score<=0||value.score>b.max||(b.exclusiveMax&&value.score===b.max))throw Error('invalid_score');
 if(b.secondary){if(!Number.isInteger(value.score)||typeof value.secondaryScore!=='number'||!Number.isFinite(value.secondaryScore)||value.secondaryScore<0||value.secondaryScore>10)throw Error('invalid_secondary');}
 else if(Object.hasOwn(value,'secondaryScore')&&value.secondaryScore!==0)throw Error('invalid_secondary');
 if(typeof value.nickname!=='string'||value.nickname!==value.nickname.trim()||[...value.nickname].length<1||[...value.nickname].length>20||new TextEncoder().encode(value.nickname).length>80||/[<>\p{Cc}\p{Cf}]/u.test(value.nickname))throw Error('invalid_nickname');
 if(typeof value.deviceId!=='string'||typeof value.submissionId!=='string'||!uuid.test(value.deviceId)||!uuid.test(value.submissionId))throw Error('invalid_id');
 return Object.fromEntries([...fields,...(b.secondary?['secondaryScore']:[])].map(k=>[k,k==='deviceId'||k==='submissionId'?value[k].toLowerCase():value[k]]));
}
function parseSubmission(text){
 const value=JSON.parse(text);
 if(value?.game==='fast-hands'){
  // JSON.parse alone silently keeps the last duplicate key. Scan complete string tokens
  // so escaped property names are compared correctly and quoted nickname text is ignored.
  const keys=new Set();
  for(const token of text.matchAll(/"(?:[^"\\]|\\.)*"/g)){
   if(!text.slice(token.index+token[0].length).trimStart().startsWith(':'))continue;
   const key=JSON.parse(token[0]);if(keys.has(key))throw Error('invalid_fields');keys.add(key);
  }
 }
 return validateSubmission(value);
}
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
export async function handleRequest(request,env,now=Date.now()){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/play-counts'))return handlePlayCounts(request,env,now);
 if(!url.pathname.startsWith('/api/leaderboard'))return env.ASSETS?.fetch(request)??new Response('Not found',{status:404});
 if(env.LEADERBOARD_ENABLED!=='true'||!['qa','production'].includes(env.LEADERBOARD_SCOPE)||!env.DB||env.LEADERBOARD_ORIGIN!==url.origin)return json({error:'unavailable'},503);
 const repo=new LeaderboardRepository(env.DB,env.LEADERBOARD_SCOPE);
 try{
  if(request.method==='GET'&&url.pathname==='/api/leaderboard'){
   const game=url.searchParams.get('game'),fast=game==='fast-hands',mode=url.searchParams.get('mode');
   const board=fast?(Object.hasOwn(FAST_HANDS_BOARDS,mode)?FAST_HANDS_BOARDS[mode]:null):resolveBoard(game);
   const invalidQuery=fast
    ?url.searchParams.getAll('game').length!==1||url.searchParams.getAll('mode').length!==1||[...url.searchParams.keys()].some(k=>k!=='game'&&k!=='mode')
    :[...url.searchParams.keys()].some(k=>k!=='game');
   if(!board||invalidQuery)return json({error:'invalid_board'},400);
   if(fast&&env.LEADERBOARD_SCOPE!=='qa')return json({error:'unavailable'},503);
   const device=request.headers.get('X-Leaderboard-Device');if(device!==null&&!uuid.test(device))return json({error:'invalid_id'},400);
   return json({game,rules:board.rules,unit:board.unit,...await repo.board(game,board,device?.toLowerCase())},200,{'Cache-Control':device?'private, no-store':'public, max-age=30','Vary':'X-Leaderboard-Device'});
  }
  if(request.method!=='POST'||url.pathname!=='/api/leaderboard/submissions')return json({error:'method_not_allowed'},405);
  if(request.headers.get('Origin')!==env.LEADERBOARD_ORIGIN)return json({error:'origin'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return json({error:'content_type'},415);
  if(Number(request.headers.get('Content-Length'))>2048)return json({error:'too_large'},413);
  const reader=request.body?.getReader();if(!reader)return json({error:'invalid_body'},400);
  let total=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>2048){await reader.cancel();return json({error:'too_large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(total);let off=0;for(const c of chunks){bytes.set(c,off);off+=c.length;}
  let data;try{data=parseSubmission(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return json({error:'invalid_submission'},400);}
  if(data.game==='fast-hands'){
   if(url.search)return json({error:'invalid_submission'},400);
   if(env.LEADERBOARD_SCOPE!=='qa')return json({error:'unavailable'},503);
  }
  const result=await repo.submit(data,resolveBoard(data.game,data.rules),now);
  return json(result,result.error==='conflict'?409:result.error==='limited'?429:200,result.error==='limited'?{'Retry-After':'60'}:{});
 }catch{return json({error:'temporarily_unavailable'},503);}
}
export default {fetch(request,env){return handleRequest(request,env);}};
