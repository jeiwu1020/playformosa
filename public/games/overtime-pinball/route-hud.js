import {keyboardHint} from './keyboard-hints.js';
/** One input hint shared by keyboard and existing on-screen L/R controls. No input handlers here. */
export function routeCue(game,view='reverse'){
 const run=game?.mailRun;if(!run)return null;
 const toScreen=side=>view==='reverse'?(side==='left'?'right':'left'):side;
 const selected=run.choice||run.branch?.side;
 if(run.choiceOpen&&!selected)return {title:'公文要送哪一邊？',hint:'L 左出口　｜　R 右出口',detail:'不按：'+(toScreen(run.choiceDefault||'right')==='left'?'左':'右')+'出口',remaining:Math.max(0,Number(run.choiceRemaining)||0),open:true};
 if(selected)return {title:'轉送'+(toScreen(selected)==='left'?'左':'右')+'區！',hint:run.chosenByPlayer?'改道成功，繼續裝忙':'自動派件，繼續裝忙',detail:'出軌後放開再按 L / R',remaining:0,open:false};
 return null;
}
export function mountRouteHud({document:doc=globalThis.document,view='reverse'}={}){
 const css=doc.createElement('link');css.rel='stylesheet';css.href=new URL('./route-hud.css',import.meta.url).href;doc.head.append(css);
 const panel=doc.createElement('section');panel.id='routeChoice';panel.hidden=true;panel.setAttribute('aria-label','公文軌道出口');
 const title=doc.createElement('b'),hint=doc.createElement('span'),detail=doc.createElement('small'),progress=doc.createElement('progress');progress.max=1.2;progress.setAttribute('aria-label','選擇出口剩餘時間');panel.append(title,hint,detail,progress);doc.body.append(panel);
 let disposed=false;
 return {panel,update(game,{playing=true,paused=false}={}){if(disposed)return;const cue=playing&&!paused?routeCue(game,view):null;panel.hidden=!cue;doc.body.classList.toggle('route-choice-active',!!cue);if(!cue)return;title.textContent=cue.title;hint.textContent=keyboardHint(cue.hint,doc);detail.textContent=keyboardHint(cue.detail,doc);progress.hidden=!cue.open;progress.value=Math.min(1.2,cue.remaining);},dispose(){if(disposed)return;disposed=true;panel.remove();css.remove();doc.body.classList.remove('route-choice-active');}};
}
