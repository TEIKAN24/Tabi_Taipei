/* TAIPEI CITY GUIDE 2.0.12 — Infinite, inertial category selector.
 * Three scoped instances only: 観光/名所・博物館, 体験, おみやげ.
 * Original tab buttons and their data panels remain the source of truth.
 * Wheel appearance highlights nearest centre during motion, but source
 * content changes ONLY after the final snap has completed.
 */
(() => {
  'use strict';
  const SOURCES = [
    {view:'sights', root:'details[data-tt2-panel-key="places"]'},
    {view:'experiences', root:'details[id="3f76bda0-4caa-80d2-8841-c76e1f8f749a"]'},
    {view:'souvenirs', root:'details[id="3f66bda0-4caa-8038-8328-e8b12e95336f"]'},
    // v2.0.32: 味わい 一覧. Its tabs are built (and rebuilt on every choice) by
    // js/recommend.js, so it is mounted later via window.tt2WheelMount('food').
    {view:'food', original:'#food-directory-tabs', button:'button.food-directory-tab', lazy:true}
  ];
  const GAP = 25;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (a, low, high) => Math.max(low, Math.min(high, a));
  const modulo = (a, b) => ((a % b) + b) % b;
  const now = () => performance.now();
  const instances = [];
  function mount(source) {
    // v2.0.112: a strip handed over as an element (商圏 detail: window.tt2WheelOn)
    const own = source.el || (source.original ? document.querySelector(source.original) : null);
    const original = (source.el || source.original) ? own
      : document.querySelector('#guide > '+source.root)?.querySelector('.tab')?.querySelector(':scope > .tab-pills');
    const root = (source.el || source.original) ? original?.parentElement : document.querySelector('#guide > '+source.root);
    const tab = (source.el || source.original) ? original?.parentElement : root?.querySelector('.tab');
    const selector = ':scope > ' + (source.button || 'button.tab-pill');
    // Fresh lookup each time: the food tabs are replaced whenever one is chosen.
    const liveButtons = () => original ? [...original.querySelectorAll(selector)] : [];
    const buttons = liveButtons();
    if (!root || !tab || buttons.length < 2 || original.dataset.tt2WheelMounted === '1') return;
    original.dataset.tt2WheelMounted = '1';
    original.classList.add('tt2-wheel-source');
    const wheel = document.createElement('div');
    wheel.className = 'tt2-wheel';
    wheel.dataset.tt2Wheel = source.view;
    wheel.setAttribute('role','group');
    wheel.setAttribute('aria-label','分類を選択：左右に回して中央で決定');
    wheel.tabIndex = 0;
    wheel.innerHTML = '<div class="tt2-wheel-viewport"><div class="tt2-wheel-track" aria-hidden="true"></div></div><span class="tt2-wheel-notch" aria-hidden="true"></span><span class="tt2-wheel-announcement" aria-live="polite"></span>';
    original.before(wheel);
    const track = wheel.querySelector('.tt2-wheel-track');
    const announcer = wheel.querySelector('.tt2-wheel-announcement');
    const labels = buttons.map(b => (source.label ? source.label(b) : b.textContent).replace(/\s+/g,' ').trim());
    const panelIds = buttons.map(b => b.getAttribute('aria-controls'));
    const widths = [];
    let centers = [], cycle = 1, pos = 0, viewportWidth = 393;
    let raf = 0, running = false, pointer = null, timer = 0;
    let current = Math.max(0,buttons.findIndex(b=>b.getAttribute('aria-selected')==='true'));
    let selectedPreview = -1;
    const replicas = [];
    // Use a hidden measurement strip for ORIGINAL label text in the selected font.
    const gauge = document.createElement('div');
    gauge.className='tt2-wheel-gauge';gauge.setAttribute('aria-hidden','true');
    wheel.append(gauge);
    function measure() {
      gauge.textContent='';
      widths.length=0;
      for(const label of labels){
        const sample = document.createElement('span'); sample.textContent=label;gauge.append(sample);
        widths.push(Math.ceil(sample.getBoundingClientRect().width)+18);
      }
      centers = [];
      let x=0;
      widths.forEach(w=>{centers.push(x+w/2);x+=w+GAP});
      cycle=x;
    }
    function nearest(offset=pos) {
      // A local search covers the seamless boundary between final and first.
      let best={distance:Infinity,index:0,at:centers[0]};
      const avg=cycle/labels.length;
      const approx=Math.round((offset-centers[0])/Math.max(1,avg));
      const around=clamp(Math.round((offset-centers[0])/Math.max(1,cycle)), -3,3);
      for(let k=around-2;k<=around+2;k++) for(let i=0;i<labels.length;i++){
        const at=centers[i]+k*cycle, delta=Math.abs(at-offset);
        if(delta<best.distance)best={distance:delta,index:i,at};
      }
      return best;
    }
    function wrap() {
      // Keep numeric position inside the central five visual repetitions.
      if (pos>cycle*1.4)pos-=Math.floor(pos/cycle)*cycle;
      else if(pos<cycle*-.4)pos+=Math.ceil(-pos/cycle)*cycle;
    }
    function update() {
      if (!wheel.isConnected || cycle<=0) return;
      wrap();
      track.style.transform=`translate3d(${(viewportWidth/2-pos).toFixed(3)}px,0,0)`;
      const candidate=nearest().index;
      if(candidate!==selectedPreview){
        selectedPreview=candidate;
        for(const n of replicas)n.el.classList.toggle('tt2-wheel-active',n.index===candidate);
      }
    }
    function layout(keepIndex=true) {
      const width=wheel.getBoundingClientRect().width;
      viewportWidth=Math.max(240,width||document.documentElement.clientWidth||393);
      measure();
      track.textContent='';replicas.length=0;
      for(let r=-4;r<=4;r++) for(let i=0;i<labels.length;i++){
        const el=document.createElement('span');
        el.className='tt2-wheel-item'; el.textContent=labels[i];
        el.style.width=`${widths[i]}px`;
        el.style.left=`${centers[i]+r*cycle-widths[i]/2}px`;
        el.dataset.wheelIndex=String(i);
        track.append(el);
        replicas.push({el,index:i});
      }
      if(keepIndex)pos=centers[current];
      selectedPreview=-1;update();
      wheel.setAttribute('aria-valuetext',labels[current]);
      announcer.textContent=labels[current];
    }
    function stop(){cancelAnimationFrame(raf);raf=0;running=false;clearTimeout(timer)}
    function syncTo(index) {
      current=index;
      // The original tab button click updates selected state, data panel,
      // scrolling, venue count, all related source-side listeners.
      const live=liveButtons()[index]||buttons[index];
      if(live.getAttribute('aria-selected')!=='true') live.click();
      announcer.textContent=labels[index];
      wheel.setAttribute('aria-valuetext',labels[index]);
      wheel.dataset.selectedLabel=labels[index];
    }
    function snapTo(target,commit=true) {
      stop();
      const origin=pos, destination=target.at;
      const duration=reduce.matches?0:clamp(270+Math.abs(destination-origin)*0.52,270,470);
      if(!duration){pos=destination;update();if(commit)syncTo(target.index);return}
      const start=now();running=true;
      const tick=t=>{
        const k=clamp((t-start)/duration,0,1);
        const easing=1-Math.pow(1-k,3);
        pos=origin+(destination-origin)*easing;
        update();
        if(k<1)raf=requestAnimationFrame(tick);
        else {pos=destination;update();running=false;raf=0;if(commit)syncTo(target.index)}
      };
      raf=requestAnimationFrame(tick);
    }
    function spin(velocityPxMs) {
      stop();
      if(reduce.matches){snapTo(nearest());return}
      let velocity=clamp(velocityPxMs,-3.7,3.7);
      if(Math.abs(velocity)<.045){snapTo(nearest());return}
      let last=now(), count=0;
      running=true;
      function tick(t){
        const dt=clamp(t-last,1,40);last=t;
        velocity*=Math.exp(-dt/265); // friction, akin to a spinning number wheel
        pos+=velocity*dt;
        update();
        if(Math.abs(velocity)>.034&&count++<240)raf=requestAnimationFrame(tick);
        else {running=false;raf=0;snapTo(nearest())}
      }
      raf=requestAnimationFrame(tick);
    }
    function handleDown(e){
      if(e.button!==undefined&&e.button!==0)return;
      stop();
      pointer={id:e.pointerId,lastX:e.clientX,lastT:now(),startX:e.clientX,moved:false,velocity:0};
      if(e.pointerType==='mouse')wheel.setPointerCapture(e.pointerId);
    }
    function handleMove(e){
      if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.lastX;
      if(Math.abs(e.clientX-pointer.startX)>5) pointer.moved=true;
      if(pointer.moved){
        if(!wheel.hasPointerCapture(e.pointerId))wheel.setPointerCapture(e.pointerId);
        const dt=Math.max(4,now()-pointer.lastT);
        const v=-dx/dt;
        pointer.velocity=pointer.velocity*.6+v*.4;
        pos-=dx;update();
        e.preventDefault();
      }
      pointer.lastX=e.clientX;pointer.lastT=now();
    }
    function handleUp(e){
      if(!pointer||pointer.id!==e.pointerId)return;
      const previous=pointer;pointer=null;
      if(wheel.hasPointerCapture(e.pointerId))wheel.releasePointerCapture(e.pointerId);
      if(previous.moved){spin(previous.velocity);return}
      // Clicking a visible neighbour is equivalent to turning it to centre.
      const relativeX=e.clientX-wheel.getBoundingClientRect().left;
      const hit=nearest(pos+relativeX-viewportWidth/2);
      snapTo(hit);
    }
    wheel.addEventListener('pointerdown',handleDown);
    wheel.addEventListener('pointermove',handleMove);
    wheel.addEventListener('pointerup',handleUp);
    wheel.addEventListener('pointercancel',()=>{pointer=null;snapTo(nearest())});
    // Prevent stray tap-up clicks from reaching any old chapter gestures.
    wheel.addEventListener('click',e=>e.stopPropagation());
    wheel.addEventListener('wheel',e=>{
      const dx=Math.abs(e.deltaX)>.1?e.deltaX:(e.shiftKey?e.deltaY:0);
      if(!dx)return;
      e.preventDefault();stop();pos+=dx;update();
      timer=setTimeout(()=>snapTo(nearest()),95);
    },{passive:false});
    wheel.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();
      const idx=e.key==='Home'?0:e.key==='End'?labels.length-1:modulo(current+(e.key==='ArrowLeft'?-1:1),labels.length);
      let best={distance:Infinity,index:idx,at:centers[idx]};
      for(let k=-2;k<=2;k++){
        const at=centers[idx]+k*cycle;
        const d=Math.abs(at-pos);
        if(d<best.distance)best={distance:d,index:idx,at};
      }
      snapTo(best);
    });
    // Keep wheel in sync if a deep link, earlier tab listeners or keyboard
    // changes the original selected tab outside this wheel.
    const observer = new MutationObserver(muts=>{
      if(!muts.some(m=>m.target.getAttribute('aria-selected')==='true'))return;
      const idx=buttons.findIndex(b=>b.getAttribute('aria-selected')==='true');
      if(idx<0||idx===current)return;
      stop();current=idx;pos=centers[idx];update();announcer.textContent=labels[idx];
    });
    buttons.forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['aria-selected']}));
    const resize=new ResizeObserver(entries=>{
      if(!entries[0].contentRect.width)return;
      if(Math.abs(viewportWidth-entries[0].contentRect.width)>1) {stop();layout()}
    });resize.observe(wheel);
    if (!source.el) instances.push({source,root,wheel,buttons,layout,snapTo,nearest,get selected(){return current}});
    layout();
  }
  function start(){ SOURCES.filter(s=>!s.lazy).forEach(mount); }
  window.tt2WheelInstances=instances; // design QA only; no data writes
  window.tt2WheelMount=view=>{const s=SOURCES.find(x=>x.view===view);if(s)mount(s);};
  // v2.0.112: any strip of buttons → the wheel (商圏 detail). {button: ':scope > selector', label: b => text}
  window.tt2WheelOn=(el,opt={})=>{if(el)mount({view:opt.view||'',el,button:opt.button,label:opt.label});return el?.previousElementSibling?.classList.contains('tt2-wheel')?el.previousElementSibling:null;};
  if(window.tabiDirectoryReady)Promise.resolve(window.tabiDirectoryReady).then(start);
  else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
