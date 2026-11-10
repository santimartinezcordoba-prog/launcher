export type ControlAction = 'forward'|'back'|'left'|'right'|'jump'|'interact'|'search';
export type Controls = Record<ControlAction,string[]>;
export const controlsKey = 'room-controls-v1';
export const defaultControls:Controls = {forward:['KeyW','ArrowUp'],back:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],jump:['Space'],interact:['KeyE'],search:['KeyK']};
export const controlLabels:Record<ControlAction,string> = {forward:'Avanzar',back:'Retroceder',left:'Moverse a la izquierda',right:'Moverse a la derecha',jump:'Saltar',interact:'Interactuar',search:'Buscar en la biblioteca'};
export const controlActions = Object.keys(defaultControls) as ControlAction[];
export function validKey(code:string){return /^(Key[A-Z]|Digit[0-9]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Space|Numpad[0-9])$/.test(code);}
export function formatKey(code:string){const names:Record<string,string>={Space:'Espacio',ArrowUp:'Flecha arriba',ArrowDown:'Flecha abajo',ArrowLeft:'Flecha izquierda',ArrowRight:'Flecha derecha'};return names[code]??code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'Teclado numérico ');}
export function loadControls():Controls {try {const saved=JSON.parse(localStorage.getItem(controlsKey)??'null');if(!saved)return structuredClone(defaultControls);const used=new Set<string>();for(const action of controlActions){if(!Array.isArray(saved[action])||saved[action].length!==defaultControls[action].length)return structuredClone(defaultControls);for(const key of saved[action]){if(typeof key!=='string'||!validKey(key)||(action!=='search'&&used.has(key)))return structuredClone(defaultControls);if(action!=='search')used.add(key);}}return saved as Controls;}catch{return structuredClone(defaultControls);}}
