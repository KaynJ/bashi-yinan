(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.CampaignData=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clips = [
    { id:1, title:'夕照西行', heading:'山河未改，西行未歇', text:'夕照落在山脊上，师徒仍向西而行。这条路，他们已经走了很久。', voice:'夕照落在山脊上，师徒仍向西而行。这条路，他们已经走了很久。', poster:'assets/home-poster.jpg' },
    { id:2, title:'天庭对饮', heading:'此间的守护者', text:'你是守护此界之人。此刻，你正在天庭，与玉帝对饮。山下的西行，仍在继续。', voice:'你是守护此界之人。此刻，你正在天庭，与玉帝对饮。山下的西行，仍在继续。', poster:'assets/prologue-poster.jpg' },
    { id:3, title:'白骨岭相遇', heading:'山路上，有人拦道', text:'山风渐歇，来者却未必怀着善意。且看师徒如何应对这一场相逢。', voice:'山风渐歇，来者却未必怀着善意。且看师徒如何应对这一场相逢。', poster:'assets/clip-3-poster.jpg' },
    { id:4, title:'阵前宣战', heading:'交锋将至', text:'敌阵已经展开。接下来，先看清每位同伴的本领，排好阵形，再一同迎敌。', voice:'敌阵已经展开。接下来，先看清每位同伴的本领，排好阵形，再一同迎敌。', poster:'assets/clip-4-poster.jpg' },
    { id:5, title:'天地裂变', heading:'一战方歇，天地骤变', text:'白骨阵虽破，山河却忽然异动。眼前的变故，远不止一场战斗那么简单。', voice:'白骨阵虽破，山河却忽然异动。眼前的变故，远不止一场战斗那么简单。', poster:'assets/clip-5-poster.jpg' },
    { id:6, title:'守护者察看', heading:'五道去路，五缕因缘', text:'同伴已散入不同的漩涡。先查清眼前的去路，再决定追寻谁的踪迹。', voice:'同伴已散入不同的漩涡。先查清眼前的去路，再决定追寻谁的踪迹。', poster:'assets/clip-6-poster.jpg' }
  ];
  const lessons = [
    { id:'welcome', title:'先观阵，再动身', target:'#field', text:'莫急，且先看清眼前的交锋。上方是敌阵，下方是我方；双方各有五行五列。布阵妥当，再让同伴迎敌。', next:'看看敌阵' },
    { id:'enemy', title:'知彼，方能应对', target:'#enemy-roster', text:'点一下白骨精，看看她的招式。飞扇与骨刺会威胁同一列的同伴，站位时要留心。', task:'请点选敌阵中的白骨精', next:'记下了' },
    { id:'roles', title:'让合适的人站在前面', target:'[data-hero="bajie"]', text:'点选八戒。他是坦克，适合承受前方的攻击。悟空擅长突进，沙僧近战稳健；唐僧与白龙马，更需要队友掩护。', task:'请点选人物列表中的八戒', next:'试着布阵' },
    { id:'formation', title:'挪一步，便是另一种章法', target:'.board-grid>.cell[data-col="1"][data-row="5"]', text:'把八戒拖到下方亮起的前排空格。靠近分界的位置先迎敌；唐僧和白龙马尽量留在后方。拖动时，绿色格子会显示攻击范围。', task:'拖动八戒到高亮格；也可沿用当前阵容', next:'布阵好了', alternative:'沿用当前阵容' },
    { id:'skills', title:'两招在身，各有时机', target:'#combat-skills', text:'看这里：每位同伴都有一个小技能和一个大招。它们分别计算冷却，条件满足便会自动施放，不需要法力，也不用反复点按。', next:'准备迎敌' },
    { id:'start', title:'准备好了，便开战吧', target:'#phase-toggle', text:'阵形可以再调一调。准备妥当后，点击“开始教学战”。开战后，同伴会自行寻找目标、逐格接近并攻击。', task:'请点击“开始教学战”', next:'等待开战' },
    { id:'moving', title:'各行其位，各尽其能', target:'#field', text:'有敌人在攻击范围内，同伴便会出招；暂时够不到，就会逐格靠近。战中不能重新布阵，先前的安排，现在便要见分晓了。', next:'继续观察' },
    { id:'cooldowns', title:'看冷却，也看战机', target:'#combat-skills', text:'数字归零，技能便已就绪。若暂时没有合适的目标，同伴会等待机会。暂停时，生命、行动和技能冷却也会一同停下。', next:'继续观战' },
    { id:'controls', title:'不必着急，随时可以停一停', target:'#battle-pause', text:'想看清战局，就按“暂停”；熟悉以后，可切换一倍或两倍速度。若此战不顺，调整站位再试一次便是。', next:'交给他们' }
  ];
  const result = { id:'victory', title:'这一阵，我们走过了', text:'白骨阵已破。记住今日的章法：前排稳住阵线，后排施展本领，留心敌人的攻击范围。只是，这场西行尚未结束。', next:'继续故事' };
  const gates = [
    { id:'tangseng', name:'唐僧', role:'法师', color:'#dfb75e', x:11.5, y:52, summary:'循淡金漩涡，追寻唐僧的踪迹。' },
    { id:'wukong', name:'悟空', role:'刺客', color:'#b96153', x:29, y:20, summary:'循朱红漩涡，追寻悟空的踪迹。' },
    { id:'bajie', name:'八戒', role:'坦克', color:'#9d7eab', x:50.5, y:7.5, summary:'循紫色漩涡，追寻八戒的踪迹。' },
    { id:'shaseng', name:'沙僧', role:'战士', color:'#80a08a', x:67, y:16.5, summary:'循青绿漩涡，追寻沙僧的踪迹。' },
    { id:'bailongma', name:'白龙马', role:'增益', color:'#9bb6c3', x:80.5, y:34, summary:'循银蓝漩涡，追寻白龙马的踪迹。' }
  ];
  const sequence = [1,2,3,4,'tutorial',5,6,'worlds'];
  const narration = [...clips.map(c=>({id:'clip-'+c.id,text:c.voice})),...lessons.map(l=>({id:l.id,text:l.text})),{id:'victory',text:result.text},{id:'worlds',text:'五道漩涡仍在旋转。选择一位同伴，记下你想追寻的方向。'}];
  return {clips,lessons,result,gates,sequence,narration};
});
