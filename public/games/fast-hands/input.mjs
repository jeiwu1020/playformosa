import {CONFIG} from './physics.mjs';
/** Pure input gates. The caller owns held-key updates and CSS-to-logical canvas conversion. */
export function acceptPointer(mode,e){return !!e&&['mouse','touch'].includes(mode)&&e.pointerType===mode&&e.button===0&&e.isPrimary===true;}
/** Logical 720×470 canvas coordinates, padded to include head and bill. */
export function hitDuck(x,y,distance){return Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(distance)&&distance>=0&&distance<=CONFIG.height&&Math.abs(x-365)<=55&&Math.abs(y-(80+distance*150))<=45;}
/** Does not mutate held. Add the code after acceptance; delete on keyup. */
export function acceptKey(code,repeat,held){return ['Enter','Space'].includes(code)&&!repeat&&!held?.has?.(code);}
