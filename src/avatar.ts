export const avatarStyles=['bollo','fideo','pepino','cabezon'] as const;
export type AvatarStyle=typeof avatarStyles[number];
export const avatarNames:Record<AvatarStyle,string>={bollo:'El Bollo',fideo:'El Fideo',pepino:'El Pepino',cabezon:'El Cabezón'};
export type AvatarLook={style:AvatarStyle;body:string;hands:string;outfit:string;shoes:string;hat:'none'|'bucket'|'crown';glasses:boolean;eyes:'normal'|'wonky';mouth:'surprised'|'smile'};
export const defaultAvatar:AvatarLook={style:'bollo',body:'#e2ac38',hands:'#efe0b9',outfit:'#465b32',shoes:'#47372a',hat:'none',glasses:false,eyes:'normal',mouth:'surprised'};
export function starterLook(style:AvatarStyle):AvatarLook{const colors={bollo:['#e2ac38','#efe0b9','#465b32'],fideo:['#8bc5b8','#8bc5b8','#c65c24'],pepino:['#9baa36','#9baa36','#7961a0'],cabezon:['#ed8980','#6377b5','#e6d4b4']}[style];return {...defaultAvatar,style,body:colors[0],hands:colors[1],outfit:colors[2]};}
export const avatarCatalog=[...avatarStyles.map(style=>({id:`avatar-style-${style}`,name:avatarNames[style],price:180,color:starterLook(style).body,kind:'Personaje'})),
 {id:'avatar-dyes',name:'Taller de tintes',price:120,color:'#ce9bc4',kind:'Personaje'},
 {id:'avatar-bucket',name:'Gorro de pescador',price:80,color:'#88a9bd',kind:'Personaje'},
 {id:'avatar-crown',name:'Corona torcida',price:180,color:'#e8c267',kind:'Personaje'},
 {id:'avatar-glasses',name:'Gafas redondas',price:90,color:'#4d4a64',kind:'Personaje'},
 {id:'avatar-wonky',name:'Mirada despistada',price:60,color:'#e4d9b7',kind:'Personaje'},
 {id:'avatar-smile',name:'Sonrisa de pillo',price:60,color:'#da967d',kind:'Personaje'}
];
export function validAvatar(raw:Partial<AvatarLook>|undefined,owned:string[],starter:AvatarStyle|null='bollo'):AvatarLook{
 const style=raw?.style&&avatarStyles.includes(raw.style)&&(raw.style===starter||owned.includes(`avatar-style-${raw.style}`))?raw.style:starter??'bollo';const look=starterLook(style);if(!raw)return look;
 if(owned.includes('avatar-dyes'))for(const part of ['body','hands','outfit','shoes'] as const)if(/^#[0-9a-f]{6}$/i.test(raw[part]??''))look[part]=raw[part]!;
 if(raw.hat==='bucket'&&owned.includes('avatar-bucket')||raw.hat==='crown'&&owned.includes('avatar-crown'))look.hat=raw.hat!;
 look.glasses=raw.glasses===true&&owned.includes('avatar-glasses');if(raw.eyes==='wonky'&&owned.includes('avatar-wonky'))look.eyes='wonky';if(raw.mouth==='smile'&&owned.includes('avatar-smile'))look.mouth='smile';return look;
}
