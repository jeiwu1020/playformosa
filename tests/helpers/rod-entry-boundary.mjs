import {createGameAudioEvents} from '../../public/games/reaction-rod/game-audio-events.mjs';
import {mountLeaderboard as mountLeaderboardUI} from '../../public/games/reaction-rod/leaderboard.mjs';
// Tiny VM DOMs cannot implement dialogs/node reparenting. The shared shell's real
// DOM, native activation and focus are tested separately in shared-entry.test.mjs.
// Keep lifecycle callbacks and active state real at this presentation boundary.
import{createHelpCoordinator,helpIsOpen,suspendHelpPresentation}from'../../public/games/shared/help-coordinator.mjs';
export function entryBoundary(){
 let shell;const helpers={createSceneAudio:audioBoundary,createGameAudioEvents,recordPlayStart(){/* network boundary; real client and enabled controller tests verify starts */},mountLeaderboard:options=>mountLeaderboardUI({...options,enabled:false}),helpIsOpen,ensurePauseHelp(){/* tiny VM nodes do not render secondary actions; real DOM tests cover them */},suspendHelpPresentation(doc,options){for(const id of options.dialogs||[]){const node=doc.getElementById(id);node.id??=id;node.contains??=()=>false;}return suspendHelpPresentation(doc,options);}};
 return{helpers,createGameEntry(options){let active=false,help=false,opens=0,pause=false,pauseOptions={},audio=null,ranking=null;const owner=createHelpCoordinator(options.document,()=>options.onHelpEnter?.());
  shell={get active(){return active;},get opens(){return opens;},get paused(){return pause;},get audio(){return audio;},setAudio(value){audio=value;},setRankingAction(value){ranking=value;},configurePause(value){pauseOptions=value||{};},openPause(){if(pause)return;if(active)shell.close({restoreView:false});shell.open({help:true});pause=true;},continue(event={isTrusted:false}){if(!pause||pauseOptions.canContinue&&!pauseOptions.canContinue())return false;shell.close({restoreView:false});pauseOptions.onContinue?.(event);return true;},restart(event={isTrusted:false}){shell.close({restoreView:false});pauseOptions.onRestart?.(event);},showRanking(){ranking?.();},open(mode={}){if(active)return;help=Boolean(mode.help);if(help)owner.enter();else options.onEnter?.('entry');active=true;opens++;},close({restoreView=true}={}){if(!active)return;const wasPause=pause,wasHelp=help;active=false;pause=false;help=false;if(wasHelp)owner.leave({restoreView:restoreView&&!wasPause});},start(event={isTrusted:false}){if(!active||(!help&&options.canStart&&!options.canStart()))return false;if(pause)return false;const wasHelp=help;shell.close();if(!wasHelp)options.onStart(event);return true;}};return shell;
 },get shell(){return shell;},start(event){return shell?.start(event);}};
}
// Only module declarations and the presentation-only mount call are removed.
// The controller's original lifecycle/input/physics/frame code executes unchanged.
export function controllerSource(source){return source.replace(/^import[^\n]*\n/gm,'').replace(/^mountControlsFrame\([^\n]*\);\n/gm,'');}

// Audio decoding/output is the explicit hardware boundary in these tiny VMs.
// Preserve independent switches, notifications and public adapter signatures.
export function audioBoundary({notify=()=>{}}={}){
 let musicEnabled=true,effectsEnabled=true,musicVolume=.65,effectsVolume=.8,playing=false,ready=false;const listeners=new Set();
 const getState=()=>({musicEnabled,effectsEnabled,musicVolume,effectsVolume,musicStatus:ready?'ready':'locked',effectsStatus:ready?'ready':'locked',musicAvailable:true,effectsAvailable:true,musicPlaying:ready&&playing&&musicEnabled,suspended:!playing,contextSuspended:false,partial:false,message:''});
 const report=()=>{const s=getState();notify({...s,enabled:musicEnabled,ready,pending:false});for(const f of listeners)f(s);};
 return{getState,subscribe(f){listeners.add(f);return()=>listeners.delete(f);},setPlaying(v){playing=Boolean(v);report();},unlock(){ready=true;report();return Promise.resolve(true);},play(){return ready&&effectsEnabled;},tone(){return ready&&effectsEnabled;},stopEffects(){},setHidden(){},setDuck(){},setMusicEnabled(v){musicEnabled=Boolean(v);report();},setEffectsEnabled(v){effectsEnabled=Boolean(v);report();},setMusicVolume(v){musicVolume=v;report();},setEffectsVolume(v){effectsVolume=v;report();},setEnabled(v){musicEnabled=Boolean(v);report();return musicEnabled;},setVolume(kind,v){if(kind==='bgm')musicVolume=v;else effectsVolume=v;report();},get enabled(){return musicEnabled;},get ready(){return ready;},get pending(){return false;},get decoded(){return ready?1:0;}};
}
