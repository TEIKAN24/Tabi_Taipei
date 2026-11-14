/* TABI TAIPEI v2.0.101 — js/tt2-menu.js: side menu: the angled drawer
   Was js/figma-side-angled-v227.js until 2.0.101 (cleanup phase 3). */
/* TAIPEI CITY GUIDE v2.0.28 — close-only swipe for full-screen side menu.
   The original hamburger and view-router own opening, closing and navigation.
   We do not install any closed-state or document-wide open-swipe listeners. */
(() => {
  'use strict';
  const root=document.documentElement;
  const panel=document.getElementById('tt-side-menu');
  const button=document.getElementById('tt-menu-toggle');
  const about=document.getElementById('tt226-about');
  const aboutButton=panel?.querySelector('.tt226-about-trigger');
  if(!panel||!button) return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function opened(){return root.classList.contains('tt-nav-open');}
  function updateFit(){
    // v2.0.28: fit to the menu's real content, not the full 748px drawing below the masthead.
    // The last item (About, incl. its touch target) ends at stage y=676; the rest is empty
    // background. Fitting to 748 shrank the menu to ~0.92 on every iPhone Safari, so it looked
    // narrower than Figma. Now it stays 1:1 whenever the content fits; only very short screens
    // scale down (still no scrolling).
    const CONTENT_H=676;
    const masthead=document.getElementById('tt-sitebar');
    const h=masthead?.getBoundingClientRect().height||104;
    const available=Math.max(0,panel.clientHeight-h);
    const fit=Math.max(.48,Math.min(1,innerWidth/393,available/CONTENT_H));
    root.style.setProperty('--tt227-fit',String(Number(fit.toFixed(4))));
  }
  updateFit();
  addEventListener('resize',updateFit,{passive:true});
  if(window.visualViewport) visualViewport.addEventListener('resize',updateFit,{passive:true});
  document.addEventListener('tt:viewchange',updateFit);
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(updateFit):null;
  ro?.observe(document.getElementById('tt-sitebar'));

  let active=null,dragged=false,clickSuppressedUntil=0;
  const EDGE_GUARD=24;
  function clearDrag(){
    active=null;
    if(root.classList.contains('tt227-dragging')) root.classList.remove('tt227-dragging');
    panel.style.removeProperty('transform');
    document.getElementById('tt-menu-backdrop')?.style.removeProperty('opacity');
  }
  function start(x,y,time){
    if(!opened() || x < EDGE_GUARD) return;
    active={x,y,time,lastX:x,lastTime:time,dx:0,axis:null};dragged=false;
  }
  function move(x,y,time,event){
    if(!active||!opened())return;
    const dx=x-active.x,dy=y-active.y;
    if(active.axis===null){
      if(Math.hypot(dx,dy)<9)return;
      active.axis=dx>0&&dx>Math.abs(dy)*1.25?'right':'other';
    }
    if(active.axis!=='right')return;
    event?.preventDefault?.();
    active.dx=Math.min(panel.clientWidth,Math.max(0,dx));
    active.lastX=x;active.lastTime=time;
    root.classList.add('tt227-dragging');
    panel.style.transform=`translate3d(${active.dx}px,0,0)`;
    const backdrop=document.getElementById('tt-menu-backdrop');
    if(backdrop)backdrop.style.opacity=String(Math.max(0,1-active.dx/Math.max(1,panel.clientWidth)));
    dragged=true;
  }
  function end(time){
    if(!active)return;
    const shouldClose=opened()&&active.axis==='right'&&(
      active.dx>Math.max(82,panel.clientWidth*.22) ||
      (active.dx>38&&active.dx/Math.max(1,time-active.time)>.62)
    );
    const wasDragged=dragged;
    // Removing the drag class restores transitions. For a successful swipe,
    // first switch the menu to its closed state, then remove the inline offset
    // so it continues moving right without snapping back to its origin.
    root.classList.remove('tt227-dragging');
    active=null;dragged=false;
    if(shouldClose){
      button.click();
      clickSuppressedUntil=Date.now()+350;
      panel.style.removeProperty('transform');
    } else {
      panel.style.removeProperty('transform');
      if(wasDragged)clickSuppressedUntil=Date.now()+300;
    }
    document.getElementById('tt-menu-backdrop')?.style.removeProperty('opacity');
    if(shouldClose)hideAbout();
  }
  panel.addEventListener('touchstart',e=>{
    if(e.touches.length!==1) return;
    const t=e.touches[0];start(t.clientX,t.clientY,e.timeStamp);
  },{passive:true});
  panel.addEventListener('touchmove',e=>{
    if(e.touches.length!==1)return;
    const t=e.touches[0];move(t.clientX,t.clientY,e.timeStamp,e);
  },{passive:false});
  panel.addEventListener('touchend',e=>end(e.timeStamp),{passive:true});
  panel.addEventListener('touchcancel',()=>clearDrag(),{passive:true});
  // Desktop preview: mouse drag follows the same close-only contract.
  panel.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button===0)start(e.clientX,e.clientY,e.timeStamp);
  });
  panel.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse')move(e.clientX,e.clientY,e.timeStamp,e);
  });
  panel.addEventListener('pointerup',e=>{
    if(e.pointerType==='mouse')end(e.timeStamp);
  });
  panel.addEventListener('pointercancel',e=>{
    if(e.pointerType==='mouse')clearDrag();
  });
  panel.addEventListener('click',e=>{
    if(Date.now()>clickSuppressedUntil)return;
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  // Source-based minimal About panel; no unapproved destination is invented.
  function hideAbout(){if(!about)return;about.hidden=true;aboutButton?.setAttribute('aria-expanded','false');}
  aboutButton?.addEventListener('click',()=>{
    if(!about)return;
    const newState=about.hidden;
    about.hidden=!newState;
    aboutButton.setAttribute('aria-expanded',String(newState));
    if(newState)about.querySelector('button')?.focus({preventScroll:true});
  });
  about?.querySelector('.tt226-about-close')?.addEventListener('click',()=>{
    hideAbout();aboutButton?.focus({preventScroll:true});
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!about?.hidden){e.stopImmediatePropagation();hideAbout();aboutButton?.focus({preventScroll:true});}
  },true);
  const observer=new MutationObserver(()=>{if(!opened()){hideAbout();clearDrag();}});
  observer.observe(root,{attributes:true,attributeFilter:['class']});
})();
