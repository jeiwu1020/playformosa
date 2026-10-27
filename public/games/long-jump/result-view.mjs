// Keep the complete verdict accessible, while distinguishing the joke from local-food context.
export function splitResultComment(value){
 const text=String(value??''),match=text.match(/^([\s\S]*?[。！？!?])(\s*)([\s\S]*)$/);
 return match?{primary:match[1],separator:match[2],secondary:match[3]}:{primary:text,separator:'',secondary:''};
}
