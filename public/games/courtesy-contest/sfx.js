/** Original synthesized game sound effects by dot, released under CC0 1.0.
 * No external recordings, samples, music, or third-party audio are included.
 * https://creativecommons.org/publicdomain/zero/1.0/
 */
let sharedContext=null;
export function getAudioContext(){
 try{if(!sharedContext||sharedContext.state==='closed')sharedContext=new (window.AudioContext||window.webkitAudioContext)();return sharedContext;}catch{return null;}
}
export class ComicSounds {
 constructor(){this.enabled=true;this.context=null;}
 unlock(){if(!this.enabled)return;this.context=getAudioContext();try{if(this.context&&this.context.state!=='running')this.context.resume()?.catch(()=>{});}catch{}}
 note(frequency,duration=.1,offset=0,type='triangle',volume=.045,endFrequency){if(!this.enabled)return;this.unlock();const c=this.context;if(!c)return;const start=c.currentTime+offset,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,start);if(endFrequency)o.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);g.gain.setValueAtTime(volume,start);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g);g.connect(c.destination);o.start(start);o.stop(start+duration);}
 noise(duration=.16,volume=.07){if(!this.enabled)return;this.unlock();const c=this.context;if(!c)return;const b=c.createBuffer(1,c.sampleRate*duration,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=380;g.gain.value=volume;s.connect(f);f.connect(g);g.connect(c.destination);s.start();}
 play(name){if(!this.enabled)return;switch(name){case'start':this.note(440,.1);this.note(660,.13,.1);break;case'offer':this.note(330,.14,0,'triangle',.05,620);break;case'reply':this.note(560,.13,0,'triangle',.04,370);break;case'warning':this.note(740,.1,0,'square',.018);this.note(980,.13,.14,'square',.018);break;case'repel':this.note(220,.3,0,'sine',.07,900);this.note(790,.13,.2,'triangle',.03,290);break;case'fall':this.noise(.23,.12);this.note(180,.32,0,'sine',.08,55);break;case'depart':this.noise(.35,.025);this.note(240,.4,0,'triangle',.03,95);break;case'win':this.note(523,.17);this.note(659,.17,.13);this.note(784,.35,.26);break;case'click':this.note(620,.06);break;}}
}
