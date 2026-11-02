import initSqlJs from 'sql.js';
import {readFile} from 'node:fs/promises';
export async function database(){
 const SQL=await initSqlJs();const raw=new SQL.Database();raw.run(await readFile(new URL('../../worker/leaderboard/0001.sql',import.meta.url),'utf8'));
 const query=(sql,args)=>{const q=raw.prepare(sql);try{q.bind(args);const results=[];while(q.step())results.push(q.getAsObject());return {results};}finally{q.free();}};
 return {raw,prepare(sql){return {bind(...args){return {sql,args,async first(){return query(sql,args).results[0]??null;},async all(){return query(sql,args);}};}};} ,async batch(items){raw.run('BEGIN');try{const out=items.map(x=>query(x.sql,x.args));raw.run('COMMIT');return out;}catch(e){raw.run('ROLLBACK');throw e;}}};
}
