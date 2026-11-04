/** Local-only, dependency-free scorecard rendering. Input is describeResult() output. */
const WIDTH = 1080, HEIGHT = 1350;
const COLORS = {cream:'#fff9e9',paper:'#fffdf6',green:'#174941',muted:'#66786a',mint:'#dcebdd',apricot:'#ef945a',gold:'#f4dda7',line:'#c5d2bb'};
const FONT = 'system-ui, -apple-system, "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const PORTRAIT_URL = new URL('./assets/result-pose.png', import.meta.url).href;
const invalidNumber = /(?:NaN|[+-]?Infinity)/i;
function cleanText(value, fallback = '') {
  if (typeof value !== 'string' || invalidNumber.test(value)) return fallback;
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim().slice(0,600) || fallback;
}
function modeName(mode, result) { return mode === 'touch' || (mode === undefined && result?.modeText === '觸控') ? 'touch' : 'mouse'; }

/** Defensive presentation only: it never computes or invents an elapsed time. */
export function normalizeScoreResult(result = {}, mode) {
  result = result && typeof result === 'object' ? result : {};
  const timeText = cleanText(result.timeText);
  // Trust describeResult's success flag: a positive sub-millisecond round may
  // legitimately display 0.000 after presentation rounding.
  const success = result.success === true && /^\d+(?:\.\d+)?$/.test(timeText) && Number.isFinite(Number(timeText)) && Number(timeText) >= 0;
  const invalidSuccess = result.success === true && !success;
  const title = cleanText(result.title,success ? '挑戰成功！' : '這輪未完成');
  return {
    title: !success && /成功|最佳|刷新/.test(title) ? '這輪未完成' : title,
    timeText: success ? timeText : '未完成',
    bestText: cleanText(result.bestText,'尚無紀錄'),
    deltaText: invalidSuccess ? '本輪不列入紀錄' : cleanText(result.deltaText,success ? '本機紀錄暫無比較' : '本輪不列入紀錄'),
    comment: invalidSuccess ? '這輪先不算，準備好再來。' : cleanText(result.comment,success ? '這輪完成了！' : '準備好再來一輪。'),
    modeText: modeName(mode,result) === 'touch' ? '觸控' : '滑鼠',
    success,
  };
}

export function scoreImageFilename(result, mode) {
  const safe = normalizeScoreResult(result, mode);
  return `fast-hands-${modeName(mode,safe)}-${safe.success ? safe.timeText.replace('.','p').slice(0,24)+'s' : 'incomplete'}.png`;
}

/** Character-level wrapping supports Chinese without requiring word spaces. */
export function wrapScoreText(ctx, text, maxWidth, {maxLines = 6} = {}) {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) throw new Error('A positive finite text width is required');
  maxLines = Number.isFinite(maxLines) ? Math.max(1,Math.floor(maxLines)) : 6;
  const lines=[];
  for (const paragraph of String(text ?? '').split('\n')) {
    let line='';
    for (const char of Array.from(paragraph)) {
      if (line && ctx.measureText(line+char).width > maxWidth) { lines.push(line.trimEnd());line=''; }
      line += char;
    }
    lines.push(line.trimEnd());
  }
  if (lines.length <= maxLines) return lines;
  const clipped=lines.slice(0,maxLines);let last=Array.from(clipped[maxLines-1]);
  while (last.length && ctx.measureText(last.join('')+'…').width > maxWidth) last.pop();
  clipped[maxLines-1]=last.join('')+'…';
  return clipped;
}

function roundedRect(ctx,x,y,w,h,r,fill,stroke) {
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function write(ctx,text,x,y,size=30,weight=600,color=COLORS.green,maxWidth) {
  ctx.font=`${weight} ${size}px ${FONT}`;ctx.fillStyle=color;ctx.textBaseline='top';
  if (maxWidth) ctx.fillText(text,x,y,maxWidth); else ctx.fillText(text,x,y);
}
function paragraph(ctx,text,x,y,width,{size=30,lineHeight=44,maxLines=3,weight=600,color=COLORS.green}={}) {
  ctx.font=`${weight} ${size}px ${FONT}`;
  const lines=wrapScoreText(ctx,text,width,{maxLines});
  lines.forEach((line,index)=>write(ctx,line,x,y+index*lineHeight,size,weight,color,width));
  return lines.length*lineHeight;
}
function fitSize(ctx,text,maxWidth,start,min=48) {
  let size=start;
  do {ctx.font=`900 ${size}px ${FONT}`;if(ctx.measureText(text).width<=maxWidth)return size;size-=2;} while(size>min);
  return min;
}
function timeout(promise,ms,message) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(message)),ms);
    Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
async function readyPortrait(portrait,doc) {
  const supplied=!!portrait;
  const image=portrait || doc.createElement('img');
  if (image.complete && image.naturalWidth>0 && image.naturalHeight>0) return image;
  try {
    if (supplied && typeof image.decode==='function') await timeout(image.decode(),8000,'人物圖片載入逾時');
    else await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(new Error('人物圖片載入逾時')),8000);
      const finish=error=>{clearTimeout(timer);image.removeEventListener?.('load',loaded);image.removeEventListener?.('error',failed);error?reject(error):resolve();};
      const loaded=()=>finish();const failed=()=>finish(new Error('人物圖片無法載入'));
      image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
      if (!supplied) image.src=PORTRAIT_URL;
    });
    if (!(image.naturalWidth>0 && image.naturalHeight>0)) throw new Error('Empty portrait');
    return image;
  } catch (cause) {throw new Error('人物圖片無法載入，請稍後再試。',{cause});}
}

/**
 * @param {{result: object, mode?: 'mouse'|'touch', portrait?: HTMLImageElement, document?: Document}} options
 * @returns {Promise<{blob: Blob, filename: string}>}
 * The caller owns downloading/revoking its object URL. No upload or external service is used.
 */
export async function createScoreImage({result,mode,portrait,document:doc=globalThis.document}={}) {
  if (!doc?.createElement) throw new Error('目前無法建立成績圖片。');
  const presentation=normalizeScoreResult(result,mode);
  // A failed or stalled optional webfont must not block local score saving.
  const fonts=doc.fonts?.ready ? timeout(doc.fonts.ready,1500,'Font timeout').catch(()=>{}) : Promise.resolve();
  const [image]=await Promise.all([readyPortrait(portrait,doc),fonts]);
  const canvas=doc.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d');
  if (!ctx) throw new Error('目前無法建立成績圖片。');
  ctx.fillStyle=COLORS.cream;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.lineWidth=3;
  roundedRect(ctx,28,28,1024,1294,36,COLORS.paper,COLORS.green);
  write(ctx,'FAST HANDS  /  快手王',80,79,26,800,COLORS.muted);
  paragraph(ctx,presentation.title,80,150,545,{size:58,lineHeight:78,maxLines:2,weight:900});
  roundedRect(ctx,80,335,250,57,16,presentation.success?COLORS.mint:COLORS.gold);
  write(ctx,presentation.success?'鈔鴨到手，挑戰完成':'這輪未完成，再來！',100,351,23,750);
  // This is a direct render of the game's final pose, not a replacement illustration.
  const box={x:646,y:112,width:340,height:322};
  const scale=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight);
  const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
  try {ctx.drawImage(image,box.x+(box.width-iw)/2,box.y+box.height-ih,iw,ih);}
  catch(cause){throw new Error('人物圖片無法繪製，請稍後再試。',{cause});}

  roundedRect(ctx,76,444,928,247,26,COLORS.mint);
  write(ctx,presentation.success?'本輪完成時間':'本輪結果',114,482,26,750,COLORS.muted);
  const timeSize=fitSize(ctx,presentation.timeText,758,126,56);
  write(ctx,presentation.timeText,110,532,timeSize,900,COLORS.green,758);
  if(presentation.success) write(ctx,'秒',908,601,37,750);
  paragraph(ctx,presentation.comment,88,740,904,{size:35,lineHeight:52,maxLines:3,weight:750});
  ctx.beginPath();ctx.moveTo(80,930);ctx.lineTo(1000,930);ctx.strokeStyle=COLORS.line;ctx.lineWidth=2;ctx.stroke();
  write(ctx,'本機最佳',88,964,25,650,COLORS.muted);
  write(ctx,presentation.bestText,88,1007,45,850,COLORS.green,650);
  roundedRect(ctx,804,964,188,94,18,COLORS.gold);
  write(ctx,'輸入方式',826,980,20,650,COLORS.muted);
  write(ctx,presentation.modeText,826,1014,28,850);
  paragraph(ctx,presentation.deltaText,88,1103,904,{size:27,lineHeight:40,maxLines:3,weight:650});
  write(ctx,'同一輸入方式比較 · 紀錄保存在本機',88,1247,21,550,COLORS.muted);
  write(ctx,'島遊無界工作室 | PLAYFORMOSA STUDIO',88,1284,19,500,COLORS.muted,904);
  return new Promise((resolve,reject)=>{
    try {
      canvas.toBlob(blob=>{
        if(!blob || blob.type!=='image/png' || blob.size===0){reject(new Error('成績圖片產生失敗，請再試一次。'));return;}
        resolve({blob,filename:scoreImageFilename(presentation,mode)});
      },'image/png');
    } catch(cause) {reject(new Error('成績圖片產生失敗，請再試一次。',{cause}));}
  });
}
