import {test,expect} from '@playwright/test';
import {starterLook,validAvatar} from '../src/avatar';
import {newlyEarnedTrophies,trophyReward} from '../src/trophy-rewards';
test('solo se pueden equipar estilos y cosméticos desbloqueados',()=>{
 const forged={...starterLook('fideo'),glasses:true,hat:'crown' as const,body:'#010203'};const locked=validAvatar(forged,[],'bollo');expect(locked.style).toBe('bollo');expect(locked.glasses).toBe(false);expect(locked.hat).toBe('none');expect(locked.body).toBe(starterLook('bollo').body);
 const unlocked=validAvatar(forged,['avatar-style-fideo','avatar-glasses','avatar-crown','avatar-dyes'],'bollo');expect(unlocked).toEqual(forged);
});
test('solo los trofeos nuevos generan recompensas y una colección completa da 19 puntos',()=>{
 const earned=['0:0','0:1','0:2','0:3','0:4','0:5','0:platinum'];expect(newlyEarnedTrophies(earned,['0:0'],['0:1'])).toEqual(earned.slice(2));expect(newlyEarnedTrophies(earned,earned,earned)).toEqual([]);expect(newlyEarnedTrophies(['0:0','0:0'],[],[])).toEqual(['0:0']);expect(earned.reduce((sum,key)=>sum+trophyReward(key.endsWith('platinum')?'platinum':Number(key.split(':')[1])),0)).toBe(19);
});
