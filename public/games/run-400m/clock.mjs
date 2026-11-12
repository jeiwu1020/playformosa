// Moderate slow frames count in full. Long stalls trigger an explicit pause.
export function frameBudget(elapsed,accumulator=0,fixed=1/120){
 if(!Number.isFinite(elapsed)||elapsed>1)return{steps:0,remainder:0,pause:true};
 const total=Math.max(0,elapsed)+Math.max(0,accumulator),steps=Math.floor((total+1e-12)/fixed);
 return{steps,remainder:Math.max(0,total-steps*fixed),pause:false};
}
