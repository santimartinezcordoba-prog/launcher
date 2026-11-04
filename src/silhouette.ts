import * as THREE from 'three';

/** One unlit mask per settled camera; moving the pointer only shows the cached PNG. */
export function silhouette(renderer:THREE.WebGLRenderer,camera:THREE.Camera,meshes:THREE.Mesh[],width:number,height:number){
 const scale=Math.min(1,900/width),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
 const target=new THREE.WebGLRenderTarget(w,h,{type:THREE.UnsignedByteType});
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
 for(const source of meshes){const copy=new THREE.Mesh(source.geometry,material);copy.matrixAutoUpdate=false;copy.matrix.copy(source.matrixWorld);scene.add(copy);}
 const oldTarget=renderer.getRenderTarget(),color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),shadows=renderer.shadowMap.enabled,autoClear=renderer.autoClear;
 const pixels=new Uint8Array(w*h*4);
 try{renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);}
 finally{renderer.setRenderTarget(oldTarget);renderer.setClearColor(color,alpha);renderer.shadowMap.enabled=shadows;renderer.autoClear=autoClear;target.dispose();material.dispose();}
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!,result=ctx.createImageData(w,h);
 // Dilation outside the mask preserves the open gaps between chair and table legs.
 const offsets=[-w-1,-w,-w+1,-1,1,w-1,w,w+1];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=(y*w+x)*4;if(pixels[i+3]>127)continue;
  let edge=false;for(const offset of offsets)if(pixels[i+offset*4+3]>127){edge=true;break;}if(!edge)continue;
  const j=((h-1-y)*w+x)*4;result.data[j]=255;result.data[j+1]=225;result.data[j+2]=161;result.data[j+3]=255;
 }
 ctx.putImageData(result,0,0);return canvas.toDataURL('image/png');
}
