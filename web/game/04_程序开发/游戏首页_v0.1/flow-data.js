(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.CampaignData=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clips = [
  {
    "id": 1,
    "title": "夕照西行",
    "text": "上仙，自500年前您将此界托付给老朽，世事变迁，今天下妖魔频出，天庭势弱。得亏您500年前留下了锦囊，唐僧师徒已按照其中之策集结完毕，踏上了西行之路，愿为天下寻得除妖真经。"
  },
  {
    "id": 2,
    "title": "天庭对饮",
    "text": "当下我真身尚在天庭，与玉帝商议此间事宜。如今您即已归来，请您指导他们师徒走完剩下的路，还天下太平。"
  },
  {
    "id": 3,
    "title": "白虎岭相遇",
    "text": ""
  },
  {
    "id": 4,
    "title": "阵前宣战",
    "text": "唐僧师徒已行至白虎岭，白骨精等妖修为高深，他们急需您的指点。"
  },
  {
    "id": 5,
    "title": "天地裂变",
    "text": "前方似有变故，待我去一探究竟。"
  },
  {
    "id": 6,
    "title": "守护者查探",
    "text": "唐僧师徒被吸入了不同的漩涡，也许对应着不同的世界，三千年前的史料中有提及类似经历，也许新的八十一难，需要在异界完成了。追上去吧，选择一个同伴祝他一臂之力。"
  }
];
  const lessons = [
  {
    "id": "welcome",
    "title": "先观阵，再动身",
    "target": "#field",
    "text": "莫急，且先看清眼前的交锋。上方是敌阵，下方是我方；双方各有五行五列。布阵妥当，再让同伴迎敌。",
    "next": "看看敌阵"
  },
  {
    "id": "enemy",
    "title": "六类定位",
    "target": "#enemy-roster [data-enemy=\"bone-boss\"]",
    "text": "神魔通途，共分六类，坦克，战士，法师，射手，刺客，辅助，定位不同，所学所精也各有差异：坦克为前排承伤位，皮糙肉厚；战士为前排输出，能抗能打；法师和射手为远程输出手，法师范围大，射手单体强；刺客可以无视对方前排，对敌方后排核心造成威胁；辅助则承担治疗和增益重任，是团队灵魂。现在请您点击白骨精的画像，看看她的招式。"
  },
  {
    "id": "horse",
    "title": "看清招式",
    "target": "#roster-grid [data-hero=\"bailongma\"]",
    "text": "可见，飞扇与骨刺会威胁同一列的同伴，站位时需留心。再请点击白龙马画像。"
  },
  {
    "id": "formation",
    "title": "让治疗照应同伴",
    "target": "#board-grid",
    "text": "可以看到，它的治疗生效范围为身边8格，请您将其置于同伴中心。"
  },
  {
    "id": "roles",
    "title": "各就其位",
    "target": "#field",
    "text": "相似的，八戒是坦克，沙僧是战士，适合布置于前排；唐僧是高输出法师，适合布置于后方主位；悟空是可以威胁敌方后排的刺客，可以针对敌方输出核心进行布置。"
  },
  {
    "id": "skills",
    "title": "同伴的招数",
    "target": "#combat-skills",
    "text": "除普通攻击外，每位同伴各有一小一大两种招数。它们分别计算冷却，条件满足便会自动施放。"
  },
  {
    "id": "items",
    "title": "本命武器与法宝",
    "target": "#loadout-panel",
    "text": "除了伙伴自带的攻击手段，右侧的法宝和装备也至关重要，装备可以对单个伙伴进行加持，法宝则有着意想不到的神奇效果。目前唐僧师徒各持一件本命武器，不可拆卸与替换，法宝则只有玉帝赠予的一卷经文。在后续的行程中您会获取新的装备和法宝，助您斩妖除魔。"
  },
  {
    "id": "start",
    "title": "准备迎敌",
    "target": "#phase-toggle",
    "text": "如有敌人在攻击范围内，同伴便会出招；暂时够不到，就会逐格靠近。时不我待，战斗一触即发，战中不能重新布阵，先前的安排，现在便要见分晓了，请点击开始战斗。"
  },
  {
    "id": "cooldowns",
    "title": "看清战局",
    "target": "#battle-pause",
    "text": "数字归零，技能便已就绪。若暂时没有合适的目标，同伴会等待机会。想看清战局，就按“暂停”；熟悉以后，可切换一倍或两倍速度。若此战不顺，调整站位再试一次便是。暂停时，生命、行动和技能冷却也会一同停下。"
  },
  {
    "id": "stats",
    "title": "实时战斗统计",
    "target": "#stats-panel",
    "text": "右侧是实时战斗统计，可以看到伙伴和敌人造成的伤害，承伤量与治疗量。"
  }
];
  const result = {"id":"victory","title":"白骨精入队","text":"白骨精已伏诛。她愿加入队伍随吾等踏上征途。西行路远，前途未知，下场战斗可以也派上她一同战斗。"};
  const gates = [
    { id:'tangseng', name:'唐僧', role:'法师', color:'#dfb75e', x:11.5, y:52, summary:'循淡金漩涡，追寻唐僧的踪迹。' },
    { id:'wukong', name:'悟空', role:'刺客', color:'#b96153', x:29, y:20, summary:'循朱红漩涡，追寻悟空的踪迹。' },
    { id:'bajie', name:'八戒', role:'坦克', color:'#9d7eab', x:50.5, y:7.5, summary:'循紫色漩涡，追寻八戒的踪迹。' },
    { id:'shaseng', name:'沙僧', role:'战士', color:'#80a08a', x:67, y:16.5, summary:'循青绿漩涡，追寻沙僧的踪迹。' },
    { id:'bailongma', name:'白龙马', role:'增益', color:'#9bb6c3', x:80.5, y:34, summary:'循银蓝漩涡，追寻白龙马的踪迹。' }
  ];
  const sequence = [1,2,3,4,'tutorial',5,6,'worlds'];
  return {clips,lessons,result,gates,sequence};
});
