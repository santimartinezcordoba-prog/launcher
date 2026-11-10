import {applyBedroomWallPanels} from './wall-panels';
import {currentWallpaper} from './wallpaper';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

/** Lighting stays inside the room; the opaque roof must not block the key light. */
export class RoomAppearance {
  private fixtures=new THREE.Group();
  private warmAreas:THREE.RectAreaLight[]=[];
  private neutralAreas:THREE.RectAreaLight[]=[];
  private lamp=new THREE.PointLight('#ffbb73',8,4,2);
  private monitor=new THREE.PointLight('#9b8bff',1.4,2.4,2);
  private maps:THREE.Texture[]=[];
  private disposed=false;
  private screens=new Set<THREE.MeshStandardMaterial>();
  private wallpaperTexture?:THREE.Texture;
  private wallpaperGeneration=0;
  wallpaperSource='';
  private wallpaperChanged=()=>{void this.updateWallpaper();};
  private async updateWallpaper(){
    if(!this.screens.size||this.disposed)return;
    const generation=++this.wallpaperGeneration,source=currentWallpaper();
    try{const texture=await new THREE.TextureLoader().loadAsync(source);if(this.disposed||generation!==this.wallpaperGeneration){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
      const old=this.wallpaperTexture;this.wallpaperTexture=texture;this.maps.push(texture);
      for(const material of this.screens){material.map=texture;material.emissiveMap=texture;material.color.set('#ffffff');material.emissive.set('#ffffff');material.emissiveIntensity=.7;material.needsUpdate=true;}
      old?.dispose();if(old)this.maps=this.maps.filter(t=>t!==old);this.wallpaperSource=source;this.onChange();
    }catch{}
  }
  private loaded:Promise<void>;
  private wood?:THREE.Texture;
  private linen?:THREE.Texture;
  private fabric?:THREE.Texture;

  constructor(private scene:THREE.Scene,private renderer:THREE.WebGLRenderer,private fill:THREE.HemisphereLight,private key:THREE.DirectionalLight,private onChange:()=>void=()=>{}) {
    window.addEventListener('room-wallpaper',this.wallpaperChanged);
    RectAreaLightUniformsLib.init();
    this.fixtures.name='Luz interior y luminarias';this.scene.add(this.fixtures);
    this.key.position.set(-3.8,2.22,-1.25);this.key.target.position.set(.6,.35,-2.8);
    this.key.shadow.mapSize.set(2048,2048);this.key.shadow.normalBias=.012;this.key.shadow.bias=-.00015;this.key.shadow.radius=2;
    Object.assign(this.key.shadow.camera,{left:-5,right:5,top:4.5,bottom:-4.5,near:.08,far:15});
    this.key.shadow.camera.updateProjectionMatrix();
    this.lamp.position.set(-3.0,1.03,-2.16);this.monitor.position.set(2.25,1.22,-1.65);this.fixtures.add(this.lamp,this.monitor);
    const area=(position:[number,number,number],target:[number,number,number],width:number,height:number,intensity:number,color:string,warm=true)=>{
      const light=new THREE.RectAreaLight(color,intensity,width,height);light.position.set(...position);light.lookAt(...target);this.fixtures.add(light);light.userData.baseIntensity=intensity;if(warm)this.warmAreas.push(light);else this.neutralAreas.push(light);
    };
    area([-3.20,2.91,0],[-3.3,2.55,0],6.8,.035,5,'#ffd29b');
    area([3.20,2.91,0],[3.3,2.55,0],6.8,.035,5,'#ffd29b');
    area([0,2.91,-3.47],[0,2.55,-3.6],6.2,.035,5,'#ffd29b');
    area([.2,2.21,-2.96],[.2,1.3,-3.18],1.8,.045,6,'#ffcc8e');
    area([.2,.99,-2.96],[.2,.45,-3.18],1.8,.035,4,'#ffcc8e');
    area([0,2.3,3.45],[0,1.0,-2],3.2,1.8,2.2,'#e6e9ff',false);
    const diffuser=new THREE.Mesh(new THREE.CircleGeometry(.235,48),new THREE.MeshBasicMaterial({color:'#ffe2b1',toneMapped:false}));
    diffuser.rotation.x=Math.PI/2;diffuser.position.set(0,2.858,.1);this.fixtures.add(diffuser);
    // A cool window fill separates the warm practical lights from the daylight.
    area([-3.12,1.65,-1.25],[0,1.0,-1.6],1.7,1.3,2,'#afcbff',false);
    const loader=new THREE.TextureLoader();
    const load=async(path:string,color:boolean)=>{
      try {
        const texture=await loader.loadAsync(path);
        if(this.disposed){texture.dispose();return undefined;}
        texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
        texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
        if(color)texture.colorSpace=THREE.SRGBColorSpace;
        this.maps.push(texture);return texture;
      }catch{return undefined;} // Geometry and flat-color fallback remain usable offline.
    };
    this.loaded=Promise.all([
      load('./textures/wood.jpg',true).then(t=>{this.wood=t;if(t)t.repeat.set(4,4);}),
      load('./textures/linen.jpg',true).then(t=>{this.linen=t;if(t)t.repeat.set(8,8);}),
      load('./textures/fabric-bump.jpg',false).then(t=>{this.fabric=t;})
    ]).then(()=>{});
  }

  async materials(root:THREE.Object3D) {
    await this.loaded;if(this.disposed)return;
    const seen=new Set<THREE.Material>();
    root.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      for(const material of Array.isArray(o.material)?o.material:[o.material]){
        if(!(material instanceof THREE.MeshStandardMaterial)||seen.has(material))continue;
        seen.add(material);const name=material.name.toLowerCase();if(name.startsWith('screen'))this.screens.add(material);
        if(name.includes('roble')||name.includes('nogal')){
          const variation=name.includes('parquet')?.88+(material.color.r-.27)*2:1;
          if(this.wood){material.map=this.wood;material.bumpMap=this.wood;material.bumpScale=.0007;material.color.setRGB(2.2*variation,1.7*variation,1.25*variation);}
          material.roughness=.54;material.envMapIntensity=.3;
        }else if(name.includes('lino')||name.includes('tejido')){
          if(this.linen)material.map=this.linen;
          if(this.fabric){material.bumpMap=this.fabric;material.bumpScale=.003;}
          material.roughness=.94;material.envMapIntensity=.15;
          if(name.includes('verde oliva'))material.name='Lino verde oliva';
        }else if(name.includes('platino')||name.includes('laton')){
          material.roughness=name.includes('platino')?.27:.38;material.envMapIntensity=1.15;
        }else if(name.includes('pared')||name.includes('salvia')){
          material.roughness=.96;material.envMapIntensity=.1;
        }
        material.needsUpdate=true;
      }
    });
    try{const wall=await new THREE.TextureLoader().loadAsync('./textures/plaster-wall.webp');if(this.disposed){wall.dispose();return;}wall.colorSpace=THREE.SRGBColorSpace;wall.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.maps.push(wall);applyBedroomWallPanels(root,wall);}catch{}
    root.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const name=o.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(name.includes('vidrio')){
        o.castShadow=false;const glass=(o.material as THREE.MeshStandardMaterial).clone();
        glass.transparent=true;glass.opacity=.16;glass.depthWrite=false;glass.roughness=.12;glass.envMapIntensity=.8;o.material=glass;
      }
      if(name.includes('pantalla_lino')||name.includes('plafon')){
        const shade=(o.material as THREE.MeshStandardMaterial).clone();shade.emissive.set('#ffca8a');shade.emissiveIntensity=name.includes('plafon')?.55:.4;o.material=shade;
      }
    });
    await this.updateWallpaper();
  }

  mood(mode:string){
    const night=mode==='night',day=mode==='day';
    this.fill.intensity=night?.045:day?.32:.12;
    this.fill.color.set('#b6c8ee');this.fill.groundColor.set('#4a3326');
    this.key.intensity=night?.85:day?3.6:2.8;
    this.key.color.set(night?'#9ab8ff':day?'#fff2dd':'#ffce94');
    this.lamp.intensity=night?12:day?2:8;this.monitor.intensity=night?2:day?.5:1.4;
    this.warmAreas.forEach((light,i)=>light.intensity=(i===3?1.2:i===4?.8:1)*(night?8:day?1.0:5));
    this.neutralAreas.forEach(light=>light.intensity=light.userData.baseIntensity*(night?.35:day?1.3:1));
    this.scene.environmentIntensity=night?.12:day?.25:.18;
    this.renderer.toneMappingExposure=night?.95:1.05;
  }

  dispose(){this.disposed=true;window.removeEventListener('room-wallpaper',this.wallpaperChanged);this.fixtures.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.maps.forEach(t=>t.dispose());this.fixtures.removeFromParent();}
}
