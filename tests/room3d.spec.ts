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
  await canvas.dispatchEvent('click',{clientX:bounds.x+bounds.width*.505,clientY:bounds.y+bounds.height*.38});
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
