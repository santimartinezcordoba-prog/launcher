import {useState} from 'react';
import {controlActions,controlLabels,defaultControls,formatKey,validKey,type ControlAction,type Controls} from './controls';
import './control-settings.css';

export function ControlSettings({controls,onChange}:{controls:Controls;onChange:(controls:Controls)=>void}){
 const [capture,setCapture]=useState<{action:ControlAction;index:number}|null>(null);
 const [error,setError]=useState('');
 function bind(event:React.KeyboardEvent,action:ControlAction,index:number){
  if(!capture||capture.action!==action||capture.index!==index)return;
  event.preventDefault();event.stopPropagation();
  if(event.code==='Escape'){setCapture(null);setError('');return;}
  if(event.ctrlKey||event.altKey||event.metaKey||!validKey(event.code)){setError('Elige una letra, un número, una flecha o Espacio.');return;}
  if(action!=='search'&&controlActions.filter(a=>a!=='search').some(a=>controls[a].some((key,i)=>key===event.code&&(a!==action||i!==index)))){setError('Esa tecla ya está asignada a otra acción.');return;}
  const next={...controls,[action]:controls[action].map((key,i)=>i===index?event.code:key)};
  onChange(next);setCapture(null);setError('');
 }
 return <section className="app-settings-section control-settings"><h3>Controles</h3><p>Pulsa una tecla para cambiarla. Los cambios se guardan automáticamente.</p><div className="control-list">{controlActions.map(action=><div className="control-row" key={action}><span>{controlLabels[action]}</span><div>{controls[action].map((key,index)=><button key={index} type="button" className="control-key" aria-label={`Cambiar ${controlLabels[action]}, tecla ${index+1}`} onClick={()=>{setCapture({action,index});setError('');}} onKeyDown={event=>bind(event,action,index)}>{capture?.action===action&&capture.index===index?'Pulsa una tecla…':`${action==='search'?'Ctrl / ⌘ + ':''}${formatKey(key)}`}</button>)}</div></div>)}</div>{error&&<p role="alert" className="control-error">{error}</p>}<p>El ratón controla la cámara y Escape abre el menú o cancela el cambio de tecla.</p><button className="quiet-button" type="button" onClick={()=>{onChange(structuredClone(defaultControls));setCapture(null);setError('');}}>Restaurar controles</button></section>;
}
