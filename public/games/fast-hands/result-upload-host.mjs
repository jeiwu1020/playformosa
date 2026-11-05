/** Rehome the existing upload section, never its submission state or listeners. */
export function mountResultUploadHost({section,inlineUpload,onClose}){
 if(!inlineUpload)return null;
 const {host,trigger,hint,resultDialog}=inlineUpload,document=section.ownerDocument;
 const marker=document.createComment('upload section home');section.before(marker);
 trigger.setAttribute('aria-controls',host.id||section.id);trigger.setAttribute('aria-expanded','false');
 const stopKeys=event=>{if(event.key!=='Tab')event.stopPropagation();if(event.key==='Enter'&&event.target.tagName==='INPUT')event.preventDefault()};
 for(const type of ['keydown','keyup','keypress'])section.addEventListener(type,stopKeys);
 const closed=()=>{if(!resultDialog.open)onClose()};resultDialog.addEventListener('close',closed);
 function restore(){if(section.parentElement===host){marker.after(section);section.hidden=true}host.hidden=true;trigger.setAttribute('aria-expanded','false')}
 return {
  isOpen:()=>resultDialog.open&&!host.hidden&&section.parentElement===host,
  show(){
   if(!resultDialog.open)return false;
   if(section.parentElement!==host)host.append(section);
   host.hidden=false;section.hidden=false;trigger.setAttribute('aria-expanded','true');return true;
  },
  reveal(target){
   // scrollIntoView would also move the page behind the modal. Keep this local.
   const scroll=host.closest('.finale-scroll');
   if(scroll){const viewport=scroll.getBoundingClientRect(),field=target?.getBoundingClientRect(),visibleField=field&&field.height>0;const anchor=visibleField?field:host.getBoundingClientRect(),room=scroll.clientHeight||viewport.height||0,padding=visibleField?Math.min(24,Math.max(0,(room-anchor.height)/2)):12;const top=Math.max(0,scroll.scrollTop+anchor.top-viewport.top-padding);if(typeof scroll.scrollTo==='function')scroll.scrollTo({top,behavior:'auto'});else scroll.scrollTop=top;}
   if(target){if(!target.matches('input,button'))target.tabIndex=-1;target.focus({preventScroll:true})}
  },
  sync({eligible,pending,completed,rejected,payload,attempts,reason,unavailable=false,cooldownSeconds=0,cooldownMessage=''}){
   trigger.disabled=!eligible||pending||completed||rejected||attempts>=3||unavailable||cooldownSeconds>0;
   trigger.textContent=completed?'已上傳':pending?'提交中…':cooldownSeconds>0?'等待 '+cooldownSeconds+' 秒':payload&&!rejected&&attempts<3?'重試本次上傳':'上傳本次成績';
   hint.textContent=!eligible?reason:unavailable?'此瀏覽器無法建立匿名識別，仍可正常遊玩。':completed?'本次成績已收錄。':pending?'提交中，請稍候…':rejected?'本次提交無法接受，請重新挑戰。':attempts>=3?'本回合已達3次連線嘗試上限，請重新挑戰。':cooldownMessage?cooldownMessage:payload?'尚未確認收錄，可手動重試同一筆。':'自願上傳，確認暱稱與公開同意後才會送出。';
  },
  restore,
  destroy(){restore();marker.remove();resultDialog.removeEventListener('close',closed);for(const type of ['keydown','keyup','keypress'])section.removeEventListener(type,stopKeys)}
 };
}

export {createUploadCooldown} from '../shared/upload-cooldown.mjs';
