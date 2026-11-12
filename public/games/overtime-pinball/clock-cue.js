// One source for the clock's rules, lamps and prompt. Time excludes docking offset.
export function clockCue(i){const time=Math.max(0,i.elapsed-(i.workOffset||0)),start=.6+i.pulls*1.2,end=start+1.1,center=start+.55;return{time,start,end,center,lit:time>=start&&time<=end,perfect:Math.abs(time-center)<=.2,prepare:time<start};}
