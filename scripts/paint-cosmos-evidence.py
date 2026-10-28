# Rasterises the actual Three triangles exported by render-cosmos-evidence.mjs.
# CPU painter lighting is approximate, and this is explicitly NOT a WebGL screenshot.
from PIL import Image,ImageDraw,ImageFont
import json,glob,os,sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
base=os.environ.get('COSMOS_EVIDENCE_DIR','evidence/cosmos')
folder=base+'/render'
output=base+'/render-final'
os.makedirs(output,exist_ok=True)
fontpath='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
font=ImageFont.truetype(fontpath,20); small=ImageFont.truetype(fontpath,13)
def frame(path):
 d=json.load(open(path)); im=Image.new('RGB',(d['width'],d['height']),d['sky']);rgb=np.array(im);depth=np.full((d['height'],d['width']),np.inf)
 for row in d['triangles']:
  _,x,y,z,x2,y2,z2,x3,y3,z3,r,g,b=row
  den=(y2-y3)*(x-x3)+(x3-x2)*(y-y3)
  if abs(den)<.001:continue
  xmin=max(0,int(min(x,x2,x3)));xmax=min(d['width']-1,int(max(x,x2,x3))+1);ymin=max(0,int(min(y,y2,y3)));ymax=min(d['height']-1,int(max(y,y2,y3))+1)
  if xmin>xmax or ymin>ymax:continue
  xx,yy=np.meshgrid(np.arange(xmin,xmax+1)+.5,np.arange(ymin,ymax+1)+.5)
  a=((y2-y3)*(xx-x3)+(x3-x2)*(yy-y3))/den;bary=((y3-y)*(xx-x3)+(x-x3)*(yy-y3))/den;cc=1-a-bary
  zz=a*z+bary*z2+cc*z3;view=depth[ymin:ymax+1,xmin:xmax+1];mask=(a>=0)&(bary>=0)&(cc>=0)&(zz>=-1)&(zz<=1)&(zz<view)
  view[mask]=zz[mask];rgb[ymin:ymax+1,xmin:xmax+1][mask]=(r,g,b)
 raw=Image.fromarray(rgb); im=Image.new('RGB',(d['width'],d['height']+74),'#182333');im.paste(raw,(0,48));draw=ImageDraw.Draw(im)
 draw.rectangle((0,0,d['width'],48),fill='#182333');draw.text((15,6),d['label'],font=font,fill='#f3e6c7');draw.text((15,31),'實際程式幾何・CPU 預覽，非 WebGL 畫面',font=small,fill='#a5c6cb')
 if d['kind']=='motion':
  draw.text((15,d['height']+51),f"正常速度 1× · 實際輸入遊戲時間 {d['time']:.2f} s · 分段節錄",font=small,fill='#eee2c6')
 im.save(output+'/'+os.path.basename(path).replace('.json','.png'))
with ProcessPoolExecutor(max_workers=4) as pool:
 list(pool.map(frame,[p for p in sorted(glob.glob(folder+'/*.json')) if not p.endswith('manifest.json') and (len(sys.argv)<2 or os.path.basename(p)==sys.argv[1])]))
gallery=sorted(glob.glob(output+'/gallery-*.png')); columns=3 if len(gallery)==6 else 4; tile=426 if columns==3 else 320; height=round(tile*474/640); sheet=Image.new('RGB',(columns*tile,((len(gallery)+columns-1)//columns)*(height+10)),'#111c2b');dr=ImageDraw.Draw(sheet)
for i,p in enumerate(gallery):
 im=Image.open(p).resize((tile,height),Image.Resampling.LANCZOS);sheet.paste(im,((i%columns)*tile,(i//columns)*(height+10)))
sheet.save(base+'/cosmic-gallery.jpg',quality=91)
print('Rendered',len(glob.glob(output+'/*.png')),'source-geometry frames')
