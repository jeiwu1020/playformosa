// A help visit owns presentation, not simulation. Game adapters own safe pausing.
const owners=new WeakSet();
export const helpIsOpen=document=>owners.has(document);
export function createHelpCoordinator(document,suspend=()=>{}){
 let restore=null,active=false;
 return{get active(){return active;},enter(){if(active)return;active=true;owners.add(document);try{restore=suspend()||null;}catch(error){active=false;owners.delete(document);throw error;}},leave({restoreView=true}={}){if(!active)return;active=false;owners.delete(document);const resumeView=restore;restore=null;if(restoreView)resumeView?.();else resumeView?.discard?.();}};
}
// Close via the owning controller so fallback inert/backdrop bookkeeping is restored.
// Panels keep a CSS suspension marker because game UI refreshes may update hidden.
export function suspendHelpPresentation(document,{pause=()=>{},controllers={},dialogs=[],panels=[],after=()=>{}}={}){
 pause();
 const opened=dialogs.map(id=>document.getElementById(id)).filter(node=>node?.open);
 const saved=opened.map(node=>({node,focus:node.contains(document.activeElement)?document.activeElement:null,scroll:node.scrollTop}));
 for(const{node}of [...saved].reverse()){const owner=controllers[node.id];if(owner)owner.close();else node.close();}
 const panelState=panels.filter(Boolean).map(node=>({node,hidden:node.hidden}));for(const{node}of panelState)node.setAttribute('data-pf-help-suspended','');
 const restore=()=>{for(const{node,hidden}of panelState){node.removeAttribute('data-pf-help-suspended');node.hidden=hidden;}for(const{node,focus,scroll}of saved){const owner=controllers[node.id];if(owner)owner.open();else node.showModal();node.scrollTop=scroll;focus?.focus({preventScroll:true});}after({restoredDialog:saved.length>0});};
 restore.discard=()=>{for(const{node}of panelState)node.removeAttribute('data-pf-help-suspended');};return restore;
}

export function ensurePauseHelp(document,container,visible=true){if(!container)return;let button=container.querySelector('.pf-pause-help');if(!button){button=document.createElement('button');button.type='button';button.className='pf-pause-help';button.textContent='說明';button.addEventListener('click',()=>document.dispatchEvent(new document.defaultView.CustomEvent('pf-help-request')));container.append(button);}button.hidden=!visible;}
