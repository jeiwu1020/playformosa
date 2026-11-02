// Tiny VM DOMs cannot implement dialogs/node reparenting. The shared shell's real
// DOM, native activation and focus are tested separately in shared-entry.test.mjs.
// Keep lifecycle callbacks and active state real at this presentation boundary.
export function entryBoundary(){
 let shell;return{createGameEntry(options){let active=false,help=false;let opens=0;
  shell={get active(){return active;},get opens(){return opens;},open(mode={}){help=Boolean(mode.help);if(active)return;options.onEnter?.(help?'help':'entry');active=true;opens++;},close(){active=false;},start(event={isTrusted:false}){if(!active||(!help&&!options.canStart()))return false;active=false;if(!help)options.onStart(event);return true;}};return shell;
 },get shell(){return shell;},start(event){return shell?.start(event);}};
}
// Only module declarations and the presentation-only mount call are removed.
// The controller's original lifecycle/input/physics/frame code executes unchanged.
export function controllerSource(source){return source.replace(/^import[^\n]*\n/gm,'').replace(/^mountControlsFrame\([^\n]*\);\n/gm,'');}
