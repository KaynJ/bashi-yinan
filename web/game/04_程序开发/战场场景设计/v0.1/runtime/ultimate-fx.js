/* Small vector effects; every property is sampled from battle time, including pause. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.UltimateFX=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DURATION=.72;
  const THEMES={
    wukong:{name:'金色扫击',color:'#bd9451',radius:1.45},tangseng:{name:'金睛显目',color:'#d9ae49',radius:1.6},
    bajie:{name:'回元暖光',color:'#a8ad73',radius:1.1},shaseng:{name:'怒吼震波',color:'#c7a16c',radius:1.8},
    bailongma:{name:'羽翼治疗涟漪',color:'#77aa8d',radius:1.9}
  };
  function sample(id,age){
    if(!THEMES[id]||age<0||age>=DURATION)return null;
    const p=age/DURATION,fadeIn=Math.min(1,p/.12),fadeOut=(1-p)*(1-p);
    return{progress:p,opacity:.78*fadeIn*fadeOut,scale:.65+.65*(1-(1-p)**3),rotation:-25+75*p,lift:32*p};
  }
  function markup(id){
    let shape='';
    if(id==='wukong')shape='<g class="fx-sweep"><path d="M34 100 Q85 20 172 80"/><path d="M45 110 Q105 49 161 84" opacity=".45"/></g>';
    if(id==='tangseng'){
      shape='<g class="fx-core"><path d="M15 75 Q47 40 82 75 Q47 102 15 75 M118 75 Q153 40 185 75 Q153 102 118 75 M25 62 L20 50 M37 55 L35 42 M48 53 L48 38 M175 62 L180 50 M163 55 L165 42 M152 53 L152 38"/><ellipse cx="49" cy="74" rx="8" ry="14"/><ellipse cx="151" cy="74" rx="8" ry="14"/></g>';
    }
    if(id==='bajie')shape='<g class="fx-ground"><ellipse cx="100" cy="110" rx="62" ry="25"/><ellipse cx="100" cy="110" rx="48" ry="18" opacity=".4"/></g><g class="fx-rise"><circle cx="70" cy="86" r="4"/><circle cx="134" cy="73" r="3"/><path d="M100 48 L100 68 M90 58 L110 58"/></g>';
    if(id==='shaseng')shape='<g class="fx-core"><ellipse cx="100" cy="80" rx="72" ry="52"/><ellipse cx="100" cy="80" rx="52" ry="38" opacity=".6"/><ellipse cx="100" cy="80" rx="30" ry="22" opacity=".4"/></g>';
    if(id==='bailongma')shape='<g class="fx-ground"><ellipse cx="100" cy="110" rx="77" ry="28"/><ellipse cx="100" cy="110" rx="56" ry="19" opacity=".5"/></g><g class="fx-rise"><circle cx="58" cy="85" r="3"/><circle cx="88" cy="63" r="3"/><circle cx="128" cy="73" r="3"/><path d="M111 31 L111 45 M104 38 L118 38"/></g>';
    return`<svg viewBox="0 0 200 160" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`;
  }
  function mount(element,id){
    element.classList.add('ultimate-fx');element.style.color=THEMES[id].color;element.innerHTML=markup(id);
    const sweep=element.querySelector('.fx-sweep'),ground=element.querySelector('.fx-ground'),core=element.querySelector('.fx-core'),rise=element.querySelector('.fx-rise');
    return{draw(age){const state=sample(id,age);element.hidden=!state;if(!state)return;
      element.style.opacity=String(state.opacity);
      if(sweep)sweep.setAttribute('transform',`translate(100 80) rotate(${state.rotation}) scale(${state.scale}) translate(-100 -80)`);
      if(ground)ground.setAttribute('transform',`translate(100 110) scale(${state.scale}) translate(-100 -110)`);
      if(core)core.setAttribute('transform',`translate(100 80) scale(${.75+state.progress*.4}) translate(-100 -80)`);
      if(rise)rise.setAttribute('transform',`translate(0 ${-state.lift})`);
    }};
  }
  return{DURATION,THEMES,sample,markup,mount};
});
