import {legacySettings} from './computer-helpers';
import {test,expect} from '@playwright/test';
test('RED sustituye GOG y ofrece acceso oficial sin fingir una cuenta vinculada',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();await legacySettings(page);
 const account=page.getByRole('region',{name:'Cuenta de CD PROJEKT RED'});await expect(account).toContainText('Sin vincular');
 for(const name of ['Iniciar sesión en CD PROJEKT RED ↗','Crear cuenta en CD PROJEKT RED ↗']){const link=account.getByRole('link',{name,exact:true});await expect(link).toHaveAttribute('href','https://accounts.cdprojektred.com/');await expect(link).toHaveAttribute('target','_blank');}
 await expect(page.locator('.store-list')).not.toContainText('GOG');await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await page.getByLabel('Tienda',{exact:true}).selectOption('CD PROJEKT RED');await expect(page.locator('.game-card')).toHaveCount(2);await expect(page.locator('.card-details>button')).toHaveText(['Cyberpunk 2077','The Witcher 3']);
});
