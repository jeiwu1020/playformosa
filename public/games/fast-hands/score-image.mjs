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
  return `鴨沒漏補-${modeName(mode,safe)}-${safe.success ? safe.timeText.replace('.','p').slice(0,24)+'s' : 'incomplete'}.png`;
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
  write(ctx,'鴨沒漏補  /  PLAYFORMOSA',80,65,31,800,COLORS.muted);
  paragraph(ctx,presentation.title,80,114,920,{size:48,lineHeight:62,maxLines:1,weight:900});
  // The exact frozen scene gets the full card width, never a small portrait
  // thumbnail. Contain-fit preserves every edge and the original proportions.
  const box={x:90,y:190,width:900,height:620};
  const scale=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight);
  const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
  try {ctx.drawImage(image,box.x+(box.width-iw)/2,box.y+(box.height-ih)/2,iw,ih);}
  catch(cause){throw new Error('人物圖片無法繪製，請稍後再試。',{cause});}

  roundedRect(ctx,76,827,928,158,26,COLORS.mint);
  write(ctx,presentation.success?'本輪完成時間':'本輪結果',114,848,24,750,COLORS.muted);
  const timeSize=fitSize(ctx,presentation.timeText,758,88,56);
  write(ctx,presentation.timeText,110,889,timeSize,900,COLORS.green,758);
  if(presentation.success) write(ctx,'秒',908,937,30,750);
  paragraph(ctx,presentation.comment,88,1010,904,{size:32,lineHeight:43,maxLines:2,weight:750});
  ctx.beginPath();ctx.moveTo(80,1110);ctx.lineTo(1000,1110);ctx.strokeStyle=COLORS.line;ctx.lineWidth=2;ctx.stroke();
  write(ctx,'本機最佳',88,1130,22,650,COLORS.muted);
  paragraph(ctx,presentation.bestText,88,1164,650,{size:36,lineHeight:46,maxLines:1,weight:850});
  roundedRect(ctx,804,1130,188,82,18,COLORS.gold);
  write(ctx,'輸入方式',826,1143,18,650,COLORS.muted);
  write(ctx,presentation.modeText,826,1173,26,850);
  paragraph(ctx,presentation.deltaText,88,1216,904,{size:25,lineHeight:34,maxLines:1,weight:650});
  write(ctx,'同一輸入方式比較 · 紀錄保存在本機',88,1255,18,550,COLORS.muted);
  write(ctx,'島遊無界工作室 | PLAYFORMOSA STUDIO',88,1285,22,500,COLORS.muted,904);
  return new Promise((resolve,reject)=>{
    try {
      canvas.toBlob(blob=>{
        if(!blob || blob.type!=='image/png' || blob.size===0){reject(new Error('成績圖片產生失敗，請再試一次。'));return;}
        resolve({blob,filename:scoreImageFilename(presentation,mode)});
      },'image/png');
    } catch(cause) {reject(new Error('成績圖片產生失敗，請再試一次。',{cause}));}
  });
}
