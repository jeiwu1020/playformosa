from pathlib import Path
import subprocess, numpy as np, json,hashlib
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/'jump-audio-round2'/'originals'
OUT=ROOT/'web';OUT.mkdir(exist_ok=True)
sr=44100

def read(p,af,t=None):
 cmd=['ffmpeg','-v','error','-i',str(p)]
 if t:cmd+=['-t',str(t)]
 return np.frombuffer(subprocess.check_output(cmd+['-af',af,'-f','f32le','-ac','2','-ar',str(sr),'-']),np.float32).reshape(-1,2).copy()
def fade(a,start,end):
 for target,sec,reverse in [(a, start,False),(a,end,True)]:
  n=min(len(a),int(sec*sr));r=np.linspace(0,1,n)[:,None]
  if reverse:a[-n:]*=r[::-1]
  else:a[:n]*=r
 return a
music=fade(read(SOURCE/'Funin and Sunin.mp3','lowpass=f=6500,loudnorm=I=-26:TP=-7:LRA=9'),.35,1)
step=read(SOURCE/'footstep04.ogg','highpass=f=70,lowpass=f=2400');step*=10**(-19/20)/abs(step).max();fade(step,.006,.025)
cheer=read(SOURCE/'cheer1_FoolBoyMedia_397434_hq-preview.mp3','highpass=f=100,lowpass=f=6500,loudnorm=I=-24:TP=-8:LRA=7',3);cheer*=min(1,10**(-10/20)/abs(cheer).max());fade(cheer,.06,.35)
manifest=[]
for name,a in [('bgm',music),('step',step),('result',cheer)]:
 for ext,codec in [('ogg',['-c:a','libvorbis','-q:a','3']),('mp3',['-c:a','libmp3lame','-b:a','128k'])]:
  p=OUT/(name+'.'+ext);subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ac','2','-ar',str(sr),'-i','-',*codec,str(p)],input=a.astype(np.float32).tobytes(),check=True)
  decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','2','-ar',str(sr),'-']),np.float32)
  manifest.append({'file':p.name,'frames':len(decoded)//2,'decoded_seconds':len(decoded)/2/sr,'peak_dbfs':float(20*np.log10(max(abs(decoded).max(),1e-9))),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ROOT/'selected-manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
