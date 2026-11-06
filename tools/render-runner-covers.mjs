// Optimize approved generated art and derive matching install/menu icons. No runtime game art is changed.
import{createCanvas,loadImage}from'@napi-rs/canvas';import{mkdir,writeFile,readFile,copyFile}from'node:fs/promises';import{createHash}from'node:crypto';
const source=process.argv[2];if(!source)throw Error('Usage: node tools/render-runner-covers.mjs <approved generated-art directory>');
const manifest={generator:'OpenAI image_gen',purpose:'Homepage illustration and menu/install icon only. Runtime runner/track art unchanged.',files:[]};
for(const event of ['400m','1500m']){
 const input=source+'/run-'+event+'-cover.png',bytes=await readFile(input),art=await loadImage(bytes),out=new URL('../public/assets/run-'+event+'-card.png',import.meta.url);await copyFile(input,out);
 const iconDir=new URL('../public/assets/app-icons/run-'+event+'/',import.meta.url);await mkdir(iconDir,{recursive:true});
 // A square frame shows the runner's face/body with its actual generated track context.
 for(const [name,size]of [['apple-touch-icon.png',180],['favicon-32.png',32],['favicon-48.png',48],['icon-192.png',192],['icon-512.png',512]]){const c=createCanvas(size,size),x=c.getContext('2d');x.drawImage(art,event==='400m'?260:530,0,941,941,0,0,size,size);await writeFile(new URL(name,iconDir),c.toBuffer('image/png'));}
 manifest.files.push({game:'run-'+event,sourceFilename:'run-'+event+'-cover.png',sourceSha256:createHash('sha256').update(bytes).digest('hex'),width:art.width,height:art.height,cover:'public/assets/run-'+event+'-card.png',icons:'public/assets/app-icons/run-'+event+'/'});
}
await writeFile(new URL('../docs/runners/ART-PROVENANCE.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
