const money=n=>'$'+Math.floor(Math.max(0,Number(n)||0)).toLocaleString('en-US');
export const PAY_NAMES=Object.freeze({base:'合法摸魚費',equipment:'碰撞零用錢',work:'裝忙技術獎',rescue:'拒絕下班獎',route:'轉寄／連擊獎',lights:'全燈／流程獎',clones:'影分身代班費',jackpot:'核准加班獎池',other:'其他調整'});
export function overtimePresentation(state,now=0){
 if(!state)return {text:'',phase:'collecting',progress:0};
 const phase=state.phase,progress=Math.min(1,Math.max(0,(state.litCount||0)/4)),seconds=Math.max(0,Math.ceil((state.until||0)-now)),pool=money(state.pool);
 const grace=phase==='claim'&&state.claimWork&&!state.claimWork.cancelled&&now>=state.until;
 const text=grace?`完成本次工作核准 ${pool} · ${Math.max(0,Math.ceil(state.until+3-now))}秒`:phase==='frenzy'?`一人當三人用 ${seconds}秒 · 待核准 ${pool}`:phase==='claim'?`成功裝忙即可核准 ${pool} · ${seconds}秒`:phase==='ready'?`假裝很忙集滿！影分身準備上工 · ${pool}`:`待核准加班獎池 ${pool}`;
 return {text,phase,progress};
}
export function overtimeCueText(cue){return ({word:'裝忙字牌亮了！',ready:'一個人的工作，三個人的加班費！',frenzy:'一人當三人用！影分身代班中',claim:'趁老闆點頭，成功裝忙領獎池！',approved:'老闆認證：加班費核准！',provisional:'先領暫核加班費，繼續裝忙！','patrol-approved':'老闆：看起來很忙，准！'})[cue]||'';}
