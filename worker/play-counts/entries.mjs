// Native navigation covers touch, Enter, modifier/middle clicks and browser
// "open in new tab" without duplicate click/keydown/pointer telemetry.
export const fighterEntryPath='/api/play-counts/entries/taiwanfighter';
export const entryDestinations=Object.freeze({taiwanfighter:'https://taiwanfighter.playformosa.workers.dev/',taiwankart:'https://taiwankart.playformosa.workers.dev/',soul10power:'https://soul10power.vercel.app/',arcadeplatform:'https://arcadeplatform.playformosa.workers.dev/'});
export const entryKey=path=>{const key=path.startsWith('/api/play-counts/entries/')?path.slice('/api/play-counts/entries/'.length):'';return Object.hasOwn(entryDestinations,key)?key:null;};

function isEntryNavigation(request,url){
 if(request.method!=='GET'||url.search)return false;
 if(/prefetch|prerender/i.test((request.headers.get('Purpose')||'')+' '+(request.headers.get('Sec-Purpose')||'')))return false;
 for(const [name,expected] of [['Sec-Fetch-Mode','navigate'],['Sec-Fetch-Dest','document']]){
  const value=request.headers.get(name);if(value!==null&&value!==expected)return false;
 }
 // Browser UI (for example, opening a link via a context menu) may report none.
 const site=request.headers.get('Sec-Fetch-Site');
 if(site!==null&&!['same-origin','none'].includes(site))return false;
 return true;
}

async function countEntry(env,now,key){
 // Entry counts have no per-device cooldown. They do not consume the existing
 // gameplay daily quota and require only one bounded aggregate row per scope.
 const day=Math.floor(now/86400000);
 await env.DB.batch([env.DB.prepare(`INSERT INTO play_count_totals(scope,counter_key,total,since,day,day_total)
 VALUES (?,?,1,?,?,0)
 ON CONFLICT(scope,counter_key) DO UPDATE SET total=play_count_totals.total+1,day=excluded.day`)
 .bind(env.LEADERBOARD_SCOPE,key,now,day)]);
}

export function handleFighterEntry(request,env,now,context){return handleExternalEntry(request,env,now,context);}
export function handleExternalEntry(request,env,now,context){
 const key=entryKey(new URL(request.url).pathname);if(!key)return new Response(null,{status:404});
 const destination=entryDestinations[key];
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
 const url=new URL(request.url);
 if(env.PLAY_COUNTS_ENABLED==='true'&&['qa','production'].includes(env.LEADERBOARD_SCOPE)&&env.DB&&env.LEADERBOARD_ORIGIN===url.origin&&isEntryNavigation(request,url)){
  const work=countEntry(env,now,key).catch(()=>{}); // Best effort: D1 failure cannot prevent entering the game.
  context?.waitUntil(work);
 }
 return new Response(null,{status:302,headers:{Location:destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
}
