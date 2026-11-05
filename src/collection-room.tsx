import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {games,type Game} from './games';
import {GameArt} from './game-art';
import './collection-room.css';
export const genreGroups=[...new Set(games.map(g=>g.genre))].sort((a,b)=>a.localeCompare(b,'es')).map(genre=>({genre,games:games.filter(g=>g.genre===genre)}));
const capacity=4;
// Project a rectangular DOM cover onto its actual 3D face, including the side walls.
function quad(points:THREE.Vector3[],width:number,height:number){
 const input=[[0,0],[180,0],[180,270],[0,270]],rows:number[][]=[];
 points.forEach((p,i)=>{const x=(p.x+1)*width/2,y=(1-p.y)*height/2,[u,v]=input[i];rows.push([u,v,1,0,0,0,-u*x,-v*x,x],[0,0,0,u,v,1,-u*y,-v*y,y]);});
 for(let k=0;k<8;k++){let best=k;for(let j=k+1;j<8;j++)if(Math.abs(rows[j][k])>Math.abs(rows[best][k]))best=j;[rows[k],rows[best]]=[rows[best],rows[k]];const d=rows[k][k];if(Math.abs(d)<1e-8)return '';for(let j=k;j<9;j++)rows[k][j]/=d;for(let i=0;i<8;i++)if(i!==k){const n=rows[i][k];for(let j=k;j<9;j++)rows[i][j]-=n*rows[k][j];}}
 const [a,b,c,d,e,f,g,h]=rows.map(r=>r[8]);return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
}
export function CollectionRoom({onBack,onLibrary,onGame,blocked,reduced}:{onBack:()=>void;onLibrary:(genre?:string)=>void;onGame:(g:Game)=>void;blocked:boolean;reduced:boolean}){
 const host=useRef<HTMLDivElement>(null),[focus,setFocus]=useState<number|null>(null),[error,setError]=useState(false);const focusRef=useRef(focus);focusRef.current=focus;const [preloaded,setPreloaded]=useState<Set<number>>(()=>new Set()),preloadedRef=useRef(new Set<number>());
 useEffect(()=>{
  const container=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor('#171e1c');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;container.prepend(renderer.domElement);
  let dirty=true;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,70);scene.add(new THREE.HemisphereLight('#eee3cd','#647568',2),new THREE.AmbientLight('#eee7db',.8));const sun=new THREE.DirectionalLight('#ffe0b1',3);sun.position.set(-3,3,4);sun.castShadow=true;sun.shadow.bias=-.001;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6});scene.add(sun);
  const timber=new THREE.TextureLoader().load('./textures/wood.jpg',()=>{dirty=true;renderer.shadowMap.needsUpdate=true;});timber.colorSpace=THREE.SRGBColorSpace;timber.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const wood=new THREE.MeshStandardMaterial({color:'#bea78f',roughness:.75,map:timber}),edge=new THREE.MeshStandardMaterial({color:'#cdb291',roughness:.6,map:timber}),wall=new THREE.MeshStandardMaterial({color:'#35493f',roughness:.95}),plastic=new THREE.MeshStandardMaterial({color:'#152326',roughness:.5});
  function box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  box(scene,0,-.1,0,10.7,.2,11,wood);box(scene,0,1.8,-5,10.7,3.6,.15,wall);box(scene,-5.3,1.8,0,.15,3.6,10,wall);box(scene,5.3,1.8,0,.15,3.6,10,wall);box(scene,0,3.65,0,10.7,.1,10,wall);
  for(let x=-5.1;x<5.2;x+=.4)box(scene,x,.004,0,.009,.005,10,edge);
  const racks=genreGroups.map((group,i)=>{
   const root=new THREE.Group();if(i<4)root.position.set(-3.45+i*2.3,0,-4.75);else if(i<8){root.position.set(-5.05,0,-3.1+(i-4)*2.5);root.rotation.y=Math.PI/2;}else{root.position.set(5.05,0,-3.1+(i-8)*2.5);root.rotation.y=-Math.PI/2;}scene.add(root);
   box(root,0,1.2,-.02,2.04,2.45,.1,wood);for(const x of [-1.04,1.04])box(root,x,1.2,.16,.1,2.55,.5,edge);for(const y of [.1,1.22,2.48])box(root,0,y,.17,2.16,.08,.56,edge);
   const covers=group.games.slice(0,capacity).map((game,j)=>{const x=j%2===0?-.49:.49,y=j<2?1.74:.62;const m=box(root,x,y,.26,.64,.96,.1,plastic);return {game,mesh:m,x,y};});return {root,covers};
  });
  const home=new THREE.Vector3(0,2.2,2.8),homeLook=new THREE.Vector3(0,1.35,-2),from=new THREE.Vector3(),fromLook=homeLook.clone(),look=homeLook.clone();camera.position.copy(home);let current:number|null|undefined=undefined,start=0,frame=0,renderCount=0,disposed=false;
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const project=(v:THREE.Vector3)=>v.clone().project(camera);
  function tick(time:number){if(disposed)return;const selected=focusRef.current;
   if(current!==selected){current=selected;renderer.shadowMap.needsUpdate=true;from.copy(camera.position);fromLook.copy(look);start=time;dirty=true;}
   let target=home,targetLook=homeLook;
   if(selected!==null){const rack=racks[selected];targetLook=rack.root.localToWorld(new THREE.Vector3(0,1.32,.25));target=rack.root.localToWorld(new THREE.Vector3(0,1.55,3.4));}
   const t=reduced||matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(time-start)/650),factor=1-(1-t)**3;
   if(dirty||t<1){camera.position.lerpVectors(from,target,factor);look.lerpVectors(fromLook,targetLook,factor);camera.lookAt(look);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
    const w=container.clientWidth,h=container.clientHeight,labels:DOMRect[]=[];let newPreloads=false;
    racks.forEach((rack,i)=>{
     const label=container.querySelector<HTMLElement>(`[data-genre-index="${i}"]`),p=project(rack.root.localToWorld(new THREE.Vector3(0,2.7,.25)));
     if(label){label.style.left=`${(p.x+1)*w/2}px`;label.style.top=`${(1-p.y)*h/2}px`;label.style.visibility=selected===null&&p.z>0&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1?'visible':'hidden';if(label.style.visibility==='visible'){const bounds=label.getBoundingClientRect();if(labels.some(b=>bounds.left<b.right+6&&bounds.right>b.left-6&&bounds.top<b.bottom+6&&bounds.bottom>b.top-6))label.style.visibility='hidden';else labels.push(bounds);}}
     rack.covers.forEach(({mesh,game,x,y})=>{
      const points=[[-.3,.45],[.3,.45],[.3,-.45],[-.3,-.45]].map(([dx,dy])=>project(rack.root.localToWorld(new THREE.Vector3(x+dx,y+dy,.322))));
      const distance=(a:number,b:number)=>Math.hypot((points[a].x-points[b].x)*w/2,(points[a].y-points[b].y)*h/2),coverWidth=Math.min(distance(0,1),distance(3,2)),coverHeight=Math.min(distance(0,3),distance(1,2));
      const visible=points.every(p=>p.z>0&&p.z<1)&&coverWidth>=65&&coverHeight>=98&&(selected===null||selected===i);
      if(visible&&points.some(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1)&&!preloadedRef.current.has(game.id)){preloadedRef.current.add(game.id);newPreloads=true;}
      mesh.visible=visible;const button=container.querySelector<HTMLElement>(`[data-collection-game="${game.id}"]`);if(button){button.style.visibility=visible?'visible':'hidden';button.style.transform=visible?quad(points,w,h):'';}
     });
    });
    // Visibility uses the settled projection; draw physical cases once with those visibility flags.
    if(t===1)renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);if(newPreloads)setPreloaded(new Set(preloadedRef.current));container.dataset.frame=String(++renderCount);container.dataset.genre=selected===null?'all':genreGroups[selected].genre;container.dataset.motion=t<1?'moving':'idle';container.dataset.rendered='true';dirty=t<1;
   }frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();const geometries=new Set<THREE.BufferGeometry>();scene.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());[wood,edge,wall,plastic].forEach(m=>m.dispose());timber.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[reduced]);
 return <section className="collection-room" aria-label="Sala de colección" inert={blocked} aria-hidden={blocked}><div ref={host} className="collection-world" data-testid="collection-room">{genreGroups.map((group,i)=><div key={group.genre}><button className="genre-plaque" data-genre-index={i} onClick={()=>setFocus(i)}>{group.genre}<small>{group.games.length} juegos · Acercarse</small></button>{group.games.slice(0,capacity).map(g=><button key={g.id} className="collection-cover" data-collection-game={g.id} aria-label={`Ver ${g.title}`} onClick={()=>onGame(g)}><GameArt game={g} preload={preloaded.has(g.id)}/><span className="collection-case-title">{g.title}</span></button>)}</div>)}</div><header className="collection-toolbar"><button className="quiet-button" onClick={onBack}>← Volver a mi habitación</button><label>Estantería<select aria-label="Elegir estantería por género" value={focus??''} onChange={e=>setFocus(e.target.value===''?null:Number(e.target.value))}><option value="">Vista de la sala completa</option>{genreGroups.map((g,i)=><option key={g.genre} value={i}>{g.genre}</option>)}</select></label><button className="quiet-button" onClick={()=>onLibrary()}>Biblioteca completa</button></header><footer className="collection-footer">{focus!==null?<><strong>{genreGroups[focus].genre}</strong><span>Hasta {Math.min(capacity,genreGroups[focus].games.length)} portadas a la vista · {genreGroups[focus].games.length} juegos en total</span><button className="primary-button" onClick={()=>onLibrary(genreGroups[focus].genre)}>Ver biblioteca de {genreGroups[focus].genre} →</button><button className="quiet-button" onClick={()=>setFocus(null)}>Ver toda la sala</button></>:<p>Elige una estantería para ver sus portadas con claridad. Los juegos que no caben siguen en la biblioteca de su género.</p>}</footer>{error&&<div className="collection-error"><p>No se pudo abrir la sala 3D.</p><button className="primary-button" onClick={()=>onLibrary()}>Ver biblioteca completa</button></div>}</section>;
}
