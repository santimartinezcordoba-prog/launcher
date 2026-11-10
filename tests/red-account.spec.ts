import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('CD PROJEKT RED aparece en la lista con acceso discreto al portal oficial',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.goto('/');await page.getByRole('button',{name:/Entrar en la biblioteca/}).click();await page.getByRole('button',{name:'Ajustes',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Configuración'});const link=dialog.getByRole('link',{name:'Abrir portal oficial de CD PROJEKT RED'});await expect(link).toHaveAttribute('href','https://accounts.cdprojektred.com/');await expect(link).toHaveAttribute('target','_blank');await expect(dialog.getByRole('region',{name:'Cuenta de CD PROJEKT RED'})).toHaveCount(0);await expect(dialog.locator('.store-list')).not.toContainText('GOG');
});
