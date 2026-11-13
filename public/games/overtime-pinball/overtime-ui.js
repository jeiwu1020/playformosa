// Passive collision offer: input routing belongs to the existing L/R controls.
export function mountInteractionOffer({document,game,mode}){
 const panel=document.getElementById('interactionOffer'),bar=panel.querySelector('progress'),arrows=[...document.querySelectorAll('.offer-arrow')];
 function hide(){arrows.forEach(el=>el.hidden=true);panel.hidden=true;panel.dataset.offerId='';document.body.classList.remove('interaction-offer-active');}
 function sync(){
  const offer=mode()==='playing'&&!document.querySelector('dialog[open]')&&!game.interaction&&!game.round?.ending&&!game.round?.reentry?game.getInteractionOffer():null;
  if(!offer||!Number.isFinite(offer.remaining)||offer.remaining<=0||!Number.isFinite(offer.duration)||offer.duration<=0){
   hide();const notice=game.interactionNotice;if(mode()==='playing'&&!document.querySelector('dialog[open]')&&!game.interaction&&notice&&game.playClock<notice.until){panel.hidden=false;panel.querySelector('b').textContent=notice.text;panel.querySelector('small').textContent='繼續彈跳';bar.hidden=true;}return null;
  }
  bar.hidden=false;
  panel.hidden=false;panel.dataset.offerId=String(offer.id);document.body.classList.add('interaction-offer-active');
  panel.querySelector('b').textContent='按 L／R 進入互動';panel.querySelector('small').textContent=offer.label+' · 不按就繼續彈';panel.setAttribute('aria-label',offer.label+'：按L/R互動，不按繼續彈');arrows.forEach(el=>el.hidden=false);
  bar.max=offer.duration;bar.value=Math.min(offer.remaining,offer.duration);panel.style.setProperty('--offer-ratio',String(bar.value/bar.max));return offer;
 }
 sync();return{sync,hide,dispose:hide};
}
