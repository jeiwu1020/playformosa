// Local QA only; never deploy the generated fixture folders.
import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..'),dist=path.join(root,'dist');
execFileSync(process.execPath,[path.join(import.meta.dirname,'prepare-recovery-browser.mjs'),'3d91092d54070913654202a985a375ffd5532db9'],{cwd:root,stdio:'inherit'});
let html=await fs.readFile(path.join(dist,'qa-recovery.html'),'utf8');
html=html.replace('<button id="inspect">Inspect</button>','<button id="inspect">Inspect</button><select id="offset" aria-label="Diagnostic CSS offset"><option value="0">offset0</option><option value="30">offset30</option><option value="60">offset60</option></select>');
html=html.replace("document.querySelector('#browser').onclick","document.querySelector('#offset').onchange=e=>{frame.contentDocument.documentElement.style.setProperty('--visible-top',e.target.value+'px');inspect('controlled CSS offset '+e.target.value);};document.querySelector('#browser').onclick");
html=html.replace("+'?mode='+mode;","+'?mode='+mode+(new URLSearchParams(location.search).has('clipboard-denied')?'&clipboard-denied=1':'');");
await fs.writeFile(path.join(dist,'qa-coordinate-probe.html'),html);
const file=path.join(dist,'qa-native-after/index.html');let game=await fs.readFile(file,'utf8');game=game.replace('<script type="module" src="layout.mjs">',`<script>if(new URLSearchParams(location.search).has('clipboard-denied'))Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('QA clipboard denied'))}});</script><script type="module" src="layout.mjs">`);await fs.writeFile(file,game);
