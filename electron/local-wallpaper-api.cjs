const {getWallpaper}=require('./wallpaper.cjs');
// Only the browser on the server's own computer can request its private wallpaper.
function localWallpaperApi(read=getWallpaper){
 let pending;
 return async(req,res,next)=>{
  if((req.url??'').split('?')[0]!=='/api/local-wallpaper')return next();
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
  const host=req.headers.host??'',address=req.socket.remoteAddress??'';
  const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host),localClient=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);
  const origin=req.headers.origin;
  if(!localHost||!localClient||req.headers['sec-fetch-site']==='cross-site'||origin&&origin!==`http://${host}`&&origin!==`https://${host}`){res.statusCode=403;return res.end(JSON.stringify({image:null}));}
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({image:null}));}
  try{pending??=Promise.resolve().then(read).finally(()=>{pending=undefined;});res.end(JSON.stringify({image:await pending}));}catch{res.statusCode=503;res.end(JSON.stringify({image:null}));}
 };
}
module.exports={localWallpaperApi};
