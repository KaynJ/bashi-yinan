(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ScenePointer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function cellAt(rect,x,y){
    if(!rect||rect.width<=0||rect.height<=0||x<rect.left||y<rect.top||x>=rect.left+rect.width||y>=rect.top+rect.height)return null;
    return {col:Math.floor((x-rect.left)/rect.width*5),row:Math.floor((y-rect.top)/rect.height*10)};
  }
  function sourceFrom(target){
    const equipment=target?.closest?.('[data-equip]'),unit=target?.closest?.('[data-unit]'),roster=target?.closest?.('[data-hero]'),source=equipment||unit||roster;
    if(!source)return null;
    return {kind:equipment?'equipment':'hero',id:equipment?equipment.dataset.equip:unit?unit.dataset.unit:roster.dataset.hero,origin:unit?'field':'roster',source};
  }
  function create(callbacks,threshold=5){
    let current=null;
    function finish(){const previous=current;current=null;if(previous)callbacks.end?.(previous);return previous;}
    return {
      get current(){return current;},
      down(payload){if(current)return false;current={...payload,active:false};return true;},
      move(e){
        if(!current||current.pointerId!==e.pointerId)return false;
        if(!current.active&&Math.hypot(e.clientX-current.x,e.clientY-current.y)<threshold)return true;
        if(!current.active){current.active=true;callbacks.start?.(current,e);}
        callbacks.move?.(current,e);return true;
      },
      up(e){
        if(!current||current.pointerId!==e.pointerId)return false;
        if(!current.active&&Math.hypot(e.clientX-current.x,e.clientY-current.y)>=threshold){current.active=true;callbacks.start?.(current,e);}
        const previous=finish();
        if(previous.active)callbacks.drop?.(previous,e);else callbacks.tap?.(previous,e);
        return true;
      },
      cancel(){return finish();}
    };
  }
  return {cellAt,sourceFrom,create};
});
