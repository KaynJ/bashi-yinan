const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(__dirname,'review');
const checks=[],errors=[],missing=[];
const check=name=>checks.push(name);
const shot=async(page,name)=>{await page.locator('#toast').evaluate(n=>n.hidden=true);await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
async function ready(page,clip){await page.waitForFunction(n=>CampaignReview.scene==='story'&&CampaignReview.clip===n&&!CampaignReview.changing,clip);}
async function nextLesson(page,number){await page.locator('#guide-next').click();await page.waitForFunction(n=>CampaignReview.lesson===n,number);}
(async()=>{
 await fs.mkdir(out,{recursive:true});const {createPreviewServer}=await import('./preview.mjs');const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1600,height:1000}});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(r.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.HomeUI);
  await page.locator('[data-panel="start"]').click();await page.locator('[data-action="begin"]').click();await ready(page,1);
  await page.waitForFunction(()=>document.getElementById('narration-audio').duration>0);
  const narration=await page.locator('#narration-audio').evaluate(a=>({duration:a.duration,src:a.currentSrc,playing:!a.paused,muted:a.muted}));
  assert.ok(narration.duration>3);assert.equal(narration.muted,false);assert.match(narration.src,/clip-1.mp3/);
  assert.equal(await page.locator('#story-video').getAttribute('controls'),null);
  assert.equal(await page.locator('#story-video').evaluate(v=>v.controls),false);
  await page.waitForFunction(()=>document.querySelector('.guardian-bust').naturalWidth>0);await shot(page,'01-夕照旁白-云框半身像');
  check('starts at adopted clip 1, no native timeline, local Mandarin narration and transparent guardian portrait load');
  // Finish the first movie naturally after seeking near its tail, then test explicit skips on 2-4.
  await page.locator('#guide-next').click();await page.waitForFunction(()=>!CampaignReview.intro);
  await page.locator('#story-video').evaluate(v=>{v.currentTime=v.duration-.3;});await ready(page,2);
  assert.deepEqual(await page.evaluate(()=>CampaignReview.history),[1,2]);
  await page.locator('#story-next').click();await ready(page,3);await page.locator('#story-next').click();await ready(page,4);
  assert.deepEqual(await page.evaluate(()=>CampaignReview.history),[1,2,3,4]);
  const skip=page.locator('#story-next');await skip.click();
  await page.waitForFunction(()=>CampaignReview.scene==='battle'&&CampaignReview.lesson===0&&!CampaignReview.changing);
  assert.deepEqual(await page.evaluate(()=>CampaignReview.history),[1,2,3,4,'tutorial']);
  await page.waitForFunction(()=>document.getElementById('battle-frame').getBoundingClientRect().bottom<=document.getElementById('cloud-guide').getBoundingClientRect().top-5);
  await shot(page,'02-教学-阵地概览');check('natural end and skip both preserve 1 -> 2 -> 3 -> 4 -> tutorial order');
  const f=page.frameLocator('#battle-frame');
  await nextLesson(page,1);assert.equal(await page.locator('#guide-next').isEnabled(),false);await f.locator('#enemy-roster [data-enemy="bone-boss"]').click();assert.equal(await page.locator('#guide-next').isEnabled(),true);
  await nextLesson(page,2);await f.locator('[data-hero="bajie"]').click();await nextLesson(page,3);
  await page.waitForFunction(()=>{
    const focus=document.getElementById('guide-focus'),f=document.getElementById('battle-frame'),a=f.contentDocument.querySelector('.board-grid>.cell[data-col="1"][data-row="5"]');
    if(!a)return false;const g=focus.getBoundingClientRect(),r=a.getBoundingClientRect(),fr=f.getBoundingClientRect();return !focus.hidden&&Math.abs(g.left-(fr.left+r.left-5))<2;
  });
  assert.equal(await page.locator('#guide-arrow').isVisible(),true);await shot(page,'03-教学-拖动布阵与箭头');
  const frame=page.frames().find(f=>f.url().includes('campaign=1'));
  const destination=await frame.evaluate(()=>{const a=[1,2,3,0,4].find(col=>!TeachingReview.state.heroes.some(h=>h.col===col&&h.row===5));return a??1;});
  const from=await f.locator('[data-unit="bajie"]').boundingBox(),to=await f.locator(`.board-grid>.cell[data-col="${destination}"][data-row="5"]`).boundingBox();
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:15});await page.mouse.up();
  await page.waitForFunction(()=>document.getElementById('cloud-guide').classList.contains('task-ready'));
  await nextLesson(page,4);await shot(page,'04-教学-双技能冷却');await nextLesson(page,5);
  await f.locator('#phase-toggle').click();await page.waitForFunction(()=>CampaignReview.lesson===6);
  const bframe=page.frames().find(f=>f.url().includes('campaign=1'));
  assert.equal(await bframe.evaluate(()=>TeachingReview.battle.status),'paused');const frozen=await bframe.evaluate(()=>TeachingReview.battle.time);await page.waitForTimeout(250);assert.equal(await bframe.evaluate(()=>TeachingReview.battle.time),frozen);
  check('arrow targets actual iframe UI; enemy and role clicks and real front-row drag unlock steps; explanation freezes battle');
  await f.locator('#battle-speed').selectOption('2');await page.locator('#guide-next').click();
  await page.waitForFunction(()=>CampaignReview.lesson===7);assert.equal(await bframe.evaluate(()=>TeachingReview.battle.status),'paused');await shot(page,'05-教学-战中暂停讲解');
  await page.locator('#guide-next').click();await page.waitForFunction(()=>CampaignReview.lesson===8);assert.equal(await bframe.evaluate(()=>TeachingReview.battle.status),'paused');await page.locator('#guide-next').click();
  await bframe.evaluate(()=>{const b=TeachingReview.battle;while(b.status==='running'&&b.time<160)BattleModel.step(b,1/60);TeachingReview.view.render();});
  await page.waitForFunction(()=>document.getElementById('cloud-guide').dataset.record==='victory');
  assert.equal(await bframe.evaluate(()=>TeachingReview.battle.status),'won');assert.equal(await page.evaluate(()=>HomeUI.getState().slots[0].phase),'aftermath');
  await shot(page,'06-教学完成-战后剧情入口');check('real engine wins; timed skill and pause lessons stop at real simulation milestones; only victory unlocks clip 5');
  await page.locator('#guide-next').click();await ready(page,5);await shot(page,'07-第五段-天地裂变');await page.locator('#story-next').click();await ready(page,6);
  // Capture an actual converging-cloud transition on the last skip.
  await page.locator('#story-next').click();await page.waitForFunction(()=>{
    const t=document.getElementById('transition');return t.classList.contains('active')&&new DOMMatrix(getComputedStyle(t.querySelector('.cloud-left')).transform).m41>500;
  });await page.screenshot({path:path.join(out,'08-汇聚云转场.png')});
  await page.waitForFunction(()=>CampaignReview.scene==='worlds'&&!CampaignReview.changing);assert.deepEqual(await page.evaluate(()=>CampaignReview.history),[1,2,3,4,'tutorial',5,6,'worlds']);
  await shot(page,'09-五涡选择');await page.locator('.route-button[data-route="wukong"]').click();await page.locator('#guide-next').click();assert.equal(await page.evaluate(()=>HomeUI.getState().slots[0].route),'wukong');
  check('complete sequence is 1,2,3,4,tutorial,5,6,worlds; route records only the selected direction');
  await page.locator('#world-home').click();await page.locator('[data-action="confirm-accept"]').click();await page.waitForFunction(()=>CampaignReview.scene==='home');
  await page.reload();await page.waitForFunction(()=>window.HomeUI);await page.locator('[data-panel="saves"]').click();await page.locator('[data-action="load"]').click();await page.waitForFunction(()=>CampaignReview.scene==='worlds'&&!CampaignReview.changing);assert.equal(await page.locator('.route-button[data-route="wukong"]').getAttribute('aria-pressed'),'true');
  check('world-choice checkpoint and route survive reload');
  // A separate journey exercises decline, failure and skip-guide paths without changing a real user store.
  const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(String(e)));await mobile.setViewportSize({width:390,height:844});await mobile.goto(`http://127.0.0.1:${server.address().port}/`);await mobile.waitForFunction(()=>window.HomeUI);
  await mobile.locator('[data-panel="start"]').click();await mobile.locator('[data-action="begin"]').click();await ready(mobile,1);await shot(mobile,'10-手机-旁白云框');
  for(let n=1;n<=4;n++){await ready(mobile,n);await mobile.locator('#story-next').click();}
  await mobile.waitForFunction(()=>CampaignReview.lesson===0&&!CampaignReview.changing);await mobile.locator('#guide-next').click();
  await mobile.waitForFunction(()=>{const f=document.getElementById('battle-frame'),t=f.contentDocument.querySelector('#enemy-roster'),r=t.getBoundingClientRect(),fr=f.getBoundingClientRect(),g=document.getElementById('guide-focus').getBoundingClientRect();return Math.abs(g.top-(fr.top+r.top-5))<2&&Math.abs(g.height-(r.height+10))<3;});
  await shot(mobile,'11-手机-箭头教学');
  await mobile.locator('#guide-toggle').click();assert.equal(await mobile.locator('#cloud-guide').isVisible(),false);
  const mf=mobile.frameLocator('#battle-frame');await mf.locator('#phase-toggle').click();await mobile.waitForFunction(()=>document.getElementById('battle-frame').contentWindow.TeachingReview.battle?.status==='running');
  // Lose through the existing engine with a one-person lineup in an independent retry below; here verify skip never enters clip 5.
  assert.equal(await mobile.evaluate(()=>CampaignReview.scene),'battle');assert.deepEqual(await mobile.evaluate(()=>CampaignReview.history),[1,2,3,4,'tutorial']);
  check('mobile cloud and arrow layout, skip explanations retains actual battle and cannot skip to clip 5');
  await mf.locator('#phase-toggle').click();
  for(const id of ['bajie','shaseng','tangseng','bailongma']){
    if(!await mf.locator('#roster-grid').isVisible())await mf.locator('[data-open="roster-panel"]').click();
    await mf.locator(`[data-hero="${id}"]`).click();await mf.locator('#deployment-toggle').click();
  }
  await mf.locator('#phase-toggle').click();
  await mobile.waitForFunction(()=>document.getElementById('battle-frame').contentWindow.TeachingReview.battle?.status==='running');
  const mframe=mobile.frames().find(f=>f.url().includes('campaign=1'));
  await mframe.evaluate(()=>{const b=TeachingReview.battle;while(b.status==='running'&&b.time<160)BattleModel.step(b,1/60);TeachingReview.view.render();});
  await mobile.waitForFunction(()=>document.getElementById('cloud-guide').dataset.record==='failure');
  assert.equal(await mobile.evaluate(()=>HomeUI.getState().slots[1].phase),'tutorial');
  await mobile.locator('#guide-next').click();await mobile.waitForFunction(()=>CampaignReview.lesson===3);
  check('real one-person defeat remains in tutorial and retry returns to formation without unlocking clip 5');
  for(const p of [page,mobile])assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({passed:true,checks,narration,errors,missing},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors,missing}));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
