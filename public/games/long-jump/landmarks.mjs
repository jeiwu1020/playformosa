// Recognisable miniatures, not geographic reconstructions. One builder per itinerary identity.
// Coordinates and progression live in route-data/world and are deliberately untouched.
export function landmarkParts(art,r){
 const parts=[],p=(shape,c,x,y,sx,sy,sz,z=0,rx=0,ry=0,rz=0)=>art.part(parts,shape,c,x,y,z,sx,sy,sz,rx,ry,rz);
 const box=(c,x,y,w,h,d=1,z=0,rz=0)=>p('box',c,x,y,w,h,d,z,0,0,rz);
 const ball=(c,x,y,w,h=w,d=w,z=0)=>p('sphere',c,x,y,w,h,d,z);
 const rod=(c,x,y,w,h,z=0)=>p('cylinder',c,x,y,w,h,w,z);
 const roof=(x,y,w,c='#547c75',d=w*.6)=>{p('pyramid',c,x,y,w,.7,d,0,0,Math.PI/4);box(c,x,y-.25,w*1.4,.12,d*1.4);};
 const windows=(x,y,w,count=4,rows=2,c='#d6f1ef',z=.61)=>{for(let row=0;row<rows;row++)for(let i=0;i<count;i++)box(c,x+(i-(count-1)/2)*w/count,y+row*.34,w/count*.48,.18,.025,z);};
 const tree=(x,y=0,green='#5d8f77',s=1,z=-1)=>{rod('#927054',x,y+s*.7,.10*s,1.4*s,z);ball(green,x,y+s*1.7,.65*s,.8*s,.65*s,z);};
 const arch=(x,y,w,h,c='#986e53',z=.65)=>p('arch',c,x,y,w,h,.3,z);
 const water=(w=8,d=3)=>box('#71b7c4',0,.025,w,.05,d);
 const platform=(w=7,c='#c7bda6')=>box(c,0,.12,w,.24,2.8);
 const temple=(x,y,w,levels=1,c='#b95e4c')=>{for(let i=0;i<levels;i++){const a=w-i*.6;box('#efe3c9',x,y+i*.9+.35,a,.7,1.5);for(const dx of[-.35,0,.35])box(c,x+dx*a,y+i*.9+.32,.12,.8,.16,.82);roof(x,y+i*.9+.95,a*.78,i%2?'#4c7465':'#566d65');}};
 const pine=(x,y,s=1,z=-.6)=>{rod('#735d4a',x,y+.8*s,.12*s,1.6*s,z);for(let i=0;i<3;i++)p('cone',['#496c61','#527d69','#638b70'][i],x,y+(.9+i*.5)*s,(.8-i*.15)*s,1.25*s,(.65-i*.12)*s,z);};
 const bridge=(c='#b65b42')=>{water();for(const side of[-1,1]){for(let i=-4;i<4;i++){const y=1.05+(1-(i/4)**2)*1.2;box(c,i*.78,y,.85,.15,.15,side*.7,Math.atan(-i*.13));box(c,i*.78,y*.5,.1,y,.1,side*.7);}box('#e2bd90',0,.7,7,.2,1.7);}};
 const id=r.id;
 if(id==='taipei'){
  platform(3.2,'#c4bca8');box('#9baea6',0,.55,2.3,.9,1.65);box('#6b9e9e',0,1.2,1.45,.5,1.2);
  for(let i=0;i<8;i++){const y=1.65+i*.53;p('flare',i%2?'#75b3b0':'#86bdb7',0,y,1.0,.48,.82,0,0,Math.PI/4);box('#407c83',0,y+.2,1.43,.065,.04,.59);for(const dx of[-.45,-.15,.15,.45])box('#b7dbd0',dx,y,.025,.34,.025,.59);}
  box('#8bb5ae',0,5.95,.92,.65,.76);box('#5d9699',0,6.4,.48,.3,.45);rod('#bacdbe',0,6.95,.035,.85);ball('#c5ae6f',0,1.05,.19,.19,.04,.84);
 }else if(id==='keelung'){
  water(10,3);for(let i=0;i<6;i++){const c=['#e6b76c','#bd7268','#97b9ab','#d4b3c5','#a0bdcb','#e2d8b8'][i];box(c,(i-2.5)*1.1,1,1,1.9,1.2,-.7);windows((i-2.5)*1.1,1,1,2,2,'#537e8a',-.08);}box('#d0bca0',0,.25,8,.3,.7,.5);box('#eeede2',1,.6,2.4,.45,.85,1.1);box('#739fa8',1,1.02,.8,.4,.6,1.1);
 }else if(id==='newtaipei'){
  for(let i=0;i<5;i++){const x=(i-2)*1.3,y=i*.4;box('#806b59',x,y+.6,1.5,1.2,1.4);roof(x,y+1.35,1.05,'#4e5e5a');windows(x,y+.5,1.2,2,1,'#f5cf76',.73);for(const dx of[-.4,.4]){rod('#584e45',x+dx,y+1.05,.025,.4,.9);ball('#d96246',x+dx,y+.9,.16,.20,.16,.9);}}for(let i=0;i<7;i++)box('#b6a58d',2.8,i*.22,1,.18,.55,i*.2);
 }else if(id==='taoyuan'){
  box('#c8d5ce',0,.7,6,1.4,2);windows(0,.5,5.5,10,2,'#578390',1.02);rod('#acb7b6',-3.8,1.5,.28,3);box('#638c9a',-3.8,3,1.2,.6,1);box('#eeeece',1.6,2.6,3.6,.24,.35);box('#edf1dd',1.5,2.7,1,.10,3.2);box('#8ca6ae',.1,3,.2,.8,.12);
 }else if(id==='hsinchu_county'){
  platform();box('#c1cbbf',0,.8,6,1.6,1.8);for(const x of[-2.5,-1.25,0,1.25,2.5]){box('#689393',x,.8,.65,1.1,.04,.92);box('#dfe3cf',x,1.8,.13,1.3,2.1,0,-.25);}box('#b2c4ba',0,2.3,6.7,.18,2.5);box('#f0ede0',0,.5,5,.7,.85,1.8);ball('#eee9da',2.45,.52,.8,.35,.43,1.8);box('#dd8b51',0,.4,5.5,.13,.02,2.24);windows(0,.65,4.4,8,1,'#537b83',2.25);
 }else if(id==='hsinchu_city'){
  platform();box('#b48465',0,.85,4.4,1.6,2);arch(0,.6,.65,.8,'#77553f',1.01);box('#4a514c',0,.55,1.05,1,.05,1.02);temple(0,1.6,2.5,1);for(const dx of[-2,2])box('#b28465',dx,1.9,.45,.45,2);
 }else if(id==='miaoli'){
  water();for(let i=0;i<4;i++){const x=(i-1.5)*1.5;box('#a65443',x,1,.45,2,1.2);p('arch','#b56950',x+.7,1.5,.7,.9,.6,.15);}box('#87513f',-3.1,1.6,.6,3.2,1.4);tree(3.1,0,'#638970',1.4);
 }else if(id==='taichung'){
  platform();box('#e3d8c3',0,1.7,5.8,3.4,2.0);for(const x of[-1.85,0,1.85]){ball('#537a82',x,1.1,.55,.95,.04,1.02);ball('#537a82',x,2.6,.68,.7,.04,1.02);box('#537a82',x,1.9,.36,.8,.05,1.03);}box('#c0b4a1',0,3.47,6,.16,2.2);tree(-3.8,0,'#718f71',1);
 }else if(id==='changhua'){
  platform(4);box('#b0a18a',0,.6,2.8,.7,2.4);ball('#b99e73',0,1.4,1.3,.65,1);ball('#c6ad81',0,2.45,.9,1.2,.7);ball('#b89c6d',0,3.9,.62,.67,.55);ball('#7e6e54',0,4.4,.55,.25,.5);for(const s of[-1,1])ball('#c4a978',s*.85,2.2,.3,.9,.35);box('#b59d75',0,2.3,.75,.18,.4,.7);
 }else if(id==='nantou'){
  water(10,5);for(const x of[-3.5,3.5])p('cone','#779e83',x,1.2,2.5,2.4,1.5,-2);box('#bb7a56',0,.35,4,.2,.5,.6);for(const x of[-1.5,0,1.5])rod('#8c6f51',x,.2,.06,.4,.6);box('#bb5949',1.3,.55,1.6,.35,.7,1.2);roof(1.3,1.05,1.1,'#dba36d',.6);tree(-2.2,0,'#65977c',1.2,-.5);
 }else if(id==='yunlin'){
  platform();box('#b66c50',0,.7,4,1.4,1.7);box('#694f43',0,1.7,3.4,1.5,1.2);for(const x of[-1.7,1.7])box('#c8674f',x,1.8,.25,1.9,.4,.7);roof(0,2.8,3.0,'#a5764e');box('#d2b66f',0,2.6,2.1,.35,.06,.8);for(const[x,c]of[[-.65,'#719e98'],[.65,'#cc7866']]){p('cone',c,x,1.25,.28,.7,.2,.8);ball('#dfc89c',x,1.8,.19,.22,.16,.8);box(c,x,1.4,.7,.12,.12,.8);}for(const x of[-3,3])box('#adbb70',x,.06,1.3,.12,3);
 }else if(id==='chiayi_county'){
  for(let i=0;i<7;i++)pine((i-3)*.8,0,.9+(i%3)*.25,-1.4);for(const x of[-2.5,0,2.5])ball('#dce4d3',x,.6,2,.35,1,.5);ball('#efd08b',1.6,2.8,.65,.65,.12,-2.5);box('#b75c4a',-.5,.8,2.1,.7,.7,.8);roof(-.5,1.25,1.6,'#6b574b',.6);
 }else if(id==='chiayi_city'){
  platform();box('#8b5747',0,.95,3.6,.9,1.2);p('cylinder','#3e5352',1.4,1.1,.65,1.5,.65,0,0,0,Math.PI/2);box('#b26c4f',-1.3,1.7,1.1,.8,1.3);roof(-1.3,2.25,1.0,'#545c51');rod('#465951',1.1,1.9,.22,1.1);for(const x of[-1.5,-.4,.7,1.6])ball('#394d4b',x,.5,.4,.4,.12,.7);for(const x of[-3,3])pine(x,0,1.1,-1.2);
 }else if(id==='tainan'){
  box('#b47c5e',0,.7,6,1.4,2.8);for(const x of[-1.8,1.5]){temple(x,1.4,2.4,2);roof(x,3.6,1.7,'#ad5e48');}for(let i=0;i<5;i++)box('#c4ac8a',0,i*.22,1.0,.22,1.2-i*.13,1.5-i*.1);
 }else if(id==='kaohsiung'){
  water(9,3);box('#d5e0cc',0,1.3,4.6,2.2,2);for(const x of[-2,-1,0,1,2])p('cylinder','#e9d4a2',x,2.5,.8,.3,.8,0);box('#657f7b',0,2.5,2,.6,1.3);for(const x of[-1.6,-.8,0,.8,1.6])box('#65949a',x,1.2,.45,1.6,.03,1.02);box('#c69057',-3.5,1.5,.12,3,.15);box('#c69057',-2.9,2.8,1.3,.12,.15);box('#f4ecda',3,.4,2,.5,.8,1);
 }else if(id==='pingtung'){
  platform(4,'#ded7b9');rod('#eeeedd',0,2.0,.65,4);for(const y of[.55,1.2,1.85,2.5])box('#6c8884',.06,y,.18,.23,.025,.65);rod('#586968',0,3.9,.85,.25);rod('#adc9c2',0,4.25,.48,.55);p('cone','#535e5a',0,4.7,.8,.5,.8);for(const x of[-2.4,2.4])tree(x,0,'#78916b',.7);
 }else if(id==='taitung'){
  for(const[x,y,c]of[[-2,3.2,'#ec9c56'],[1.3,4.1,'#cf708b'],[3.4,2.5,'#8bbeb0']]){ball(c,x,y,.95,1.2,.8);for(const dx of[-.3,.3])box('#ead2ad',x+dx,y-1.35,.03,.5,.03);box('#987357',x,y-1.7,.6,.42,.5);p('ring','#f0d99d',x,y,.9,.9,.9,0,Math.PI/2);}p('cone','#a0b27d',0,.2,5,.5,3,-1);
 }else if(id==='hualien'){
  water(2.2,6);for(const x of[-3,3]){p('flare','#a0aaa2',x,1.7,2.4,3.4,1.7,0,0,.3*x);for(let i=0;i<4;i++)box('#c5cbc0',x,1+i*.55,2,.05,.04,.95);}box('#a96450',-.7,2.0,2.5,.13,.6,.8);temple(1.8,1.4,1.2,1);
 }else if(id==='yilan'){
  bridge('#bc6149');for(const x of[-4,4]){box('#aabd72',x,.15,2,.3,3);tree(x,0,'#76997a',.65,-1.2);}
 }else if(id==='matsu'){
  for(const[x,y]of[[-2,0],[0,.6],[2,1.2]]){box('#a99b85',x,y+.7,1.8,1.4,1.7);roof(x,y+1.65,1.3,'#735b4b');windows(x,y+.7,1.5,2,1,'#506d77',.87);}box('#749dad',0,.05,8,.1,3,1.3);
 }else if(id==='kinmen'){
  platform();box('#b4aa92',0,1.1,4.6,2.2,2.5);for(const x of[-1.5,0,1.5])box('#7a8577',x,1.1,.4,.75,.03,1.27);temple(0,2.2,3.8,2,'#b45b46');roof(0,4.2,3,'#c58c5f');for(const x of[-2.2,2.2])box('#a65c49',x,3.2,.15,1.1,.15,0,x<0?-.35:.35);ball('#a89e82',3,.7,.5,.65,.5);ball('#b0a58b',3,1.4,.4,.35,.35);
 }else if(id==='penghu'){
  water(9,3);for(let i=0;i<9;i++){const h=1.5+(i%3)*.55;p('cylinder',i%2?'#718581':'#929b8b',(i-4)*.55,h/2,.38,h,.38,0);}for(const x of[-3.6,3.6])box('#c5a877',x,.1,1.2,.2,2);box('#b58b68',0,.05,8,.1,1.2,1.4);
 }else if(id==='okinawa'){
  platform();temple(0,.3,4.5,2,'#bd4b3d');roof(0,2.6,3.6,'#ce6e50');for(const x of[-3,3]){box('#d2b992',x,.8,1.0,1.5,1.4);ball('#c4a474',x,1.9,.45,.5,.45);ball('#b69266',x,2.4,.3,.28,.3);}
 }else if(id==='seoul'){
  platform(8);for(const x of[-3,0,3])temple(x,.2,x===0?3.2:2.5,x===0?2:1,'#af5746');for(const x of[-2,-1,0,1,2])box('#d6c9b1',x,.3,.2,.6,.2,1.3);
 }else if(id==='osaka'){
  p('flare','#a9a48f',0,.65,2.7,1.3,2.0,0,Math.PI,Math.PI/4);for(let i=0;i<4;i++){const w=3.8-i*.65;box('#eee7d2',0,1.6+i*.8,w,.65,1.7-i*.22);roof(0,2.1+i*.8,w*.78,'#638c7d');windows(0,1.5+i*.8,w,4,1,'#637d76',.88-i*.11);}ball('#d3b869',-.7,4.7,.12);ball('#d3b869',.7,4.7,.12);
 }else if(id==='tokyo'||id==='france'){
  const c=id==='tokyo'?'#d46443':'#847a67';
  const beam=(color,x1,y1,x2,y2,w=.14,z=0)=>box(color,(x1+x2)/2,(y1+y2)/2,w,Math.hypot(x2-x1,y2-y1),.18,z,-Math.atan2(x2-x1,y2-y1));
  const levels=[[1.8,0],[1.23,1.5],[.65,3.2],[.16,4.5]];
  for(const side of[-1,1])for(let i=1;i<levels.length;i++){const[a,y1]=levels[i-1],[b,y2]=levels[i];beam(id==='tokyo'&&i===2?'#efe3cd':c,side*a,y1,side*b,y2);}
  for(const[y1,w1,y2,w2]of[[1.6,1.2,3.1,.7],[3.3,.6,4.4,.2]]){beam(c,-w1,y1,w2,y2,.08,.09);beam(c,w1,y1,-w2,y2,.08,.09);}
  for(const[y,w]of[[1.5,3.1],[3.2,1.8],[4.5,.6]])box(c,0,y,w,.18,.65);
  if(id==='tokyo'){box('#e8dcc5',0,2.6,1.9,.45,.75);box(c,0,2.9,2.1,.15,.8);box('#708e91',0,2.65,1.6,.12,.025,.4);}else arch(0,.25,1.4,1.3,c);
  rod(c,0,5.25,.055,1.5);
 }else if(id==='bangkok'){
  platform(7);for(const[x,h]of[[-2,2.6],[0,4.6],[2,3.1]]){box('#e4d4ad',x,.65,1.2,1.3,1.2);for(let i=0;i<4;i++)p('cone',i%2?'#ceb265':'#d9c185',x,1.1+i*h/5,.8-i*.15,h/2,.8-i*.15);rod('#b69b57',x,h+.6,.025,.8);}temple(-3.5,.15,1.8,1);
 }else if(id==='singapore'){
  water();for(const x of[-2.5,0,2.5]){box('#a1b6bc',x,2,1.3,4,1.5);windows(x,.5,1.2,3,9,'#dce7d9',.77);}ball('#c3d3c9',0,4.15,4.3,.42,1.2);box('#6c9276',0,4.45,6.5,.12,1.0);for(const x of[-2,0,2])tree(x,4.4,'#6d9276',.25);
 }else if(id==='india'){
  platform(7,'#d8c9a8');box('#f0e7d2',0,1.1,3.3,2.2,2);ball('#f7efdb',0,2.6,1.3,1.45,1.3);p('cone','#f1e8d3',0,3.9,.4,.8,.4);rod('#bba774',0,4.55,.03,.55);for(const x of[-2.6,2.6]){rod('#e6dbc6',x,1.9,.25,3.8);ball('#efe7d1',x,3.9,.38,.4,.38);p('cone','#d4c099',x,4.3,.3,.3,.3);}arch(0,.9,.6,.85,'#baaa8c',1.02);box('#6b9499',0,.05,1,.08,2.5,2.4);
 }else if(id==='dubai'){
  for(let i=0;i<8;i++){const w=2.6-i*.29;box(i%2?'#96b1bc':'#b5c8cb',i*.045,.4+i*.63,w,.75,w*.6);for(const dx of[-.3,0,.3])box('#d4ded7',dx*w,.4+i*.63,.03,.55,.025,w*.31);}rod('#d5dcd3',.3,6.2,.025,2.1);
 }else if(id==='egypt'){
  for(const[x,h,z]of[[-1,4.5,-.8],[3,3.0,-2.5]])p('pyramid','#dab783',x,h/2,h,h,h,z,0,Math.PI/4);box('#bc9562',-3,.4,2,.8,.8,1);ball('#d0ad78',-3.6,1.1,.55,.7,.5,1);box('#c39e69',-3.6,1.4,.8,.5,.6,1);
 }else if(id==='rome'){
  p('cylinder','#c9ae88',0,1.5,3.8,3,2.3);for(let row=0;row<3;row++)for(let i=0;i<9;i++){const x=(i-4)*.7,z=1.6+Math.sqrt(Math.max(0,1-(x/3.8)**2))*.5;box('#786e59',x,.55+row*.85,.38,.6,.04,z);arch(x,.72+row*.85,.24,.3,'#ddc39e',z+.02);}for(const y of[.13,1,1.9,2.8])p('ring','#e0c7a1',0,y,3.8,2.3,1,0,Math.PI/2);
 }else if(id==='london'){
  box('#c6b28a',0,2.2,1.6,4.4,1.5);windows(0,.7,1.5,3,7,'#7d877b',.76);box('#cbb98f',0,4.4,2,.7,1.8);ball('#f5edd4',0,4.4,.58,.58,.035,.93);box('#4f6463',0,4.55,.05,.3,.02,.99);box('#4f6463',.16,4.4,.32,.05,.02,.99);p('pyramid','#59756e',0,5.35,1.4,1.2,1.4,0,0,Math.PI/4);rod('#bba679',0,6.2,.025,.75);box('#cbb48a',-2.4,.8,3,1.6,1.3);for(const x of[-3.4,-2.6,-1.8])p('pyramid','#708375',x,1.9,.4,.7,.4);
 }else if(id==='usa'){
  platform(4);box('#bba588',0,.65,1.8,1,1.8);p('cone','#7cae9f',0,2.5,.9,2.8,.75);ball('#94bba9',0,4.05,.38,.45,.35);for(let i=0;i<7;i++){const a=(i-3)*.34;box('#6e9a8c',Math.sin(a)*.48,4.35+Math.cos(a)*.15,.07,.5,.07,0,-a);}box('#83ae9e',-.65,3.7,.3,1.8,.3,0,.35);rod('#bd9d5a',-.94,4.65,.14,.55);ball('#e6c276',-.94,5.1,.17,.35,.17);box('#85a899',.5,3.1,.65,.75,.18,.45,.2);
 }else if(id==='rio'){
  p('cone','#779077',0,1.1,3.2,2.2,2.2,-.4);box('#d5d7c8',0,3,.55,2.6,.5);ball('#d5d7c8',0,4.55,.38,.43,.35);box('#d5d7c8',0,3.9,3.6,.32,.4);for(const s of[-1,1])ball('#d5d7c8',s*1.85,3.85,.2,.15,.17);
 }else if(id==='losangeles'){
  p('sphere','#a4a67b',0,.1,5,1.3,2.2,-.7);const strokes={H:[[0,0,.13,1],[.55,0,.13,1],[.27,0,.55,.12]],O:[[.27,.46,.55,.12],[.27,-.46,.55,.12],[0,0,.12,1],[.55,0,.12,1]],L:[[0,0,.12,1],[.27,-.45,.55,.12]],Y:[[.1,.25,.12,.6,.4],[.45,.25,.12,.6,-.4],[.27,-.3,.12,.5]],W:[[0,0,.12,1],[.55,0,.12,1],[.27,-.25,.12,.5]],D:[[0,0,.12,1],[.27,.45,.55,.12],[.27,-.45,.55,.12],[.55,0,.12,.9]]};[...'HOLLYWOOD'].forEach((ch,i)=>{for(const[x,y,w,h,rz=0]of strokes[ch])box('#eee9d6',(i-4)*.77+x,2+y,w,h,.15,.3,rz);});for(const x of[-4,4])tree(x,0,'#729075',1.1,-1);
 }else if(id==='hawaii'){
  water();p('cone','#9f9172',1,1,3,2,2,-1);p('cone','#6c8c73',1,1.1,2.8,1.8,1.9,-1);for(const x of[-2.7,3.5]){rod('#aa805b',x,1.3,.13,2.6);for(const s of[-1,1]){p('sphere','#648e6e',x+s*.65,2.6,1.1,.18,.6,0,0,0,s*.2);}}box('#d4be91',0,.12,8,.2,2,1);
 }else if(id==='australia'){
  water(10,4);platform(7);for(const[x,h]of[[-2.5,1.4],[-1,2.4],[.8,3.1],[2.5,2.0]]){p('shell','#efe9d4',x,.5,1.25,h,.85,0,0,0,-.35);box('#9ba99c',x,.5,1.4,.4,1.5);box('#c4bca5',x,.3,1.7,.2,1.8);}box('#89785e',0,.15,8,.25,3);
 }else if(id==='newzealand'){
  platform();rod('#acbab8',0,2.2,.19,4.4);p('cone','#b9c7c1',0,.5,.6,1,.6);rod('#7b9c9d',0,4.0,.75,.45);rod('#c9d6ce',0,4.35,.65,.2);rod('#99b5b2',0,4.8,.28,.8);rod('#d7ddd0',0,5.65,.035,1.0);for(const x of[-2.5,2.5]){box('#9aaca8',x,.7,1.7,1.4,1.3);windows(x,.5,1.5,3,2,'#d3ddd1',.67);}
 }else if(id==='world_complete'){
  ball('#71afbd',0,2.7,2.2);for(const[x,y,w,h]of[[-.9,3.4,.8,.6],[.7,2.8,.7,.8],[-.4,1.6,.5,.7]])ball('#9cba7a',x,y,w,h,.12,2);p('ring','#e3bb71',0,2.7,2.7,2.7,2.7);platform(5);box('#b29c67',0,.45,2,.6,1.5);
 }else if(id==='atmosphere'){
  for(const[x,y,s]of[[-3,1,1.6],[-1,1.6,2],[2,1.0,2.2]])ball('#e7eee4',x,y,s,.65,s*.65);p('sphere','#79b8c7',0,.1,5,.45,2,-1);
 }else if(id==='space'){
  box('#c7d2cf',0,2.5,1.5,1.4,1.3);for(const x of[-2.5,2.5]){box('#526f99',x,2.5,3,.12,1.8);for(let i=0;i<4;i++)box('#9caec2',x-1.1+i*.75,2.59,.035,.035,1.75);}p('cone','#dce1d3',0,3.4,.7,.5,.7);rod('#cbd5cb',0,4,.035,.7);box('#8c9d9a',0,1.1,.5,1.4,.5);ball('#e8b96b',0,.2,.4,.55,.4);
 }else if(id==='moon'||id==='mars'){
  const c=id==='moon'?'#c9c7b8':'#c28765';ball(c,0,2.6,2.4,2.4,1.6);for(const[x,y,s]of[[-1,3.6,.43],[1.2,2.7,.5],[-.4,1.5,.35]]){ball(id==='moon'?'#9eaaa5':'#a56d54',x,y,s,s*.7,.06,1.55);p('ring',c,x,y,s,s*.7,s,1.62);}box('#c6d2c9',3.4,.65,1.3,.5,.8);for(const x of[2.9,3.9])ball('#63716c',x,.35,.22,.22,.12,.5);rod('#b9c5bb',3.4,1.3,.04,.9);box('#617c9a',3.7,1.65,.5,.3,.05);
 }else if(id==='saturn'){
  ball('#d9c3a0',0,2.8,2.2);for(const[y,w]of[[1.6,1.8],[2.3,2.16],[3.1,2.15],[3.8,1.85]])ball('#c4aa85',0,y,w,.13,.18,1.98);for(const[s,c]of[[3.0,'#bca57e'],[3.3,'#e3cea9'],[3.65,'#c4b08c']])p('ring',c,0,2.8,s,s*.38,s,0,.3,0,.2);ball('#e1d6b5',4.4,4,.35);
 }else{
  for(const[x,y,s,c]of[[-2,2.8,1.1,'#9f8cb9'],[2,1.8,.55,'#8cafbb'],[3,4.2,.3,'#e0c59c']])ball(c,x,y,s);for(let i=0;i<9;i++)ball('#dce8df',(i-4)*.9,1+(i*7%5)*.6,.055);
 }
 return parts;
}
