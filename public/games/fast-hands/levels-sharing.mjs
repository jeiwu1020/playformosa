import {mountFastHandsSharing} from './share.mjs';
import {createLevelScoreImage,describeLevelScore} from './levels-score-image.mjs';

const ids=Object.freeze({dialog:'summary',image:'summaryDownload',status:'summaryShareStatus',threads:'summaryThreads',copy:'summaryCopy',fallback:'summaryShareFallback',fallbackImage:'summaryShareFallbackImage',fallbackText:'summaryShareText',fallbackClose:'summaryShareClose'});

/** Shares a completed level's local scorecard. No upload or leaderboard writes. */
export function mountLevelSharing({document=globalThis.document,mode=document.body?.dataset.level,createImage=createLevelScoreImage,...options}={}){
 if(!['catch','duel'].includes(mode))throw new TypeError('Unknown level');
 const controller=mountFastHandsSharing({document,createImage,...options,adapter:{ids,normalizeMode:()=>mode,snapshot(result,_mode,location){
  const url=new URL(`/games/fast-hands/${mode}.html`,location.origin).href;
  const text=['快手王｜PlayFormosa',result.modeText,result.title,`本次成績：${result.scoreText}`,result.note,url].join('\n');
  return{result,text,imageOptions:{frame:result.frame}};
 }}});
 let source=null,presentation=null,destroyed=false;
 return{
  /** frame resolves to captureFinaleImage's frozen {blob,width:900,height:620}. */
  prepare(state,frame){
   if(destroyed)return Promise.resolve();
   if(source!==state){presentation=Object.freeze({...describeLevelScore(state,mode),frame});source=state;}
   return controller.prepare(presentation,mode);
  },
  reset(){source=null;presentation=null;controller.reset();},
  destroy(){if(destroyed)return;destroyed=true;source=null;presentation=null;controller.destroy();},
 };
}
