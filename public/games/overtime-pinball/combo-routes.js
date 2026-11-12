import {LAYOUT} from './route-layout.js';
import {segmentDistance} from './board-features.js';
export const COMBO_ROUTES={paper:{title:'報表一條龍',target:'shredder',checkpoint:{x:-3.5,z:-8.75,r:2.2},points:1200,seconds:8},coffee:{title:'咖啡轉職',target:'chair',checkpoint:{x:-8.4,z:25,r:2.1},points:1000,seconds:8},dispatch:{title:'急件打卡救球',target:'desk3',points:1600,seconds:8}};
export const freshCombos=()=>({active:null,ready:{},started:{paper:0,coffee:0,dispatch:0},completed:{paper:0,coffee:0,dispatch:0}});
export function startCombo(g,id){const state=g.comboRoutes;if(g.time<(state.ready[id]||0)||state.active?.id===id)return false;state.active={id,stage:id==='dispatch'?'clock':'lane',until:g.time+COMBO_ROUTES[id].seconds};state.started[id]++;state.ready[id]=g.time+8;g.emit('comboRouteStart',{id,title:COMBO_ROUTES[id].title});return true;}
function live(g){const a=g.comboRoutes.active;if(a&&g.time>a.until){g.emit('comboRouteEnd',{id:a.id});g.comboRoutes.active=null;return null;}return a;}
function complete(g){const a=g.comboRoutes.active,r=COMBO_ROUTES[a.id];if(g.award)g.award('route',r.points);else g.bonus+=r.points;g.comboRoutes.completed[a.id]++;g.comboRoutes.ready[a.id]=g.time+8;g.comboRoutes.active=null;g.emit('comboRouteComplete',{id:a.id,title:r.title,points:r.points});}
export function updateCombo(g,from,to){const a=live(g);if(!a||a.stage!=='lane')return;const p=COMBO_ROUTES[a.id].checkpoint;if(segmentDistance(p.x,p.z,from,to)<=p.r){a.stage='target';g.emit('comboRouteLane',{id:a.id});}}
export function comboContact(g,id){const a=live(g);if(!a||COMBO_ROUTES[a.id].target!==id)return;if(a.id==='dispatch'&&a.stage==='clock')a.stage='work';else if(a.stage==='target')complete(g);}
export function comboWork(g,id,success){const a=live(g);if(a?.id==='dispatch'&&id==='desk3'){if(success&&a.stage==='work'){a.stage='save';a.until=g.time+8;g.emit('comboRouteSave');}else if(!success)g.comboRoutes.active=null;}}
export function comboSave(g){const a=live(g);if(a?.id==='dispatch'&&a.stage==='save')complete(g);}
export function comboAllows(g,id){const a=live(g);return !!a&&COMBO_ROUTES[a.id].target===id&&['target','clock','work'].includes(a.stage);}
export function comboTarget(i,o){let id;if(o.id==='copier')id='shredder';else if(o.id==='desk2')id='chair';else if(o.id==='launcher')id=i.side==='left'?'desk2':'desk';if(id)return{id,...LAYOUT[id]};if(o.id==='desk3')return{x:i.side==='left'?-6:6,z:40};return null;}
