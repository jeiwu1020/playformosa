import {snapshot} from './physics.mjs';
// Last successful presentation owns state/history. Rendering failures cannot commit a result.
export function createRenderTransaction({getState,setState,getHistoryLength,truncateHistory,onError,getMeta=()=>null,setMeta=()=>{}}){
 let last=null;
 return{seed(){last={state:snapshot(getState()),history:getHistoryLength(),meta:structuredClone(getMeta())};},draw(draw,commit=()=>{}){try{draw();}catch(error){if(last){setState(snapshot(last.state));truncateHistory(last.history);setMeta(structuredClone(last.meta));}onError(error);return false;}commit();last={state:snapshot(getState()),history:getHistoryLength(),meta:structuredClone(getMeta())};return true;}};
}
