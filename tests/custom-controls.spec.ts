import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('controles personalizables se guardan y se aplican a la habitación',async({page})=>{
 await page.route(/^https:/,r=>r.abort());
 await page.addInitScript(()=>{localStorage.setItem('room-character-at-start','false');if(!localStorage.getItem('room-collection-v1'))localStorage.setItem('room-collection-v1',JSON.stringify({starter:'bollo',owned:[],equipped:[]}));localStorage.setItem('room-walk-mode','false');});
 await page.goto('/');await page.getByRole('button',{name:/Entrar en la biblioteca/}).click();await page.getByRole('button',{name:'Ajustes',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Configuración'}), forward=dialog.getByRole('button',{name:'Cambiar Avanzar, tecla 1'});
 await forward.click();await page.keyboard.press('KeyI');await expect(forward).toHaveText('I');
 const back=dialog.getByRole('button',{name:'Cambiar Retroceder, tecla 1'});await back.click();await page.keyboard.press('KeyI');await expect(dialog.getByRole('alert')).toContainText('ya está asignada');await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
 const jump=dialog.getByRole('button',{name:'Cambiar Saltar, tecla 1'});await jump.click();await page.keyboard.press('KeyJ');await expect(jump).toHaveText('J');
 await page.getByRole('button',{name:'Cerrar ajustes'}).click();await page.reload();await page.getByRole('button',{name:/Entrar en la biblioteca/}).click();await page.getByRole('button',{name:'Ajustes',exact:true}).click();await expect(forward).toHaveText('I');await expect(jump).toHaveText('J');await page.getByRole('button',{name:'Cerrar ajustes'}).click();await page.getByRole('button',{name:/Volver a la habitación/}).click();
 const world=page.getByTestId('walk-world');await expect(world).toHaveAttribute('data-ready','true');await expect(page.getByRole('button',{name:'Vista de habitación'})).toHaveCount(0);await expect(page.locator('.walk-hud')).toHaveCount(0);
 const initial=JSON.parse((await world.getAttribute('data-position'))!);await page.keyboard.down('KeyI');await expect.poll(async()=>JSON.parse((await world.getAttribute('data-position'))!).z).toBeLessThan(initial.z-.2);await page.keyboard.up('KeyI');
 const after=JSON.parse((await world.getAttribute('data-position'))!);await page.keyboard.down('KeyW');await page.waitForTimeout(250);await page.keyboard.up('KeyW');expect(Math.abs(JSON.parse((await world.getAttribute('data-position'))!).z-after.z)).toBeLessThan(.08);
 await page.keyboard.press('Escape');const pause=page.getByRole('dialog',{name:'Menú de pausa'});await expect(pause).toBeVisible();await pause.getByRole('button',{name:'Salir',exact:true}).click();await expect(page.getByRole('heading',{name:'Has salido del juego.'})).toBeVisible();await expect(page.getByTestId('walk-world')).toHaveCount(0);
});
