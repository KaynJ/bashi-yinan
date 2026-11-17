const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const web=path.resolve(__dirname,'../web'),home=path.join(web,'game/04_程序开发/游戏首页_v0.1'),base=path.join(web,'game/04_程序开发/战场场景设计/v0.1');
const D=require(path.join(home,'flow-data.js'));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('entry stays within the GitHub Pages project subpath',()=>{
 const html=fs.readFileSync(path.join(web,'index.html'),'utf8');assert.match(html,/\.\/game\/04_/);assert.doesNotMatch(html,/sunnybear37|chatgpt\.site|localhost|127\.0\.0\.1/);
 assert.match(fs.readFileSync(path.join(home,'index.html'),'utf8'),/flow\.js/);
});
test('all directly referenced scripts, styles and media in both HTML entries exist',()=>{
 for(const file of [path.join(home,'index.html'),path.join(base,'../教学关_v0.5/index.html')]){
  const html=fs.readFileSync(file,'utf8'),baseHref=/<base href="([^"]+)"/.exec(html)?.[1],dir=baseHref?path.resolve(path.dirname(file),baseHref):path.dirname(file);
  for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){
   const ref=m[1].split('?')[0];if(ref===baseHref||/^(?:https?:|data:|#)/.test(ref)||!path.extname(ref))continue;
   assert.equal(fs.existsSync(path.resolve(dir,ref)),true,`${file}: ${ref}`);
  }
 }
});
test('every published browser script parses without running untrusted page code',()=>{
 for(const file of walk(web).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(file,'utf8'),{filename:path.relative(web,file)});
});
test('six movies keep required order and have streamable MP4 metadata',()=>{
 assert.deepEqual(D.sequence,[1,2,3,4,'tutorial',5,6,'worlds']);
 for(let i=1;i<=6;i++){
  const file=path.join(web,'game/02_视频生成/序章/04_采用片段',i+'.mp4'),bytes=fs.readFileSync(file);
  assert.ok(bytes.length>1024&&bytes.length<24*1024*1024);const moov=bytes.indexOf(Buffer.from('moov')),mdat=bytes.indexOf(Buffer.from('mdat'));assert.ok(moov>=0&&moov<mdat,`movie ${i} needs faststart`);
 }
});
test('guardian, posters and every Mandarin narration clip are included',()=>{
 assert.ok(fs.statSync(path.join(home,'assets/guardian-bust-v1.png')).size>1000);
 for(const c of D.clips)assert.ok(fs.existsSync(path.join(home,c.poster)));
 for(const record of D.narration)assert.ok(fs.statSync(path.join(home,'assets/narration',record.id+'.mp3')).size>1000);
});
test('required battle art and codex characters are present',()=>{
 for(const id of ['wukong','bajie','shaseng','tangseng','bailongma'])assert.ok(fs.existsSync(path.join(base,'assets',id+'.png')));
 for(const id of ['boss','red','yellow','blue','green'])assert.ok(fs.existsSync(path.join(web,'game/04_程序开发/战斗表现小样/白骨精初稿/v0.2/assets',id,'body.png')));
});
test('only portable public assets are included and the site stays below the Pages size limit',()=>{
 const files=walk(web);assert.ok(files.length>100);assert.ok(files.reduce((n,f)=>n+fs.statSync(f).size,0)<1024*1024*1024);
 assert.equal(files.some(f=>/(?:\.git|\.codex|\.aws|\.env|hosting\.json|preview.*\.log)/.test(path.relative(web,f))),false);
});
