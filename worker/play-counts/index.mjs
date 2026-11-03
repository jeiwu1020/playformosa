import{PlayCountsRepository}from'./repository.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,fields=['game','deviceId','runId','startedAt'];
export function validateStart(v,now,home=false){if(!v||Array.isArray(v)||typeof v!=='object'||Object.keys(v).length!==4||Object.keys(v).some(k=>!fields.includes(k))||!(home?['home']:['long-jump','hurdles','reaction-rod']).includes(v.game)||typeof v.deviceId!=='string'||typeof v.runId!=='string'||!uuid.test(v.deviceId)||!uuid.test(v.runId)||!Number.isSafeInteger(v.startedAt)||v.startedAt<now-600000||v.startedAt>now+30000)throw Error('invalid_start');return{game:v.game,deviceId:v.deviceId.toLowerCase(),runId:v.runId.toLowerCase(),startedAt:v.startedAt};}
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export async function handlePlayCounts(request,env,now=Date.now()){
 const u=new URL(request.url);if(env.PLAY_COUNTS_ENABLED!=='true'||!['qa','production'].includes(env.LEADERBOARD_SCOPE)||env.LEADERBOARD_ORIGIN!==u.origin||!env.DB)return json({error:'unavailable'},503);
 try{const repo=new PlayCountsRepository(env.DB,env.LEADERBOARD_SCOPE);
 if(u.search)return json({error:'invalid_query'},400);
 if(request.method==='GET'&&u.pathname==='/api/play-counts')return json({counts:await repo.totals()},200,{'Cache-Control':'public, max-age=30'});
 if(request.method!=='POST'||!['/api/play-counts/starts','/api/play-counts/views'].includes(u.pathname))return json({error:'method_not_allowed'},405);
 if(request.headers.get('Origin')!==env.LEADERBOARD_ORIGIN)return json({error:'origin'},403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return json({error:'content_type'},415);
 if(Number(request.headers.get('Content-Length'))>1024)return json({error:'too_large'},413);
 const reader=request.body?.getReader();if(!reader)return json({error:'invalid_body'},400);let size=0,chunks=[];while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return json({error:'too_large'},413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let off=0;for(const c of chunks){bytes.set(c,off);off+=c.length}let data;try{data=validateStart(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),now,u.pathname.endsWith('/views'))}catch{return json({error:'invalid_start'},400)}
 const result=await repo.start(data,now);return json(result,result.error==='conflict'?409:result.error==='limited'?429:200,result.error==='limited'?{'Retry-After':'2'}:{});
 }catch{return json({error:'temporarily_unavailable'},503)}
}
