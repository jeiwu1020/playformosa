// Resolve the current gesture, not a device label. A touch laptop or a tablet
// with a mouse can change between rounds without sharing one record category.
export function resolveInputMode(event, preference='auto') {
 if(!event||event.isPrimary!==true||event.button!==0)return null;
 const mode=event.pointerType;
 if(mode!=='mouse'&&mode!=='touch')return null;
 if(preference!=='auto'&&preference!==mode)return null;
 return mode;
}
