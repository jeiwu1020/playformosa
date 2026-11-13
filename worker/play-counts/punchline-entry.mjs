// Native navigation covers touch, Enter, modifier/middle clicks and browser
// "open in new tab" without duplicate click/keydown/pointer telemetry.
export const punchlineEntryPath='/api/play-counts/entries/taiwanpunchline';
const destination='https://taiwanpunchline.playformosa.workers.dev/';

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

async function countEntry(env,now){
 // Entry counts have no per-device cooldown. They do not consume the existing
 // gameplay daily quota and require only one bounded aggregate row per scope.
 const day=Math.floor(now/86400000);
 await env.DB.batch([env.DB.prepare(`INSERT INTO play_count_totals(scope,counter_key,total,since,day,day_total)
 VALUES (?,'taiwanpunchline',1,?,?,0)
 ON CONFLICT(scope,counter_key) DO UPDATE SET total=play_count_totals.total+1,day=excluded.day`)
 .bind(env.LEADERBOARD_SCOPE,now,day)]);
}

export function handlePunchlineEntry(request,env,now,context){
 if(env.LEADERBOARD_SCOPE!=='qa')return new Response('Not found',{status:404});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
 const url=new URL(request.url);
 if(env.PLAY_COUNTS_ENABLED==='true'&&env.LEADERBOARD_SCOPE==='qa'&&env.DB&&env.LEADERBOARD_ORIGIN===url.origin&&isEntryNavigation(request,url)){
  const work=countEntry(env,now).catch(()=>{}); // Best effort: D1 failure cannot prevent entering the game.
  context?.waitUntil(work);
 }
 return new Response(null,{status:302,headers:{Location:destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
}
