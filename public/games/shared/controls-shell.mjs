// Presentation only. Original buttons, input mappings and renderer hosts survive.
export function mountControlsFrame({document,scene,controls,keys,game='',onResize}) {
 const order=['a','s','j','k'],buttons=order.map(key=>keys?.[key]);
 if(buttons.some(button=>button?.tagName!=='BUTTON')||new Set(buttons).size!==4)throw new TypeError('Expected four distinct original control buttons');
 if(!scene?.parentElement||!controls||buttons.some(button=>!controls.contains(button)))throw new TypeError('Expected scene and its original controls container');
 const parent=scene.parentElement,restores=[];
 function mark(node,name,value){const old=node.getAttribute(name);node.setAttribute(name,value);restores.push(()=>old===null?node.removeAttribute(name):node.setAttribute(name,old));}
 function place(node){const marker=document.createComment('shared-controls position');node.before(marker);restores.push(()=>{marker.replaceWith(node);});}
 const frame=document.createElement('div');frame.className='pf-controls-frame';frame.dataset.game=game;
 const wrapper=document.createElement('div');wrapper.className='controls pf-controls-keys';wrapper.setAttribute('role','group');wrapper.setAttribute('aria-label','四肢控制');
 const left=document.createElement('div'),right=document.createElement('div');left.className='limbs pf-controls-left';right.className='limbs pf-controls-right';
 wrapper.append(left,right);place(scene);scene.before(frame);frame.append(scene,wrapper);
 mark(scene,'data-pf-controls-scene','');mark(parent,'data-pf-controls-host',game);mark(controls,'data-pf-controls-source','');
 buttons.forEach((button,i)=>{place(button);mark(button,'data-pf-key',order[i]);(i<2?left:right).append(button);});
 const Observer=document.defaultView?.ResizeObserver;const observer=onResize&&Observer?new Observer(()=>onResize()):null;observer?.observe(scene);onResize?.();
 let destroyed=false;
 return{frame,destroy(){if(destroyed)return;destroyed=true;observer?.disconnect();for(const restore of restores.reverse())restore();frame.remove();}};
}
