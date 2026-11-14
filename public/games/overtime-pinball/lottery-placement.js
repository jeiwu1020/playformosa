import {activityFor,dockFor,stageYaw} from './activities.js';
import {chairRenderPose,busyRenderHeight,busyRenderForward,coffeeRenderHeight,launcherRenderHeight} from './render-proportions.js';
// Match actual work docks/heights; decorative employees never become physics balls.
export function lotteryPlacements(stations,view){return stations.map(o=>{const activity=activityFor(o)?.id||'busy',p=dockFor(o,view);let rotation=Math.PI+stageYaw(view),y=1.34,x=p.x,z=p.z;
 if(activity==='chair'){rotation=stageYaw(view);const seat=chairRenderPose(o.visualScale||1,'work',2,.85,0);y=seat.y;x+=Math.sin(rotation)*seat.forward;z-=Math.cos(rotation)*seat.forward;}
 if(activity==='busy'){y=busyRenderHeight(o.visualScale||1,'work',2,.85,0);const d=busyRenderForward('work',2,.85,0);x+=Math.sin(rotation)*d;z-=Math.cos(rotation)*d;}
 if(activity==='coffee')y=1.34;
 if(activity==='launcher'){x=o.x+3.6;z=o.z;y=1.34;}
 return{stationId:o.id,x,z,y,rotation,activity:activity==='launcher'?'clock':activity,stoolScale:activity==='busy'?(o.visualScale||1):null};});}
