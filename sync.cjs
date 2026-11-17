'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const project=__dirname,workspace=path.resolve(project,'../..'),source=path.join(workspace,'八十一难');
const development=path.join(source,'04_程序开发'),home=path.join(development,'游戏首页_v0.1');
const battle=path.join(development,'战场场景设计/教学关_v0.5'),base=path.join(development,'战场场景设计/v0.1');
const dist=path.join(project,'web'),copied=new Set();
function target(file){const relative=path.relative(source,file);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Asset outside the game source');return path.join(dist,'game',relative);}
function copy(file){const dest=target(file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);copied.add(file);}
function tree(dir,accept=()=>true){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())tree(file,accept);else if(accept(file))copy(file);}}
fs.mkdirSync(dist,{recursive:true});
for(const file of ['index.html','home.css','home.js','model.js','flow.css','flow.js','flow-data.js'])copy(path.join(home,file));
tree(path.join(home,'assets'),file=>/\.(?:png|jpg|svg|mp3)$/.test(file));
copy(path.join(battle,'index.html'));
const html=fs.readFileSync(path.join(battle,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 const reference=match[1].split('?')[0];if(/\.(?:js|css)$/.test(reference))copy(path.resolve(base,reference));
}
for(const file of [...copied].filter(f=>/\.(js|css)$/.test(f)&&f.startsWith(path.join(development,'战场场景设计')))){
 const text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/["']((?:runtime\/assets\/|assets\/)[^"'`$]+\.(?:png|webp|svg|jpg))["']/g))copy(path.resolve(base,match[1]));
}
for(const id of ['wukong','bajie','shaseng','tangseng','bailongma']){
 copy(path.join(base,'assets',id+'.png'));
 copy(path.join(development,'战斗表现小样/assets',id==='wukong'?'chibi-hold-v02':'chibi-v01',id,'front.png'));
}
for(const id of ['boss','red','yellow','blue','green'])for(const part of id==='boss'?['body','fan','wink']:['body','fan'])copy(path.join(development,'战斗表现小样/白骨精初稿/v0.2/assets',id,part+'.png'));
const ffmpeg=path.join(workspace,'tools/comfy-cli-env/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
const videos=[];
for(let i=1;i<=6;i++){
 const original=path.join(source,'02_视频生成/序章/04_采用片段',i+'.mp4'),destination=target(original);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 if(!fs.existsSync(destination)||fs.statSync(destination).mtimeMs<fs.statSync(original).mtimeMs){
  const encoded=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',original,'-map','0:v:0','-map','0:a:0?','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',destination],{stdio:'inherit',windowsHide:true});
  if(encoded.status!==0)throw Error('Video encoding failed: '+i);
 }
 const bytes=fs.statSync(destination).size;if(bytes>24*1024*1024)throw Error('Video is too large for static hosting: '+i);
 videos.push({clip:i,originalBytes:fs.statSync(original).size,publishedBytes:bytes});
}
const entry='./game/04_程序开发/游戏首页_v0.1/index.html';
fs.writeFileSync(path.join(dist,'index.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="八十一难：剧情驱动的西游异世界队伍养成游戏试玩。"><meta http-equiv="refresh" content="0;url=${encodeURI(entry)}"><title>八十一难 · 西游异世行记</title><style>body{margin:0;background:#26392e;color:#eee5cf;min-height:100vh;display:grid;place-content:center;text-align:center;font-family:serif}a{color:#ddc391}h1{font-weight:400;letter-spacing:.3em}</style></head><body><h1>八十一难</h1><p>云起处，又一程。</p><p><a href="${entry}">进入游戏</a></p><script>location.replace(new URL(${JSON.stringify(entry)},location.href));</script></body></html>`);
fs.writeFileSync(path.join(dist,'_headers'),'/\n  Cache-Control: no-cache\n/game/*\n  Cache-Control: public, max-age=0, must-revalidate\n  X-Content-Type-Options: nosniff\n');
const all=[];function list(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,entry.name);if(entry.isDirectory())list(f);else all.push(f);}}list(dist);
const report={files:all.length,totalMiB:Number((all.reduce((sum,f)=>sum+fs.statSync(f).size,0)/1024/1024).toFixed(2)),videos};
fs.writeFileSync(path.join(project,'build-report.json'),JSON.stringify(report,null,2));
const scenario=fs.readFileSync(path.join(home,'campaign-review.cjs'),'utf8')
 .replace("const out=path.join(__dirname,'review-flow');","const out=path.join(__dirname,'review');")
 .replace("await import('./serve.mjs')","await import('./preview.mjs')");
fs.writeFileSync(path.join(project,'verify.cjs'),scenario);
console.log(JSON.stringify(report));
