// Shared presentation only. Game callbacks remain the only owners of simulation state.
export function createPauseContent(document,{onContinue,onRestart,onRanking,gameId}){
 const root=document.createElement('section');root.dataset.pfPause='';root.className='pf-menu-pause';
 const ticket=document.createElement('div');ticket.className='pf-menu-ticket';
 const label=document.createElement('p');label.className='pf-menu-kicker';label.textContent='已暫停';
 const title=document.createElement('h2');title.textContent='四肢休息一下。';
 const note=document.createElement('p');note.className='pf-menu-note';note.textContent='喘口氣，不會偷偷開始。';ticket.append(label,title,note);if(gameId){const icon=document.createElement('img');icon.src='/assets/app-icons/'+gameId+'/apple-touch-icon.png';icon.alt='';icon.width=80;icon.height=80;ticket.append(icon);}
 function button(text,attribute,listener,primary=false){const b=document.createElement('button');b.type='button';b.dataset[attribute]='';b.className=primary?'pf-entry-start pf-menu-primary':'pf-menu-row';b.textContent=text;b.addEventListener('click',listener);return b;}
 const resume=button('繼續遊戲','pfContinue',onContinue,true),audio=document.createElement('div');audio.dataset.pfPauseAudio='';
 const ranking=button('榮譽榜','pfPauseRanking',onRanking);ranking.hidden=true;
 const restart=button('重新開始','pfRestart',onRestart),home=document.createElement('a');home.href='/';home.className='pf-menu-home';home.textContent='返回首頁';
 root.append(ticket,resume,audio,ranking,restart,home);return{root,resume,audio,ranking};
}
