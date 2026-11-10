import {legacySettings} from './computer-helpers';
import { test, expect } from '@playwright/test';
import { chooseShelf } from './editor-helpers';

test('los clics sobre las mallas abren ordenador y trofeos, y la cámara vuelve a la entrada',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();
  const room=page.getByTestId('room-3d');
  await expect(room).toHaveAttribute('data-rendered','true');
  const canvas=room.locator('canvas');
  const bounds=(await canvas.boundingBox())!;
  // Clic directamente al canvas: ejercita el raycaster, sin utilizar el botón HTML.
  const computer=(await page.locator('[data-anchor="computer"]').boundingBox())!;
  await canvas.dispatchEvent('click',{clientX:computer.x+computer.width/2,clientY:computer.y+computer.height/2});
  await expect(page.getByRole('dialog',{name:'BOLL OS'})).toBeVisible();
  await page.keyboard.press('Escape');
  await legacySettings(page);
  await page.getByRole('button',{name:'Mis platinos',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Estantería de platinos'})).toBeVisible();
  await page.keyboard.press('Escape');
  const door=(await page.locator('[data-anchor="shelf"]').boundingBox())!;
  await canvas.dispatchEvent('click',{clientX:door.x+door.width/2,clientY:door.y+door.height/2});
  await expect(page.getByRole('region',{name:'Sala de colección'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Entrar en la sala de colección'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('figura importada se compra, carga como objeto 3D y se retira sin perderla',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('room-collection-v1',JSON.stringify({claimed:['shelf','discover','mood'],owned:[],equipped:[],seen:[0,1,2],shelf:true,mood:true})));
  await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-state','ready');
  await legacySettings(page);
  const item=page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Figura del mago'})});
  await item.getByRole('button',{name:'Comprar · 250 puntos'}).click();
  await expect(page.getByTestId('points')).toHaveText('150');
  await page.getByRole('button',{name:'Inventario',exact:true}).click();
  await page.getByRole('button',{name:'Colocar en habitación'}).click();
  await page.getByRole('navigation',{name:'Superficies de colocación'}).getByRole('button',{name:'Baldas de colección',exact:true}).click();
  await chooseShelf(page);
  await page.getByRole('button',{name:'Guardar posición'}).click();
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-placed','figure');
  await page.getByRole('button',{name:'Inventario',exact:true}).click();
  await page.getByRole('button',{name:'Guardar en inventario'}).click();
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-placed','');
  await expect(page.getByTestId('points')).toHaveText('150');
});

test('si falla el GLB, la biblioteca sigue disponible y permite reintentar',async({page})=>{
  await page.route('**/models/room.glb',route=>route.abort());
  await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo abrir la habitación 3D');
  await page.getByRole('button',{name:'Abrir biblioteca',exact:true}).click();
  await expect(page.locator('.game-card')).toHaveCount(60);
  await page.keyboard.press('Escape');
  await page.unroute('**/models/room.glb');
  await page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await expect(page.getByTestId('room-3d')).toHaveAttribute('data-rendered','true');
  await expect(page.getByRole('button',{name:'Entrar en la sala de colección'})).toBeVisible();
});
