export async function loadPlayCounts(document,{fetcher=(...args)=>document.defaultView.fetch(...args)}={}){
 const nodes=[...document.querySelectorAll('[data-play-count]')];if(!nodes.length)return;
 const win=document.defaultView;let timer;
 try{const controller=new win.AbortController();timer=win.setTimeout(()=>controller.abort(),5000);const response=await fetcher('/api/play-counts',{signal:controller.signal});if(!response.ok)throw Error('unavailable');const data=await response.json();for(const n of nodes){const count=data.counts?.[n.dataset.playCount]?.count;n.textContent=Number.isSafeInteger(count)&&count>=0?'已開玩 '+count.toLocaleString()+' 次':'次數暫時讀不到';}}
 catch{for(const n of nodes)n.textContent='次數暫時讀不到';}finally{win.clearTimeout(timer)}
}
if(typeof document!=='undefined')void loadPlayCounts(document);
