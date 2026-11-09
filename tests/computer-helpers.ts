import {expect,type Page} from '@playwright/test';
export async function computerApp(page:Page,name:'Tienda'|'Ajustes'){
 await page.getByRole('button',{name:'Abrir ajustes desde el ordenador'}).press('Enter');await expect(page.getByRole('dialog',{name:'BOLL OS'})).toBeVisible();await page.getByRole('navigation',{name:'Aplicaciones del ordenador'}).getByRole('button',{name,exact:true}).click();
}
export async function legacySettings(page:Page){await computerApp(page,'Ajustes');await page.getByRole('button',{name:'Más ajustes y plataformas'}).click();}
