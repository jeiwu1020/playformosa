// Display-only mapping of the existing keySide() handler. Never binds input.
export function keyboardHint(text,doc=globalThis.document){
 if(!doc?.body?.classList.contains('desktop-layout'))return text;
 return text.replace(/\bL\s*[／/]\s*R\b/g,'←／A 或 →／D')
  .replace(/\bL\b/g,'L（←／A）').replace(/\bR\b/g,'R（→／D）');
}
