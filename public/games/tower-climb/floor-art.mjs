// Visual-only palette: indices are physical flight bases (0F through 9F).
const bands=['#d6b77c','#91baa8','#92b9cf','#db9d8e','#c9b16f','#b7a0c9','#83b9b9','#d6bb72','#9db57f','#e7ab70'];
export function floorArt(f){if(f<0||f>10)return null;return{band:bands[Math.min(f,9)],label:f===10?'10F 頂樓終點':f===9?'9F  頂樓 ↑':`${f}F`,roof:f===10};}
