// A failed safe release invalidates this round; never pretend it completed normally.
export function mountReleaseRecovery({document,restart,home}){
 const dialog=document.createElement('dialog');dialog.id='releaseRecovery';dialog.setAttribute('aria-labelledby','releaseRecoveryTitle');
 const title=document.createElement('h2');title.id='releaseRecoveryTitle';title.textContent='設備卡住了，這局先休息';
 const message=document.createElement('p');message.textContent='人物無法安全送回球台，本局已中止，不會計入最高分或排行榜。請重新遊玩；若再次發生，請回報當時的設備。';
 dialog.append(title,message);
 const hide=()=>{if(dialog.open)dialog.close();};
 for(const [key,label,action] of [['restart','重新遊玩',restart],['home','回到首頁',home]]){const button=document.createElement('button');button.dataset.recovery=key;button.textContent=label;button.className=key==='restart'?'primary':'text-button';button.onclick=()=>{hide();action();};dialog.append(button);}
 dialog.addEventListener('cancel',event=>event.preventDefault());document.body.append(dialog);
 return {show(){if(!dialog.open)dialog.showModal();dialog.querySelector('button').focus();},hide};
}
