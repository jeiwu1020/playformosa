import{createHelpCoordinator}from'./help-coordinator.mjs';
export{helpIsOpen,suspendHelpPresentation,ensurePauseHelp}from'./help-coordinator.mjs';
import{createDialogController}from'../long-jump/dialogs.mjs';
import{entryContent}from'./entry-content.mjs';
// Shared presentation only: original game callbacks own all clocks, input and audio.
export function createEntryShell({document,title,goal,operations,advanced=null,onStart,onEnter=()=>{},onHelpEnter=null,canStart=()=>true,forceFallback=false}){
 const win=document.defaultView,dialog=document.createElement('dialog');dialog.className='pf-entry';dialog.setAttribute('aria-label',title);dialog.setAttribute('data-pf-entry','');
 const brand=document.createElement('p');brand.className='pf-entry-brand';brand.textContent='PLAYFORMOSA';const heading=document.createElement('h2');heading.textContent=title;
 const aim=document.createElement('p');aim.className='pf-entry-goal';aim.textContent=goal;const core=document.createElement('div');core.className='pf-entry-operations';
 for(const text of operations){const p=document.createElement('p');p.className='pf-entry-operation';p.textContent=text;core.append(p);}
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='進階說明與素材授權';details.append(summary);if(advanced)details.append(advanced);
 const button=document.createElement('button');button.type='button';button.className='pf-entry-start';button.textContent='開始遊戲';button.autofocus=true;const recovery=document.createElement('p');recovery.className='pf-entry-error';recovery.hidden=true;recovery.append('遊戲畫面無法啟動，請返回首頁後重試。 ');const home=document.createElement('a');home.href='/';home.textContent='返回遊戲首頁';recovery.append(home);dialog.append(brand,heading,aim,core,details,button,recovery);document.body.append(dialog);
 const helpOwner=createHelpCoordinator(document,()=>onHelpEnter?onHelpEnter():onEnter('help'));let returnToEntry=false;
 const modal=createDialogController(dialog,()=>{}, {forceFallback});let active=false,help=false,destroyed=false,backdrop=null;const heldKeys=new Set();
 const keyId=e=>e.code||e.key;
 function keyGate(e){const key=keyId(e);if(active){if(e.key==='Tab'&&e.target?.nodeType&&dialog.contains(e.target))return;if(e.type==='keydown')heldKeys.add(key);else heldKeys.delete(key);if(!e.target?.nodeType||!dialog.contains(e.target)||e.key==='Escape')e.preventDefault();e.stopImmediatePropagation();}else if(heldKeys.has(key)){if(e.type==='keyup')heldKeys.delete(key);e.preventDefault();e.stopImmediatePropagation();}}
 function stopBubble(e){e.stopPropagation();if(e.key==='Escape')e.preventDefault();}
 win.addEventListener('keydown',keyGate,true);win.addEventListener('keyup',keyGate,true);dialog.addEventListener('keydown',stopBubble);dialog.addEventListener('keyup',stopBubble);
 function close({restoreView=true}={}){if(!active)return;active=false;modal.close();dialog.hidden=true;if(help)helpOwner.leave({restoreView});help=false;returnToEntry=false;}
 function open(options={}){if(destroyed)return;const nextHelp=Boolean(options.help);if(active&&help===nextHelp){button.disabled=!help&&!canStart();recovery.hidden=!button.disabled;return;}if(active&&!help&&nextHelp){returnToEntry=true;help=true;button.textContent='返回遊戲';button.disabled=false;return;}help=nextHelp;button.textContent=help?'返回遊戲':'開始遊戲';button.disabled=!help&&!canStart();recovery.hidden=!button.disabled;details.open=false;if(help)helpOwner.enter();else onEnter('entry');active=true;dialog.hidden=false;const prior=new Set(document.querySelectorAll('.dialog-backdrop'));modal.open();backdrop??=[...document.querySelectorAll('.dialog-backdrop')].find(x=>!prior.has(x))||null;backdrop?.classList.add('pf-entry-backdrop');(button.disabled?home:button).focus({preventScroll:true});}

 button.addEventListener('click',event=>{event.stopPropagation();if(!active||button.disabled)return;if(help){if(returnToEntry){help=false;returnToEntry=false;button.textContent='開始遊戲';button.disabled=!canStart();recovery.hidden=!button.disabled;}else close();return;}if(!canStart())return;close();onStart(event);});
 return{dialog,open,close,get active(){return active;},destroy(){close({restoreView:false});destroyed=true;win.removeEventListener('keydown',keyGate,true);win.removeEventListener('keyup',keyGate,true);dialog.remove();backdrop?.remove();heldKeys.clear();}};
}
export function createGameEntry(options){const{document,gameId}=options,content=entryContent(document,gameId),win=document.defaultView;const forceFallback=options.forceFallback??Boolean(win.navigator?.standalone||win.matchMedia?.('(display-mode: standalone)').matches);const shell=createEntryShell({...content,...options,forceFallback});document.querySelector('[data-pf-entry-loading]')?.remove();
 // One header action for every game; retain old nodes for existing bindings, never as a second entry.
 if(content.existingHelp)content.existingHelp.hidden=true;
 const help=document.createElement('button');help.type='button';help.className='pf-entry-help';help.textContent='說明';help.setAttribute('aria-label','操作說明與素材授權');help.addEventListener('click',()=>shell.open({help:true}));document.addEventListener('pf-help-request',()=>shell.open({help:true}));(document.querySelector('.pf-header nav')||document.body).append(help);
 // Keep actual audio controls and their trusted-gesture listeners; clones would be inert.
 if(gameId==='beer-slide'){const audio=document.querySelector('#aboutDialog .audio-settings');if(audio){shell.dialog.querySelector('.audio-settings')?.remove();shell.dialog.querySelector('details').append(audio);}}
 if(gameId==='hurdles'||gameId==='pole-vault'){const settings=document.querySelector('#settings'),audio=document.createElement('section');audio.className='audio-settings';audio.setAttribute('aria-label','聲音設定');for(const node of settings?.querySelectorAll(':scope > label, :scope > #audio-status, :scope > #toggle-sound')||[])audio.append(node);shell.dialog.querySelector('details').append(audio);}
 return shell;
}
