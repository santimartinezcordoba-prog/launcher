import { test, expect } from '@playwright/test';

test('los clics sobre las mallas abren ordenador y trofeos, y la cámara vuelve a la entrada',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  const room=page.getByTestId('room-3d');
  await expect(room).toHaveAttribute('data-rendered','true');
  const canvas=room.locator('canvas');
  const bounds=(await canvas.boundingBox())!;
  // Clic directamente al canvas: ejercita el raycaster, sin utilizar el botón HTML.
  const computer=(await page.locator('[data-anchor="computer"]').boundingBox())!;
  await canvas.dispatchEvent('click',{clientX:computer.x+computer.width/2,clientY:computer.y+computer.height/2});
  await expect(page.getByRole('dialog',{name:'Ajustes del ordenador'})).toBeVisible();
  await page.keyboard.press('Escape');
  // Find the cup row through the same raycasting that drives the visible highlight.
  const trophyTag=(await page.locator('[data-anchor="trophies"]').boundingBox())!;
  const trophyX=trophyTag.x+trophyTag.width/2;let trophyY=0;
  for(const offset of [50,60,70,80,90]){
    const y=trophyTag.y+trophyTag.height/2+offset;
    await canvas.dispatchEvent('pointermove',{clientX:trophyX,clientY:y});
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
    if(await room.getAttribute('data-highlight')==='trophies'){trophyY=y;break;}
  }
  expect(trophyY).toBeGreaterThan(0);
  await canvas.dispatchEvent('click',{clientX:trophyX,clientY:trophyY});
  await expect(page.getByRole('dialog',{name:'Estantería de platinos'})).toBeVisible();
  await page.keyboard.press('Escape');
  const before=await canvas.screenshot();
  await page.getByRole('button',{name:'Acercarse a la estantería'}).press('Enter');
  await expect(page.locator('.three-game-hit').first()).toBeVisible();
  await expect(room).toHaveAttribute('data-motion','idle');
  expect(await canvas.screenshot()).not.toEqual(before);
  const game=(await page.locator('.three-game-hit').first().boundingBox())!;
  await canvas.dispatchEvent('click',{clientX:game.x+game.width/2,clientY:game.y+game.height/2});
  await expect(page.getByRole('dialog',{name:'Detalles de Hollow Knight'})).toBeVisible();
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Acercarse a la estantería'})).toBeVisible();
  await expect(room).toHaveAttribute('data-motion','idle');
  expect(errors).toEqual([]);
});

test('figura importada se compra, carga como objeto 3D y se retira sin perderla',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('room-collection-v1',JSON.stringify({claimed:['shelf','discover','mood'],owned:[],equipped:[],seen:[0,1,2],shelf:true,mood:true})));
  await page.goto('/');
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-state','ready');
  await page.getByRole('button',{name:'Abrir ajustes desde el ordenador'}).press('Enter');
  const item=page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Figura del mago'})});
  await item.getByRole('button',{name:'Comprar · 250 puntos'}).click();
  await expect(page.getByTestId('points')).toHaveText('150');
  await page.getByRole('button',{name:'Inventario',exact:true}).click();
  await page.getByRole('button',{name:'Colocar en habitación'}).click();
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-placed','figure');
  await page.getByRole('button',{name:'Guardar en inventario'}).click();
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-placed','');
  await expect(page.getByTestId('points')).toHaveText('150');
});

test('si falla el GLB, la biblioteca sigue disponible y permite reintentar',async({page})=>{
  await page.route('**/models/room.glb',route=>route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('No se pudo abrir la habitación 3D');
  await page.getByRole('button',{name:'Abrir biblioteca',exact:true}).click();
  await expect(page.locator('.game-card')).toHaveCount(60);
  await page.keyboard.press('Escape');
  await page.unroute('**/models/room.glb');
  await page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-rendered','true');
  await expect(page.getByRole('button',{name:'Acercarse a la estantería'})).toBeVisible();
});


test('el contorno de juegos cambia sin volver a renderizar la habitación',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');const room=page.getByTestId('room-3d');
  await expect(room).toHaveAttribute('data-rendered','true');
  await page.getByRole('button',{name:'Acercarse a la estantería'}).press('Enter');
  await expect(page.locator('.three-game-hit').first()).toBeVisible();
  await expect(room).toHaveAttribute('data-motion','idle');
  const result=await page.evaluate(async()=>{
    const host=document.querySelector('[data-testid="room-3d"]')!;
    const canvas=host.querySelector('canvas')!;
    const outline=host.querySelector('polygon')!;
    const buttons=[...document.querySelectorAll('[data-slot]')].slice(0,12);
    const frames=host.getAttribute('data-frame');const shapes=new Set<string>();let maxHandlerMs=0;
    for(const button of buttons){
      const b=button.getBoundingClientRect();
      // A burst of events is coalesced; the latest position wins within the next animation frame.
      for(let n=0;n<8;n++)canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:b.x+b.width/2,clientY:b.y+b.height/2}));
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      shapes.add(outline.getAttribute('points')??'');maxHandlerMs=Math.max(maxHandlerMs,Number(host.getAttribute('data-hover-ms')));
    }
    const after=host.getAttribute('data-frame');
    canvas.dispatchEvent(new PointerEvent('pointerleave'));
    return {frames,after,shapes:shapes.size,maxHandlerMs,hidden:(host.querySelector('svg') as SVGElement).style.display};
  });
  expect(result.shapes).toBe(12);expect(result.after).toBe(result.frames);
  expect(result.maxHandlerMs).toBeLessThan(16);expect(result.hidden).toBe('none');
  expect(errors).toEqual([]);
});
