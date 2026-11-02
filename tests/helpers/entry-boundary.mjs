import {mountLeaderboard as mountLeaderboardUI} from '../../public/games/shared/leaderboard.mjs';
// Tiny VM DOMs cannot implement dialogs/node reparenting. The shared shell's real
// DOM, native activation and focus are tested separately in shared-entry.test.mjs.
// Keep lifecycle callbacks and active state real at this presentation boundary.
import{createHelpCoordinator,helpIsOpen,suspendHelpPresentation}from'../../public/games/shared/help-coordinator.mjs';
export function entryBoundary(){
 let shell;const helpers={mountLeaderboard:options=>mountLeaderboardUI({...options,enabled:false}),helpIsOpen,ensurePauseHelp(){/* tiny VM nodes do not render secondary actions; real DOM tests cover them */},suspendHelpPresentation(doc,options){for(const id of options.dialogs||[]){const node=doc.getElementById(id);node.id??=id;node.contains??=()=>false;}return suspendHelpPresentation(doc,options);}};
 return{helpers,createGameEntry(options){let active=false,help=false,opens=0;const owner=createHelpCoordinator(options.document,()=>options.onHelpEnter?.());
  shell={get active(){return active;},get opens(){return opens;},open(mode={}){if(active)return;help=Boolean(mode.help);if(help)owner.enter();else options.onEnter?.('entry');active=true;opens++;},close(){active=false;if(help)owner.leave();help=false;},start(event={isTrusted:false}){if(!active||(!help&&!options.canStart()))return false;active=false;if(help)owner.leave();else options.onStart(event);help=false;return true;}};return shell;
 },get shell(){return shell;},start(event){return shell?.start(event);}};
}
// Only module declarations and the presentation-only mount call are removed.
// The controller's original lifecycle/input/physics/frame code executes unchanged.
export function controllerSource(source){return source.replace(/^import[^\n]*\n/gm,'').replace(/^mountControlsFrame\([^\n]*\);\n/gm,'');}
