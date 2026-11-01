// Original low-poly art, built from the same shared primitives as the Earth miniatures.
// These are theatrical backdrops: never collision surfaces, forces or astronomy to scale.
import {MULTIVERSE_VARIANTS} from './cosmic-data.mjs';
export const CONSTELLATION_FOR=Object.freeze({oort_cloud:'orion',proxima:'ursa_major',black_hole:'ursa_minor'});
export function cosmicParts(art,id,variantId){
 const out=[],p=(shape,c,x,y,sx,sy=sx,sz=sx,z=0,rx=0,ry=0,rz=0)=>art.part(out,shape,c,x,y,z,sx,sy,sz,rx,ry,rz);
 const ball=(c,x,y,sx,sy=sx,sz=sx,z=0)=>p('sphere',c,x,y,sx,sy,sz,z);
 const box=(c,x,y,w,h,d=.2,z=0,rz=0)=>p('box',c,x,y,w,h,d,z,0,0,rz);
 const ring=(c,x,y,w,h=w,z=0,rz=0,rx=0)=>p('ring',c,x,y,w,h,1,z,rx,0,rz);
 const line=(c,x,y,xx,yy,width=.035,z=.1)=>box(c,(x+xx)/2,(y+yy)/2,width,Math.hypot(xx-x,yy-y),width,z,-Math.atan2(xx-x,yy-y));
 const rock=(x,y,s=.3,c='#adaeaa',z=0)=>{p('pyramid',c,x,y,s,s*.75,s*.8,z,.3,.2,.4);p('box',c,x+s*.12,y+s*.12,s*.68,s*.6,s*.55,z,.2,.3,.2);};
 const star=(x,y,s=.09,c='#e9e4cd',z=-.4)=>{ball(c,x,y,s);box(c,x,y,s*.22,s*3,s*.1,z);box(c,x,y,s*3,s*.22,s*.1,z);};
 const dish=(x,y,s=1)=>{p('shell','#e4dfcb',x,y,s*.9,s*.9,s*.6,0,.65,0,.3);line('#d4c6aa',x,y,x+s*.8,y+s*.4,.055);ball('#d9b36f',x+s*.8,y+s*.4,s*.11);};
 const rover=(x,y)=>{box('#d9d4b7',x,y,1.05,.35,.6,.2);for(const dx of[-.36,.36])ball('#536274',x+dx,y-.26,.2,.2,.12,.55);line('#c6cbb7',x,y,x+.18,y+.65,.045,.4);box('#8ca7ae',x+.18,y+.7,.35,.2,.08,.4);};
 const alien=(x,y,s=1,c='#a3c7a0')=>{ball(c,x,y+.75*s,.34*s,.43*s,.25*s,.4);for(const dx of[-.12,.12])ball('#27394c',x+dx*s,y+.82*s,.095*s,.13*s,.03,.64);p('cone','#8595b5',x,y+.18*s,.3*s,.75*s,.24*s,.3);line(c,x,y+.36*s,x-.5*s,y+.2*s,.06*s,.5);line(c,x,y+.36*s,x+.5*s,y+.2*s,.06*s,.5);};
 const bubbles=(x,y,n=5)=>{for(let i=0;i<n;i++)ring('#d4eee1',x+(i%3)*.55,y+Math.floor(i/3)*.55,.12+(i%2)*.06);};
 if(id==='space'){
  box('#d9ddd1',0,2.3,1.2,1.2,.9);for(const x of[-1.8,1.8]){box('#4d7591',x,2.3,2.3,.12,1.3);for(let i=0;i<4;i++)box('#b3cccb',x-.75+i*.5,2.39,.035,.025,1.25);}dish(.2,3.2,.7);line('#bdcec4',-.3,1.7,-.6,.8,.08);star(-3.3,3.9);star(3.6,1.2);
 }else if(id==='moon'){
  ball('#cccbbd',-.6,2.5,2.1,2.1,1.3);for(const[x,y,s]of[[-1.45,3.45,.42],[.5,2.7,.45],[-.9,1.4,.3]]){ball('#929d9c',x,y,s,s*.75,.055,1.28);ring('#b6bbae',x,y,s,s*.75,1.32);}box('#dbbf8a',2.5,.65,.85,.7,.7);p('cone','#c7cfca',2.5,1.35,.5,.65,.4);for(const dx of[-.5,.5])line('#ccb998',2.5+dx*.4,.6,2.5+dx,.15,.06);line('#dce4d4',3.3,.2,3.3,1.7,.035);box('#e5ab73',3.6,1.48,.6,.35,.04);star(-3.3,1.3);
 }else if(id==='mars'){
  ball('#c38c70',-.5,2.5,2.1,2.1,1.35);ball('#e2c4a6',-.5,4.25,.65,.18,.12,.7);line('#9c634f',-1.5,2.4,.3,1.8,.18,1.3);line('#b06b51',-.2,2.8,.8,2.5,.12,1.3);p('cone','#ad745b',-1.2,3.1,.55,.4,.2,1.1);rover(2.7,.65);star(2.8,3.7);
 }else if(id==='asteroid_belt'){
  for(const[x,y,s]of[[-3,3.4,.5],[-.8,1,.7],[1.8,3.5,.38],[3.2,1.4,.5],[-2,1.7,.2]])rock(x,y,s);ball('#aaa99c',.3,2.5,.85,.8,.65);ball('#e7e3ca',.1,2.75,.13,.1,.04,.64);ball('#e9e5d4',.4,2.65,.09,.08,.04,.65);star(3.4,4.1);star(-3.5,.4);
 }else if(id==='jupiter'){
  ball('#d2b893',-.5,2.4,2.15,2.15,1.4);for(const[y,w,c]of[[.9,1.5,'#b08d71'],[1.55,2.0,'#e1c6a3'],[2.2,2.15,'#ad8066'],[2.8,2.09,'#e5ceb0'],[3.45,1.85,'#b18d72'],[4,1.36,'#d9c2a1']])ball(c,-.5,y,w,.17,.13,1.34);ball('#b66d54',.3,1.7,.52,.28,.13,1.52);ring('#ce9873',.3,1.7,.5,.28,1.65);for(const[x,y,s,c]of[[2.8,3.7,.22,'#d6c8a6'],[3.5,2.4,.3,'#d7d7bb'],[2.8,1.1,.26,'#aca89b']])ball(c,x,y,s);star(-3.4,3.7);
 }else if(id==='saturn'){
  ball('#d7c19b',0,2.5,1.8,1.8,1.35);for(const[y,w]of[[1.3,1.35],[1.9,1.7],[2.6,1.8],[3.3,1.58]])ball('#bfa780',0,y,w,.12,.12,1.3);for(const[s,c]of[[2.55,'#b49b76'],[2.8,'#e1cba5'],[3.05,'#aa967a']])ring(c,0,2.5,s,s*.36,.05,.25,.18);ball('#c9b799',3.4,4,.32);star(-3.4,.8);
 }else if(id==='deep_space'){
  // Looking back at the inner system, not claiming Mercury/Venus are farther away.
  ball('#efd49a',-2.6,2.5,.85);for(const[s,c]of[[1.4,'#637d91'],[2.2,'#899eaa']])ring(c,-2.6,2.5,s,s*.35,-.5,-.35);ball('#b6ada0',-1.5,2,.23);ball('#dfc9a1',-.5,3,.36);box('#d8cead',1.8,1.5,1.6,1,.65);p('cone','#d5e3d9',2.9,1.5,.55,.9,.55,0,0,0,-Math.PI/2);for(const y of[.7,2.3])p('pyramid','#8ea9b8',1.4,y,.9,.6,.3);ball('#eab780',.6,1.5,.45,.2,.18);star(2.6,3.8);star(3.5,.7);
 }else if(id==='uranus'){
  ball('#a2cdd0',-.4,2.45,1.9,1.9,1.3);ball('#b8dedb',-.8,2.6,1.15,1.6,.15,1.2);for(const[s,c]of[[2.45,'#849d9c'],[2.7,'#c9ccae']])ring(c,-.4,2.45,s*.3,s,.15,-.15,.12);line('#d3e2d6',-2.9,2.8,2.1,2,.035,-.3);ball('#bac5bb',2.7,1.1,.28);star(3,3.8);
 }else if(id==='neptune'){
  ball('#83b6ca',-.5,2.5,1.95,1.95,1.35);ball('#79a3b8',-.05,2.05,.65,.28,.08,1.32);for(const[x,y,w]of[[-.9,3.2,1.05],[-.4,2.9,1.45],[.4,1.4,.8]])ball('#c2dada',x,y,w,.08,.06,1.33);ring('#819dad',-.5,2.5,2.45,.48,-.15,-.22);ball('#b5c8c7',2.8,3.5,.28);star(3.6,1);
 }else if(id==='pluto_kuiper'){
  ball('#b5a799',-.6,2.4,1.6,1.6,1.1);ball('#e7d8be',-.77,2.45,.55,.62,.06,1.05);ball('#e5d8c0',-.12,2.6,.57,.58,.06,1.06);p('pyramid','#e5d8c0',-.45,1.94,.62,.64,.06,1.08,0,0,Math.PI);ball('#979a9a',2.3,3.2,.7,.7,.55);for(const[x,y,s]of[[-3,1,.22],[3.3,1.4,.27],[1.8,.6,.18],[-2.8,3.8,.2]])rock(x,y,s,'#c0cdca');star(3.5,4.2,.05);
 }else if(id==='heliopause'){
  // Open, broken arcs hint at a boundary; no solid wall or collision geometry.
  for(const [y,rz]of[[1.2,-.2],[3.6,.2]])p('arch','#8095b2',-.5,y,3,1.2,.3,-.7,0,0,rz);box('#acb2ac',.1,1.5,.9,.65,.7);dish(.1,2.2,1.7);line('#d1d5bb',0,1.5,-2.5,.8,.045);line('#d1d5bb',.4,1.4,2.8,.6,.04);for(const x of[-2.6,-2.2])box('#697a87',x,.8,.25,.55,.45);ball('#d5b465',.4,1.5,.23,.23,.04,.4);line('#ded9b9',.5,2.8,2,4,.035);star(-3.3,3.8);
 }else if(id==='oort_cloud'){
  for(let i=0;i<13;i++){const a=i*.49;rock(Math.cos(a)*2.6,2.4+Math.sin(a)*1.65,.14+(i%3)*.04,['#b7c9cb','#d1d5d1','#98b2bc'][i%3],-.3);}star(0,2.3,.13,'#ead0a0');p('arch','#8595a5',0,3.1,.3,.3,.1);ball('#a9bcc5',0,2.48,.065); // a modest question mark: inferred cloud, not photographed wall
 }else if(id==='proxima'){
  ball('#d79077',-.8,2.5,1.55,1.55,1);for(let i=0;i<8;i++){const a=i*Math.PI/4;p('cone','#e7af84',-.8+Math.cos(a)*1.85,2.5+Math.sin(a)*1.85,.13,.42,.12,0,0,0,a-Math.PI/2);}ring('#995f62',-.8,2.5,2.5,.55,-.5,-.23);ball('#746571',2.6,1.5,.5,.5,.4);ball('#b69b91',2.4,1.65,.13,.17,.04,.4);
 }else if(id==='black_hole'){
  ball('#171829',-.3,2.5,1.45,1.45,.5);for(const[s,c]of[[1.55,'#f0c58f'],[1.8,'#c58c72'],[2.05,'#6a5979']])ring(c,-.3,2.5,s,s*.38,.2,-.12);p('arch','#d9b4a3',-.3,2.5,1.65,1.65,.2,-.2);box('#baa998',2.7,1.6,1,.7,.15);line('#c8c4a8',2.7,.2,2.7,1.3,.055);line('#f0d4a6',2.4,1.6,3,1.6,.055,.12);line('#f0d4a6',3,1.6,2.8,1.8,.055,.12);star(-3,4);
 }else if(id==='cosmic_laundry'){
  box('#becfc7',0,2.1,3.5,3.8,1.2);box('#7999a2',0,3.55,3.2,.6,.08,.67);for(const x of[-1.1,-.6])ball('#e8c58b',x,3.6,.12,.12,.05,.74);box('#b6e3d9',.65,3.6,.9,.23,.04,.74);ball('#536d84',0,1.9,1.25,1.25,.08,.68);ring('#e3e6d0',0,1.9,1.28,1.28,.8);for(const[x,y,rz]of[[-.4,2.2,.5],[.4,1.7,-.7],[-.3,1.25,.3]])box('#d0b697',x,y,.6,.45,.12,.88,rz);bubbles(2,2.4);box('#b5a6c8',-2.4,.9,.55,.65,.2,.3,.3);box('#b5a6c8',-2.15,.64,.5,.24,.2,.3);star(-2.6,3.9);
 }else if(id==='galactic_market'){
  for(const[x,c]of[[-2.3,'#ba857d'],[.1,'#a8b8a4'],[2.5,'#ab9ebd']]){box('#8c877f',x,1.0,1.8,1.6,1);box('#d6b792',x,1.6,2,.18,1.2,.25);for(const dx of[-.8,.8])line('#d7c39b',x+dx,1.8,x+dx,3,.055);p('pyramid',c,x,3,1.5,.7,1.0);for(let i=0;i<4;i++)ball(['#d7aa74','#b5ce99','#d6be99'][i%3],x-.55+i*.36,1.85,.15,.15,.12,.55);}line('#ccb69a',-3.4,4.1,3.5,4.1,.035);for(let i=0;i<7;i++){ball(i%2?'#d8b782':'#c3897c',-3+i,3.8,.17,.23,.14);line('#d0c0a7',-3+i,4.1,-3+i,4,.025);}alien(.1,2.0,.55);star(-3.4,.6);
 }else if(id==='bubble_tea'){
  p('cylinder','#ceb498',0,2,1.4,3.3,1.0);p('cylinder','#b78c71',0,1.6,1.32,2.1,.96,.1);for(let i=0;i<12;i++)ball('#665354',(i%4-.5*3)*.48,.65+Math.floor(i/4)*.42,.19,.19,.11,.97);p('cylinder','#e6d4b4',0,3.7,1.55,.18,1.13);box('#b2d5cf',.45,4.3,.25,1.35,.25,0,-.18);ring('#9b87b1',0,2,2.65,.55,-.25,.3);ball('#756071',2.9,2.6,.34);ball('#c8a37d',-2.8,1.4,.27);star(-2.8,3.8);
 }else if(id==='alien_judges'){
  box('#a18e8e',0,.7,6.5,1.1,1.3);box('#d7bd95',0,1.3,6.9,.18,1.5);for(const[x,c]of[[-2.2,'#b8c59d'],[0,'#9ec5bd'],[2.2,'#bbaccd']]){alien(x,1.4,.95,c);box('#eddfb8',x+.65,1.95,.65,.65,.07,.85); // score cards use geometric marks, not unreadably tiny text
  for(const dx of[-.2,.2])box('#596f77',x+.65+dx*.7,1.95,.06,.4,.025,.9);box('#596f77',x+.65,2.12,.32,.06,.025,.9);}star(-3.5,3.7);star(3.5,3.8);
 }else if(id==='endless_multiverse'){
  const variant=MULTIVERSE_VARIANTS.find(v=>v.id===variantId)||MULTIVERSE_VARIANTS[0];
  // Recombine familiar places, rather than collapsing the world into an ending.
  // All pieces join the same disposable batch; there is no scene/geometry cache.
  variant.scenes.forEach((scene,i)=>{const scale=i?.62:.7,dx=i?2.2:-2.2,dy=i?0:.5;
   for(const part of cosmicParts(art,scene))out.push({...part,x:part.x*scale+dx,y:part.y*scale+dy,z:part.z*scale,sx:part.sx*scale,sy:part.sy*scale,sz:part.sz*scale});
  });
 }else return null;
 const pattern=CONSTELLATION_FOR[id];if(pattern){const points=pattern==='orion'?[[-3.6,4],[-2.6,3.85],[-3.4,3.1],[-3.05,3.05],[-2.7,3],[-3.6,2.25],[-2.5,2.35]]:pattern==='ursa_major'?[[-3.7,3.5],[-3.35,3.8],[-2.9,3.7],[-2.4,3.5],[-1.8,3.7],[-1.7,4.2],[-2.4,4.1]]:[[-3.8,4.3],[-3.55,4],[-3.2,3.8],[-2.8,3.6],[-2.5,3.8],[-2.7,4.1],[-3,4]];for(let i=0;i<points.length;i++){star(...points[i],.065,'#e7d9b1');if(i)line('#627b98',...points[i-1],...points[i],.018,-.1);}if(pattern==='orion'){ring('#b4b5bd',-3.1,1.8,.26);line('#d7d0af',-3.1,1.8,-3.1,2,.035);box('#b8bcc1',-3.1,2.13,.18,.08,.05);} }
 return out;
}
