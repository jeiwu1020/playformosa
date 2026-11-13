// Optional equipment interaction. Rendering never reserves or pauses the ball.
export function mountInteractionOffer({document,window,game,mode}){
 const button=document.getElementById('interactionOffer');
 let consumed=null;
 const eligible=()=>mode()==='playing'&&!document.querySelector('dialog[open]')&&!game.interaction&&!game.round?.ending&&!game.round?.reentry?game.getInteractionOffer():null;
 function sync(){if(mode()!=='playing')consumed=null;const offer=eligible();document.body.classList.toggle('interaction-offer-active',!!offer);button.hidden=!offer;button.disabled=!offer;button.dataset.offerId=offer?String(offer.id):'';if(offer){button.querySelector('b').textContent='點此互動';button.querySelector('small').textContent=offer.label+' · Space';button.setAttribute('aria-label','進入'+offer.label+'互動；按鈕或Space，不選就繼續彈跳');}return offer;}
 function activate(e){const offer=sync();if(!offer||consumed===offer.id)return false;e?.preventDefault();if(game.requestInteraction(offer.id)){consumed=offer.id;sync();return true;}sync();return false;}
 function keydown(e){if(e.code!=='Space'||e.repeat)return;if(e.target?.closest?.('input,textarea,select,button,a,[contenteditable],dialog'))return;activate(e);}
 function pointerdown(e){if(e.button!==undefined&&e.button!==0)return;activate(e);}
 button.addEventListener('pointerdown',pointerdown);button.addEventListener('click',activate);window.addEventListener('keydown',keydown);sync();
 return{sync,hide(){button.hidden=true;button.disabled=true;document.body.classList.remove('interaction-offer-active');},dispose(){button.removeEventListener('pointerdown',pointerdown);button.removeEventListener('click',activate);window.removeEventListener('keydown',keydown);}};
}
