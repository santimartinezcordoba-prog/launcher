import {test,expect} from '@playwright/test';
test('señalar portadas frontales no vuelve a renderizar la sala',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.goto('/');await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();
 const room=page.getByTestId('collection-room');await page.getByLabel('Elegir estantería por género').selectOption({label:'Acción'});await expect(room).toHaveAttribute('data-genre','Acción');await expect(room).toHaveAttribute('data-motion','idle');
 const frame=await room.getAttribute('data-frame');
 for(const cover of await page.locator('.collection-cover:visible').all()){await cover.hover();await expect(cover).toHaveCSS('outline-style','solid');}
 await expect(room).toHaveAttribute('data-frame',frame!);
 await expect(page.getByRole('button',{name:'Ver Hades',exact:true}).locator('img')).toHaveAttribute('src','./images/artwork-offline.svg');
});
