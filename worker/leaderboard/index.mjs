import {handlePlayCounts} from '../play-counts/index.mjs';
import {fighterEntryPath,handleFighterEntry} from '../play-counts/entries.mjs';
import {LeaderboardRepository} from './repository.mjs';
import {ExpandedSportsRepository} from './expanded-sports-repository.mjs';
import {ReactionRodRepository} from './reaction-rod-repository.mjs';
import {CourtesyRepository} from './courtesy-repository.mjs';
import {NOTE_FLOOR_MS} from '../../public/games/fast-hands/challenge.mjs';
export const BOARDS=Object.freeze({
 'high-jump':Object.freeze({rules:'cleared-height-v1',unit:'m',status:'cleared',direction:'desc',max:Number.MAX_VALUE}),
 'long-jump':Object.freeze({rules:'journey-km-v1',unit:'km',status:'valid',direction:'desc',max:Number.MAX_VALUE}),
 hurdles:Object.freeze({rules:'110m-8h-v1',unit:'s',status:'done',direction:'asc',max:180}),
 'reaction-rod':Object.freeze({rules:'catch-rating-v1',unit:'catches',status:'done',direction:'desc',max:10,secondary:true})
});
// Newly promoted boards use existing preview contracts, only in production.
export const EXPANDED_SPORTS_BOARDS=Object.freeze({
 'pole-vault':Object.freeze({rules:'real-altitude-v3',unit:'m',status:'done',direction:'desc',max:Number.MAX_VALUE}),
 'shot-put':Object.freeze({rules:'relay-distance-v1',unit:'m',status:'valid',direction:'desc',max:Number.MAX_VALUE}),
 discus:Object.freeze({rules:'wind-ufo-distance-v1',unit:'m',status:'valid',direction:'desc',max:Number.MAX_VALUE}),
 'beer-slide':Object.freeze({rules:'accuracy-retention-v1',unit:'points',status:'valid',direction:'desc',max:10}),
 'tower-climb':Object.freeze({rules:'indoor-10floors-v1',unit:'s',status:'summit',direction:'asc',max:60}),
 'run-400m':Object.freeze({rules:'400m-prototype-v3',unit:'s',status:'done',direction:'asc',min:30,max:3600,exclusiveMax:true}),
 'run-1500m':Object.freeze({rules:'1500m-rival-tiers-v5',unit:'s',status:'done',direction:'asc',max:Number.MAX_VALUE})
});
const isExpandedSport=game=>typeof game==='string'&&Object.hasOwn(EXPANDED_SPORTS_BOARDS,game);
// Courtesy alone offsets zero for the existing score>0 schema; no migration or legacy rewrites.
export const COURTESY_BOARD=Object.freeze({rules:'press-courtesy-v2',unit:'courtesies',status:'seated',direction:'desc',max:Number.MAX_SAFE_INTEGER-1,integer:true,allowZero:true,storageOffset:1,secondary:true,secondaryDirection:'asc',secondaryMax:30,primaryMetric:'courtesies',secondaryMetric:'remaining'});
// Fast Hands boards share the existing single-score repository, isolated by rules.
export const FAST_HANDS_BOARDS=Object.freeze({
 mouse:Object.freeze({rules:'shuttle-v3-mouse',unit:'ms',status:'success',direction:'asc',max:NOTE_FLOOR_MS,exclusiveMax:true}),
 touch:Object.freeze({rules:'shuttle-v3-touch',unit:'ms',status:'success',direction:'asc',max:NOTE_FLOOR_MS,exclusiveMax:true})
});
export const LEVEL_BOARDS=Object.freeze({
 'fast-hands-catch':Object.freeze({rules:'cleared-levels-v1',unit:'levels',status:'done',direction:'desc',max:Number.MAX_SAFE_INTEGER,integer:true}),
 'fast-hands-duel':Object.freeze({rules:'ten-round-wins-v1',unit:'wins',status:'done',direction:'desc',max:10,integer:true})
});
const isLevel=game=>typeof game==='string'&&Object.hasOwn(LEVEL_BOARDS,game);
const isFast=game=>game==='fast-hands'||isLevel(game);
function resolveBoard(game,rules,scope='production'){
 if(isExpandedSport(game))return scope==='production'?EXPANDED_SPORTS_BOARDS[game]:null;
 if(game==='courtesy-contest')return scope==='production'?COURTESY_BOARD:null;
 if(isLevel(game))return LEVEL_BOARDS[game];
 if(game==='fast-hands')return Object.values(FAST_HANDS_BOARDS).find(board=>board.rules===rules)??null;
 return typeof game==='string'&&Object.hasOwn(BOARDS,game)?BOARDS[game]:null;
}
const fields=['game','rules','unit','status','score','nickname','deviceId','submissionId'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateBaseSubmission(value,scope){
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==fields.length||Object.keys(value).some(k=>!fields.includes(k)))throw Error('invalid_fields');
 const b=resolveBoard(value.game,value.rules,scope);if(!b||value.rules!==b.rules||value.unit!==b.unit||value.status!==b.status)throw Error('invalid_board');
 if(typeof value.score!=='number'||!Number.isFinite(value.score)||(b.allowZero?value.score<0:value.score<=0)||(b.min!==undefined&&value.score<b.min)||value.score>b.max||(b.integer&&!Number.isSafeInteger(value.score))||(b.exclusiveMax&&value.score===b.max))throw Error('invalid_score');
 if(typeof value.nickname!=='string'||value.nickname!==value.nickname.trim()||[...value.nickname].length<1||[...value.nickname].length>20||new TextEncoder().encode(value.nickname).length>80||/[<>\p{Cc}\p{Cf}]/u.test(value.nickname))throw Error('invalid_nickname');
 if(typeof value.deviceId!=='string'||typeof value.submissionId!=='string'||!uuid.test(value.deviceId)||!uuid.test(value.submissionId))throw Error('invalid_id');
 return Object.fromEntries(fields.map(k=>[k,k==='deviceId'||k==='submissionId'?value[k].toLowerCase():value[k]]));
}
export function validateSubmission(value,scope='production'){
 if(value?.game==='courtesy-contest'){
  const {secondaryScore,...base}=value;
  if(typeof secondaryScore!=='number'||!Number.isFinite(secondaryScore)||secondaryScore<.01||secondaryScore>30||Math.abs(secondaryScore*100-Math.round(secondaryScore*100))>1e-9)throw Error('invalid_secondary');
  return {...validateBaseSubmission(base,scope),secondaryScore};
 }
 if(value?.game!=='reaction-rod')return validateBaseSubmission(value,scope);
 if(!Number.isInteger(value.score)||typeof value.secondaryScore!=='number'||!Number.isFinite(value.secondaryScore)||value.secondaryScore<0||value.secondaryScore>10)throw Error('invalid_secondary');
 const {secondaryScore,...base}=value;
 return {...validateBaseSubmission(base,scope),secondaryScore};
}
function parseSubmission(text,scope){
 const value=JSON.parse(text);
 if(isFast(value?.game)||value?.game==='courtesy-contest'){
  // JSON.parse alone silently keeps the last duplicate key. Scan complete string tokens
  // so escaped property names are compared correctly and quoted nickname text is ignored.
  const keys=new Set();
  for(const token of text.matchAll(/"(?:[^"\\]|\\.)*"/g)){
   if(!text.slice(token.index+token[0].length).trimStart().startsWith(':'))continue;
   const key=JSON.parse(token[0]);if(keys.has(key))throw Error('invalid_fields');keys.add(key);
  }
 }
 return validateSubmission(value,scope);
}
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
export async function handleRequest(request,env,now=Date.now(),context){
 const url=new URL(request.url);
 if(url.pathname===fighterEntryPath)return handleFighterEntry(request,env,now,context);
 if(url.pathname.startsWith('/api/play-counts'))return handlePlayCounts(request,env,now);
 if(!url.pathname.startsWith('/api/leaderboard'))return env.ASSETS?.fetch(request)??new Response('Not found',{status:404});
 if(env.LEADERBOARD_ENABLED!=='true'||!['qa','production'].includes(env.LEADERBOARD_SCOPE)||!env.DB||env.LEADERBOARD_ORIGIN!==url.origin)return json({error:'unavailable'},503);
 const repository=game=>isExpandedSport(game)?new ExpandedSportsRepository(env.DB,env.LEADERBOARD_SCOPE):game==='reaction-rod'?new ReactionRodRepository(env.DB,env.LEADERBOARD_SCOPE):game==='courtesy-contest'?new CourtesyRepository(env.DB,env.LEADERBOARD_SCOPE):new LeaderboardRepository(env.DB,env.LEADERBOARD_SCOPE);
 try{
  if(request.method==='GET'&&url.pathname==='/api/leaderboard'){
   const game=url.searchParams.get('game'),fast=game==='fast-hands',mode=url.searchParams.get('mode');
   const board=fast?(Object.hasOwn(FAST_HANDS_BOARDS,mode)?FAST_HANDS_BOARDS[mode]:null):resolveBoard(game,undefined,env.LEADERBOARD_SCOPE);
   const invalidQuery=fast
    ?url.searchParams.getAll('game').length!==1||url.searchParams.getAll('mode').length!==1||[...url.searchParams.keys()].some(k=>k!=='game'&&k!=='mode')
    :((isLevel(game)||game==='courtesy-contest')&&url.searchParams.getAll('game').length!==1)||[...url.searchParams.keys()].some(k=>k!=='game');
   if(!board||invalidQuery)return json({error:'invalid_board'},400);
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
  let data;try{data=parseSubmission(new TextDecoder('utf-8',{fatal:true}).decode(bytes),env.LEADERBOARD_SCOPE);}catch{return json({error:'invalid_submission'},400);}
  if((isFast(data.game)||data.game==='courtesy-contest')&&url.search)return json({error:'invalid_submission'},400);
  const result=await repository(data.game).submit(data,resolveBoard(data.game,data.rules,env.LEADERBOARD_SCOPE),now);
  const retryHeaders=result.error==='limited'&&result.reason==='cooldown'?{'Retry-After':String(result.retryAfterSeconds)}:{};
  return json(result,result.error==='conflict'?409:result.error==='limited'?429:200,retryHeaders);
 }catch{return json({error:'temporarily_unavailable'},503);}
}
export default {fetch(request,env,context){return handleRequest(request,env,Date.now(),context);}};

