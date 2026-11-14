/* TABI TAIPEI v2.0.101 — js/tt2-daytrip.js: 遠出: route stage and the destination page
   Collected in 2.0.101 (cleanup phase 3) from js/figma-daytrip-route-v225.js, js/figma-daytrip-v269.js,
   in that order; each part is still its own closed function. */

/* ════════ from js/figma-daytrip-route-v225.js ════════ */
/* TABI TAIPEI 2.0.25 — Figma 6-1-1 / 6-1-2 shared route system.
 * Presentation reads the original four destination panels. Their timetable,
 * operator, fare, stop and original data are not modified. Cross-destination
 * taxi routes are displayed from the opposite panel, where they are already
 * stored in the correct direction.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const section = document.querySelector('#guide .sights-day-trips');
  if (!section) return;
  const destinations = [...section.querySelectorAll('.daytrip-destination-buttons > button')];
  const panels = [1,2,3,4].map(i => document.getElementById(`daytrip-destination-panel-${i}`));
  if (destinations.length !== 4 || panels.some(p => !p)) return;
  const srcTabs = n => [...panels[n].querySelectorAll(':scope > .destination-body > .tab > .daytrip-transport > .daytrip-transport-tab')];
  const srcPages = n => [...panels[n].querySelectorAll(':scope > .destination-body > .tab > .tab-panels > .tab-panel')];
  const jiufenPages = srcPages(0), shifenPages = srcPages(1);
  if (jiufenPages.length !== 3 || shifenPages.length !== 2) return;
  const txt = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const routeNodes = page => {
    const routes = [...page.querySelectorAll('.daytrip-bus-route')];
    return routes.length ? routes : [page.querySelector('.route-panel')].filter(Boolean);
  };
  const D = (panel, page, i, label, type, reverse=false) => ({panel,page,i,label,type,reverse,
    get route(){return routeNodes(page)[i]},
  });
  const configs = [
    [
      {label:'直通バス', options:[D(panels[0],jiufenPages[0],0,'台北客運 965番','direct'),D(panels[0],jiufenPages[0],1,'基隆客運 1062番','direct')]},
      {label:'台鉄 ＋ 乗換', options:[D(panels[0],jiufenPages[1],0,'路線バス','railbus'),D(panels[0],jiufenPages[1],1,'タクシー','railtaxi')]},
      {label:'九份 → 十分', options:[D(panels[1],shifenPages[1],0,'タクシー','taxi',true)]}
    ],
    [
      {label:'台鉄',options:[D(panels[1],shifenPages[0],0,'台鉄','rail')]},
      {label:'十分 → 九份',options:[D(panels[0],jiufenPages[2],0,'タクシー','taxi',true)]}
    ],
    [{label:'台鉄',options:[D(panels[2],panels[2],0,'台鉄','rail')]}],
    // v2.0.41: 野柳 shows 國光客運 1815番 only (基隆客運 790番 removed by the user; its data stays in the panel).
    [{label:'路線バス',options:[D(panels[3],panels[3],0,'國光客運 1815番','bus')]}]
  ];
  // v2.0.41: every place name opens its own map position (checked by the user, 遠出_地点リンク一覧.csv).
  // Key: destination-mode-option-stop (stop 0 = 出発, last = 到着, between = 乗換). sub = the grey line under the name.
  const PLACES = {
    '0-0-0-0':{name:"捷運西門站",sub:"バス停「捷運西門站」",url:"https://www.google.com/maps/place/%E6%8D%B7%E9%81%8B%E8%A5%BF%E9%96%80%E7%AB%99/@25.0399791,121.5077809,21z/data=!4m18!1m11!4m10!1m6!1m2!1s0x3442a909804e4613:0x82ad6129e5d1e9b7!2z6KW_6ZaAIDEwMOWPsOeBo-iHuuWMl-W4guS4reato-WNgOilv-mWgOmHjOWvtuaFtui3rzMyLTHomZ8!2m2!1d121.5082995!2d25.0421884!1m2!1m1!2z5YWs6LuK56uZ!3m5!1s0x3442a909fb9c10af:0xf2ec706438a2fd45!8m2!3d25.040033!4d121.507934!16s%2Fg%2F11hzwbvhsb?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 台北客運 965番 出発
    '0-0-0-1':{name:"九份",sub:"「九份老街」で降車",url:"https://www.google.com/maps/place/%E4%B9%9D%E4%BB%BD%E8%80%81%E8%A1%97/@25.1103418,121.8456348,21z/data=!4m6!3m5!1s0x345d451833cc9403:0x7c999c8da6bd4a23!8m2!3d25.110359!4d121.845726!16s%2Fg%2F11b62pdx0s?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 台北客運 965番 到着
    '0-0-1-0':{name:"捷運忠孝復興站",sub:"バス停「捷運忠孝復興站」",url:"https://www.google.com/maps/place/%E6%8D%B7%E9%81%8B%E5%BF%A0%E5%AD%9D%E5%BE%A9%E8%88%88%E7%AB%99/@25.040969,121.5432445,20.01z/data=!4m6!3m5!1s0x3442abd0b99c2483:0xe836455fbf5cf57b!8m2!3d25.04082!4d121.54357!16s%2Fg%2F1q67b4kwz?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 基隆客運 1062番 出発
    '0-0-1-1':{name:"九份",sub:"「九份老街」で降車",url:"https://www.google.com/maps/place/%E4%B9%9D%E4%BB%BD%E8%80%81%E8%A1%97/@25.1101818,121.8456363,19.88z/data=!4m6!3m5!1s0x345d451831f09705:0x15229b5cbec753c8!8m2!3d25.110385!4d121.845794!16s%2Fg%2F11b62sc359?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 基隆客運 1062番 到着
    '0-1-0-0':{name:"台北駅",sub:"松山駅などからも乗車可能",url:"https://www.google.com/maps/search/?api=1&query=%E8%87%BA%E5%8C%97%E8%BB%8A%E7%AB%99"}, // 九份 路線バス 出発
    '0-1-0-1':{name:"瑞芳駅",sub:"",url:"https://www.google.com/maps/search/?api=1&query=%E7%91%9E%E8%8A%B3%E8%BB%8A%E7%AB%99"}, // 九份 路線バス 乗換
    '0-1-0-2':{name:"九份",sub:"",url:"https://www.google.com/maps/place/%E4%B9%9D%E4%BB%BD%E8%80%81%E8%A1%97/@25.1101628,121.8454099,20.07z/data=!4m6!3m5!1s0x345d451833cc9403:0x7c999c8da6bd4a23!8m2!3d25.110359!4d121.845726!16s%2Fg%2F11b62pdx0s?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 路線バス 到着
    '0-1-1-0':{name:"台北駅",sub:"松山駅などからも乗車可能",url:"https://www.google.com/maps/search/?api=1&query=%E8%87%BA%E5%8C%97%E8%BB%8A%E7%AB%99"}, // 九份 タクシー 出発
    '0-1-1-1':{name:"瑞芳駅",sub:"",url:"https://www.google.com/maps/search/?api=1&query=%E7%91%9E%E8%8A%B3%E8%BB%8A%E7%AB%99"}, // 九份 タクシー 乗換
    '0-1-1-2':{name:"九份",sub:"",url:"https://www.google.com/maps/place/%E4%B9%9D%E4%BB%BD%E8%80%81%E8%A1%97/@25.1099082,121.8439875,17z/data=!4m6!3m5!1s0x345d4517fafb9471:0x5f15825aa6a4a7d2!8m2!3d25.109806!4d121.845223!16s%2Fg%2F155q3rqr?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 タクシー 到着
    '0-2-0-0':{name:"九份",sub:"",url:"https://www.google.com/maps/place/%E4%B9%9D%E4%BB%BD%E8%80%81%E8%A1%97/@25.1099082,121.8439875,17z/data=!4m6!3m5!1s0x345d4517fafb9471:0x5f15825aa6a4a7d2!8m2!3d25.109806!4d121.845223!16s%2Fg%2F155q3rqr?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 タクシー 出発
    '0-2-0-1':{name:"十分",sub:"",url:"https://www.google.com/maps/place/%E5%8D%81%E5%88%86%E8%80%81%E8%A1%97/@25.0441024,121.774609,16.47z/data=!4m6!3m5!1s0x345d512fffffffff:0xf6dec4403a7273be!8m2!3d25.0423966!4d121.7763662!16s%2Fg%2F12m9dvn8b?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 九份 タクシー 到着
    '1-0-0-0':{name:"台北駅",sub:"松山駅などからも乗車可能",url:"https://www.google.com/maps/search/?api=1&query=%E8%87%BA%E5%8C%97%E8%BB%8A%E7%AB%99"}, // 十分 台鉄 出発
    '1-0-0-1':{name:"瑞芳駅",sub:"",url:"https://www.google.com/maps/search/?api=1&query=%E7%91%9E%E8%8A%B3%E8%BB%8A%E7%AB%99"}, // 十分 台鉄 乗換
    '1-0-0-2':{name:"十分",sub:"",url:"https://www.google.com/maps/search/?api=1&query=%E5%8D%81%E5%88%86%E8%BB%8A%E7%AB%99"}, // 十分 台鉄 到着
    '1-1-0-0':{name:"十分老街",sub:"",url:"https://www.google.com/maps/place/%E5%8D%81%E5%88%86%E8%80%81%E8%A1%97/@25.0441024,121.774609,16.47z/data=!4m6!3m5!1s0x345d512fffffffff:0xf6dec4403a7273be!8m2!3d25.0423966!4d121.7763662!16s%2Fg%2F12m9dvn8b?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 十分 タクシー 出発
    '1-1-0-1':{name:"九份老街",sub:"",url:"https://www.google.com/maps/place/%E4%B9%9D%E4%BB%BD%E8%80%81%E8%A1%97/@25.1099082,121.8439875,17z/data=!4m6!3m5!1s0x345d4517fafb9471:0x5f15825aa6a4a7d2!8m2!3d25.109806!4d121.845223!16s%2Fg%2F155q3rqr?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 十分 タクシー 到着
    '2-0-0-0':{name:"台北駅",sub:"松山駅などからも乗車可能",url:"https://www.google.com/maps/search/?api=1&query=%E8%87%BA%E5%8C%97%E8%BB%8A%E7%AB%99"}, // 基隆 台鉄 出発
    '2-0-0-1':{name:"基隆",sub:"",url:"https://www.google.com/maps/search/?api=1&query=%E5%9F%BA%E9%9A%86%E8%BB%8A%E7%AB%99"}, // 基隆 台鉄 到着
    '3-0-0-0':{name:"台北駅",sub:"",url:"https://www.google.com/maps/place/%E8%87%BA%E5%8C%97%E8%BB%8A%E7%AB%99(%E6%9D%B1%E4%B8%89%E9%96%80)/@25.0474228,121.5178439,19.98z/data=!3m1!5s0x346811399ede8187:0xaaa69628b941c253!4m6!3m5!1s0x3442a97271c0a12b:0xaa9a33e4f2db8429!8m2!3d25.04731!4d121.51798!16s%2Fg%2F11ww89nc2x?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 野柳 國光客運 1815番 出発
    '3-0-0-1':{name:"野柳",sub:"「野柳」で降車",url:"https://www.google.com/maps/place/%E9%87%8E%E6%9F%B3/@25.203512,121.6850601,21z/data=!4m6!3m5!1s0x345d4c7a09bde93d:0xf61f419b3f068b75!8m2!3d25.203657!4d121.685241!16s%2Fg%2F1tt1dzhn?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D"}, // 野柳 國光客運 1815番 到着
  };
  const names = ['九份','十分','基隆','野柳'];
  const nav = document.createElement('nav');
  nav.className='tt221-mode-nav';nav.setAttribute('aria-label','移動方法');
  const stage = document.createElement('section');
  stage.className='tt221-stage';stage.setAttribute('aria-label','交通経路案内');
  stage.innerHTML=`<div class="tt221-pick-row">
     <div class="tt221-pick-wrap"><span class="tt221-pick-tag" hidden>乗換</span>
       <button type="button" class="tt221-pick-button" aria-haspopup="listbox" aria-expanded="false"><span class="tt221-pick-label"></span><span class="tt221-pick-chevron" aria-hidden="true"></span></button>
       <div class="tt221-pick-menu" role="listbox" aria-label="利用路線" hidden></div>
     </div>
     <a class="tt221-map-link" href="#" target="_blank" rel="noopener noreferrer">経路を見る</a>
   </div>
   <div class="tt221-glow" aria-hidden="true"></div>
   <div class="tt221-route">
     <div class="tt221-route-meta"><span class="tt221-fare"></span><strong class="tt221-duration"></strong><span class="tt221-meta-note"></span></div>
     <div class="tt221-track" role="group" aria-label="経路"></div>
   </div>
   <p class="tt221-warning"></p>`;
  const firstRow = section.querySelector('.daytrip-destination-buttons');
  firstRow.after(nav,stage);
  section.classList.add('tt221-ready');
  const pickWrap=stage.querySelector('.tt221-pick-wrap'), pick=stage.querySelector('.tt221-pick-button'),
    pickTag=stage.querySelector('.tt221-pick-tag'), pickLabel=stage.querySelector('.tt221-pick-label'),
    pickMenu=stage.querySelector('.tt221-pick-menu'), fare=stage.querySelector('.tt221-fare'),
    duration=stage.querySelector('.tt221-duration'), metaNote=stage.querySelector('.tt221-meta-note'),
    track=stage.querySelector('.tt221-track'), warning=stage.querySelector('.tt221-warning'),
    mapLink=stage.querySelector('.tt221-map-link');
  let dest=0, mode=0;
  const picks = configs.map(modes=>modes.map(()=>0));
  const inside = e => pickWrap.contains(e.target);
  const closeMenu = () => {pickMenu.hidden=true;pick.setAttribute('aria-expanded','false');};
  const isDayTrips = () => root.dataset.ttView === 'day-trips';
  function changeDestination(i) {
    if (!isDayTrips())return;
    dest=i;mode=0;
    stage.setAttribute('aria-label',`${names[i]}の交通経路案内`);
    renderModes();render();
  }
  function renderModes(){
    nav.replaceChildren();
    nav.style.setProperty('--tt221-columns',String(configs[dest].length));
    configs[dest].forEach((c,i)=>{
      const b=document.createElement('button');b.type='button';b.className='tt221-mode';b.role='tab';
      b.setAttribute('aria-selected',String(i===mode));b.textContent=c.label;
      b.addEventListener('click',()=>{if(mode===i)return;mode=i;closeMenu();renderModes();render();});
      nav.append(b);
    });
  }
  function sourceMetadata(option) {
    const head=option.route?.closest('.route-panel')?.querySelector('.rail-title') || option.page.querySelector('.rail-title');
    const entries=[...head?.querySelectorAll('.daytrip-route-head-meta')||[]];
    const selected=entries.find(e=>option.route?.dataset.route&&e.dataset.route===option.route.dataset.route)
      || entries[option.i] || entries.find(e=>!e.hidden) || null;
    const labels=[...selected?.querySelectorAll(':scope > span')||[]].map(txt).filter(Boolean);
    return labels;
  }
  function getWarnings(option) {
    const page=option.page;
    const notes=[...page.querySelectorAll('.daytrip-note--important, .footnote, .daytrip-note, .daytrip-canonical-note')]
      .map(txt).filter(Boolean);
    if(dest===0 && mode!==2) return '夜は復路のバス・タクシーが混雑します。\n帰りの交通手段も事前に確認。';
    if(dest===0 && mode===2) return '十分と九份を巡る際は乗車場所と運賃を事前に確認。';
    if(dest===1 && mode===1) return 'タクシーの乗車場所・運賃を事前に確認。';
    if(dest===1) return '平渓線は約1時間に1本。\n時刻と復路の交通手段を事前に確認。';
    if(dest===2) return '基隆駅から港周辺へは徒歩でアクセスできます。\n運賃は乗車券・列車により異なります。';
    if(dest===3) return '運行状況と復路の時刻を事前に確認。'; // v2.0.41: one route only
    return notes[0]||'';
  }
  function segmentKind(leg, option, n) {
    if(option.type==='railtaxi') return n===0?'rail':'taxi';
    if(option.type==='railbus') return n===0?'rail':'bus';
    if(option.type==='rail') return 'rail';
    if(option.type==='taxi') return 'taxi';
    if(option.type==='direct'||option.type==='bus') return 'bus';
    const raw=txt(leg);
    if(/徒歩/.test(raw)) return 'walk';
    if(/タクシー/.test(raw)) return 'taxi';
    if(/台鉄|台鐵|平渓線/.test(raw))return 'rail';
    return 'bus';
  }
  function stationInfo(stop, index, total, option) {
    const primary=txt(stop.querySelector('.stop-name'))||txt(stop.querySelector('.stop-body strong'));
    const translated=txt(stop.querySelector('.airsel-station-ja'));
    let name=translated||primary;
    let sub='';
    if(dest===0 && mode===0 && index===0){
      if(picks[dest][mode]===0){name='捷運西門站';sub='バス停「捷運西門站」';}
      else{name='捷運忠孝復興站';sub='MRT 忠孝復興駅付近';}
    } else if(index===0 && /台北駅・松山駅/.test(name)){
      name='台北駅';sub='松山駅などからも乗車可能';
    } else if(index===total-1){
      if(dest===0 && mode!==2) name='九份';
      if(dest===1 && mode===0) name='十分';
      if(dest===2) name='基隆';
      if(dest===3) name='野柳';
    }
    if(index!==0 && index!==total-1){
      // The transfer is expressed ONLY by the concentric node and white
      // 「乗換」 badge; no extra transport-description line is rendered.
      if(/瑞芳/.test(name))name='瑞芳駅';
      sub='';
    }
    return {name,sub};
  }
  function legInfo(leg,option,i) {
    const line=txt(leg.querySelector('.line-name'));
    const company=txt(leg.querySelector('.station-count'));
    const dir=txt(leg.querySelector('.direction'));
    const note=txt(leg.querySelector('.direction-note'));
    let head=line;
    if(option.type==='direct') head=(option.i===0?'台北客運':'基隆客運')+`　${option.i===0?'965':'1062'}番`;
    else if(option.type==='railbus' && i===1)head='路線バス　788番・827番';
    else if(option.type==='bus')head=(option.i===0?'國光客運　1815番':'基隆客運　790番');
    else if(line==='台鉄')head='台鉄';
    const kind=segmentKind(leg,option,i);
    let detail=note;
    if(!detail && kind==='rail') detail='瑞芳に停まる列車に乗車';
    if(!detail && kind==='bus' && option.type==='railbus')detail='路線バスに乗車';
    if(!detail && kind==='taxi')detail='乗車場所・料金を事前に確認';
    return {head,dir,detail,kind};
  }
  // v2.0.42: 「経路を見る」 runs from the start's map position to the end's (the !3d/!4d
  // coordinates in the PLACES links; a link without them gives its search word instead),
  // by public transport, or by car for the taxi routes. 台鉄＋タクシー stops at the transfer
  // station: the train part is the one Google can plan; the taxi ride is on the spot.
  function placeAt(i) { return PLACES[`${dest}-${mode}-${picks[dest][mode]}-${i}`]; }
  function endpoint(place, fallback) {
    const url = place?.url || '';
    const at = [...url.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)].pop();
    if (at) return at[1] + ',' + at[2];
    try { const q = new URL(url).searchParams.get('query'); if (q) return q; } catch (_) {}
    return fallback;
  }
  function routeURL(stops,option) {
    const last = option.type==='railtaxi' ? 1 : stops.length-1;
    const start = endpoint(placeAt(0), stationInfo(stops[0],0,stops.length,option).name);
    const end = endpoint(placeAt(last), stationInfo(stops[last],last,stops.length,option).name);
    return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(start)
      +'&destination='+encodeURIComponent(end)+'&travelmode='+(option.type==='taxi'?'driving':'transit');
  }
  function render() {
    const options=configs[dest][mode].options;
    picks[dest][mode]=Math.min(picks[dest][mode],options.length-1);
    const opt=options[picks[dest][mode]];
    const timeline=opt.route?.querySelector('.timeline');
    if(!timeline)return;
    const stops=[...timeline.querySelectorAll(':scope > .timeline-stop')], legs=[...timeline.querySelectorAll(':scope > .timeline-leg')];
    if(stops.length<2)return;
    stage.dataset.tt221Destination=String(dest);
    stage.dataset.tt221Mode=String(mode);
    stage.dataset.tt221Stops=String(stops.length);
    stage.dataset.tt221Kind=opt.type;
    const multi=options.length>1;
    pickWrap.classList.toggle('tt221-single',!multi);
    pickLabel.textContent=opt.label;
    pick.disabled=!multi;
    pick.removeAttribute('aria-haspopup');
    if(multi)pick.setAttribute('aria-haspopup','listbox');
    pickTag.hidden = !(opt.type==='railbus'||opt.type==='railtaxi');
    pickMenu.replaceChildren();closeMenu();
    if(multi) options.forEach((item,i)=>{
      const b=document.createElement('button');b.type='button';b.role='option';b.className='tt221-menu-item';
      b.setAttribute('aria-selected',String(i===picks[dest][mode]));b.textContent=item.label;
      b.addEventListener('click',()=>{picks[dest][mode]=i;render();pick.focus();});pickMenu.append(b);
    });
    const meta=sourceMetadata(opt);
    const time=meta.find(v=>/分|時間/.test(v))||'';
    const price=meta.find(v=>/NT\$|料金|運賃|メーター/.test(v))||'';
    fare.textContent=price;
    duration.textContent=time;
    metaNote.textContent=price.includes('タクシー')||opt.type==='taxi' ? '※タクシーは概算・事前確認' : '※列車・運行状況により';
    if(dest===0 && mode===0 && picks[0][0]===0){fare.textContent='片道 NT$90';}
    warning.textContent=getWarnings(opt);
    mapLink.href=routeURL(stops,opt);
    track.setAttribute('aria-label',timeline.getAttribute('aria-label')||`${names[dest]}への経路`);
    const parts=[];
    for(let i=0;i<legs.length;i++) {
      const kind=segmentKind(legs[i],opt,i);
      const pct0=(i/(stops.length-1))*100, pct1=((i+1)/(stops.length-1))*100;
      // Preserve the authored 5px clearance on both sides of every dot.
      // The 18px transfer node is centred on the same axis as the prior 22px one.
      const startGap = i===0 ? 16 : 20;
      const endGap = i+1===stops.length-1 ? 4 : 8;
      parts.push(`<span aria-hidden="true" class="tt221-line tt221-line--${kind}" style="top:calc(${pct0}% + ${startGap}px);height:calc(${pct1-pct0}% - ${startGap+endGap}px)"></span>`);
    }
    stops.forEach((stop,i)=>{
      const st=stationInfo(stop,i,stops.length,opt);
      const place=PLACES[`${dest}-${mode}-${picks[dest][mode]}-${i}`];
      if(place) st.sub=place.sub;
      const nameHtml=place
        ? `<a class="tt221-place" href="${safe(place.url)}" target="_blank" rel="noopener noreferrer" aria-label="${safe(st.name)}の場所を地図で見る">${safe(st.name)}</a>`
        : safe(st.name);
      const dotKind=i===0?'start':i===stops.length-1?'end':'transfer';
      const dotTop=`${(i/(stops.length-1))*100}%`;
      const textMark=dotKind==='start'?'出発':dotKind==='end'?'到着':'乗換';
      parts.push(`<div class="tt221-stop tt221-stop--${dotKind}" style="top:${dotTop}">
         <span class="tt221-status">${textMark}</span><span class="tt221-dot" aria-hidden="true"></span>
         <div class="tt221-station"><strong>${nameHtml}</strong>${st.sub?`<span class="tt221-station-sub">${safe(st.sub)}</span>`:''}</div></div>`);
    });
    legs.forEach((leg,i)=>{
      const l=legInfo(leg,opt,i);
      const top=stops.length===2?'calc(50% - 10px)':`calc(${i/(stops.length-1)*100}% + 58px)`;
      const headHtml = l.kind==='rail' && /台鉄|台鐵/.test(l.head)
        ? `<span class="tt221-rail-row"><img class="tt221-rail-logo" src="assets/icons/tra-logo-white-v225.svg" alt="" aria-hidden="true"><span class="tt221-rail-label">台鉄</span></span>`
        : `<span class="tt221-leg-small">${safe(l.head)}</span>`;
      parts.push(`<div class="tt221-leg" style="top:${top};--tt221-leg-base:${i/(stops.length-1)*100}%">${headHtml}
         <strong class="tt221-leg-direction">${safe(l.dir)}</strong>${l.detail?`<span class="tt221-leg-note">${safe(l.detail)}</span>`:''}</div>`);
    });
    track.innerHTML=parts.join('');
  }
  pick.addEventListener('click',()=>{
    if(pick.disabled)return;
    const open=pickMenu.hidden;
    pickMenu.hidden=!open;pick.setAttribute('aria-expanded',String(open));
    if(open)pickMenu.querySelector('[aria-selected="true"]')?.focus();
  });
  document.addEventListener('pointerdown', e=>{if(!inside(e))closeMenu();});
  stage.addEventListener('keydown', e=>{if(e.key==='Escape' && !pickMenu.hidden){closeMenu();pick.focus();}});
  destinations.forEach((b,i)=>{
    b.querySelector('.daytrip-destination-button-name')?.replaceChildren(document.createTextNode(names[i]));
    // Once selected, another tap is not meant to collapse the entire screen.
    b.addEventListener('click',e=>{
      if(isDayTrips() && i===dest && b.getAttribute('aria-expanded')==='true'){
        e.preventDefault();e.stopImmediatePropagation();
      }
    },true);
    b.addEventListener('click',()=>requestAnimationFrame(()=>changeDestination(i)));
  });
  function sync(){
    if(!isDayTrips())return;
    let expanded=destinations.findIndex(b=>b.getAttribute('aria-expanded')==='true');
    if(expanded<0){destinations[0].click();expanded=0;}
    changeDestination(expanded);
    document.getElementById('guide')?.scrollTo({top:0,left:0,behavior:'instant'});
  }
  // v2.0.69: the 遠出 page (js/figma-daytrip-v269.js) reads each route from here, with the same
  // names, places, fares, notes and 「経路を見る」 link as the route stage above. Read only.
  window.tabiDaytrip = {
    describe(d, m, o) {
      const keep = [dest, mode, picks[d]?.[m]];
      if (!configs[d]?.[m]?.options[o]) return null;
      dest = d; mode = m; picks[d][m] = o;
      try {
        const opt = configs[d][m].options[o];
        const timeline = opt.route?.querySelector('.timeline');
        if (!timeline) return null;
        const stops = [...timeline.querySelectorAll(':scope > .timeline-stop')];
        const legs = [...timeline.querySelectorAll(':scope > .timeline-leg')];
        const meta = sourceMetadata(opt);
        let price = meta.find(v => /NT\$|料金|運賃|メーター/.test(v)) || '';
        if (d === 0 && m === 0 && o === 0) price = '片道 NT$90';
        return {
          label: opt.label, type: opt.type, price,
          time: meta.find(v => /分|時間/.test(v)) || '',
          stops: stops.map((stop, i) => {
            const st = stationInfo(stop, i, stops.length, opt), place = PLACES[`${d}-${m}-${o}-${i}`];
            return {name: st.name, sub: place ? place.sub : st.sub, url: place?.url || ''};
          }),
          legs: legs.map((leg, i) => legInfo(leg, opt, i)),
          mapUrl: routeURL(stops, opt),
          warning: getWarnings(opt),
        };
      } finally { dest = keep[0]; mode = keep[1]; picks[d][m] = keep[2]; }
    },
  };
  document.addEventListener('tt:viewchange',()=>requestAnimationFrame(sync));
  if(isDayTrips())sync();else {renderModes();render();}
})();

/* ════════ from js/figma-daytrip-v269.js ════════ */
/* TABI TAIPEI v2.0.69 — 遠出, Figma 「遠出 試作 D-4（写真＋紹介が主）」 九份 / 十分 / 基隆 / 野柳.
 * Under the destination tabs, one scrolling page per destination: the photo fading into the page
 * with the place name over its bottom, 見どころ / 食べ歩き as bubbles (十分 also its festival),
 * then 行き方: one row per way to go; a tap opens a small horizontal route and 「経路を見る」
 * (Google Maps). Every route detail (stops, fares, times, notes, map links) comes from
 * js/figma-daytrip-route-v225.js (window.tabiDaytrip), whose route stage stays in the page, hidden.
 * The intro words are the site's own (index.html taglines and 見どころ, data/sights.json,
 * food/nearby.json, data/events.js) as laid out by the user in Figma. */
(() => {
  'use strict';
  const section = document.querySelector('#guide .sights-day-trips');
  const api = window.tabiDaytrip;
  if (!section || !api) return;
  const destinations = [...section.querySelectorAll('.daytrip-destination-buttons > button')];
  if (destinations.length !== 4) return;

  // [mode, option] of the route in js/figma-daytrip-route-v225.js, and the row title
  const PAGES = [
    {ro: 'JIUFEN', name: '九份', photo: 'jiufen', tagline: '赤い提灯が灯る、山あいのレトロな街',
     sections: [{label: '見どころ', bubbles: ['赤い提灯の街並み', '九份水心月茶坊']},
                {label: '食べ歩き', bubbles: ['阿蘭草仔粿', '阿柑姨芋圓', '安迪藥燉排骨', 'hima cafe']}],
     ways: [{label: '台北市内から', rows: [[0, 0, '直通バス 965番'], [0, 1, '直通バス 1062番'], [1, 0, '台鉄 ＋ 路線バス'], [1, 1, '台鉄 ＋ タクシー']]},
            {label: '九份から十分へ', rows: [[2, 0, 'タクシー']]}]},
    {ro: 'SHIFEN', name: '十分', photo: 'shifen', tagline: '願いを込めて、天燈を空へ',
     sections: [{label: '見どころ', bubbles: ['ランタン上げ体験', '十分老街'],
                 event: {label: 'イベント・祭り', name: '平渓天燈祭 2027｜十分会場', sub: '2027.2.20 · 十分廣場'}},
                {label: '食べ歩き', bubbles: ['平溪街']}],
     ways: [{label: '台北市内から', rows: [[0, 0, '台鉄 ＋ 平渓線']]},
            {label: '十分から九份へ', rows: [[1, 0, 'タクシー']]}]},
    {ro: 'KEELUNG', name: '基隆', photo: 'keelung', tagline: '港町の夜景とローカルグルメ',
     sections: [{label: '見どころ', bubbles: ['基隆塔', '海洋広場', '彩色屋', '阿根納造船廠遺構']},
                {label: '市場・ローカルグルメ', bubbles: ['仁愛市場', '基隆廟口夜市', '三角窗麵攤', '正老牌咖哩麵', '天天鮮排骨飯']}],
     ways: [{label: '台北市内から', rows: [[0, 0, '台鉄']]}]},
    {ro: 'YEHLIU', name: '野柳', photo: 'yehliu', tagline: '海がつくり出した、不思議な奇岩群',
     sections: [{label: '見どころ', bubbles: ['野柳地質公園', '女王頭']}],
     ways: [{label: '台北市内から', rows: [[0, 0, '國光客運 1815番']]}]},
  ];
  // v2.0.70: each bubble opens its place on Google Maps — the site's own links (index.html 見どころ,
  // data/sights.json, food/nearby.json; a 見どころ tag uses its place's link). 平溪街 has none: a search.
  const MAPS = {
    "赤い提灯の街並み": "https://maps.app.goo.gl/SFfyAkZZEXnvVTHz6",
    "九份水心月茶坊": "https://www.google.com/maps/place/%E6%B0%B4%E5%BF%83%E6%9C%88%E8%8C%B6%E5%9D%8A/@25.1099702,121.8408406,15.23z/data=!4m6!3m5!1s0x345d453e35f7e561:0x6dda51c9bd244c7e!8m2!3d25.1086616!4d121.8429576!16s%2Fg%2F1txflwt_?entry=ttu&g_ep=EgoyMDI2MTAyOC4wIKXMDSoASAFQAw%3D%3D",
    "阿蘭草仔粿": "https://www.google.com/maps/place/%E9%98%BF%E8%98%AD%E8%8D%89%E4%BB%94%E7%B2%BF/@25.1086255,121.8429626,17.71z/data=!4m6!3m5!1s0x345d4517fc03e1df:0xa3885d84203fd449!8m2!3d25.1087507!4d121.8443753!16s%2Fg%2F1tgxr84b?authuser=0&entry=ttu&g_ep=EgoyMDI2MTAyNy4wIKXMDSoASAFQAw%3D%3D",
    "阿柑姨芋圓": "https://www.google.com/maps/place/%E9%98%BF%E6%9F%91%E5%A7%A8%E8%8A%8B%E5%9C%93/@25.1076525,121.8436521,17z/data=!3m1!4b1!4m6!3m5!1s0x345d457dceb05b61:0xeb811525d65c479!8m2!3d25.1076525!4d121.8436521!16s%2Fg%2F11rs9g1sq4?entry=ttu&g_ep=EgoyMDI2MTEwOS4wIKXMDSoASAFQAw%3D%3D",   // v2.0.72: the user's link
    "安迪藥燉排骨": "https://www.google.com/maps/place/%E5%AE%89%E8%BF%AA%E8%97%A5%E7%87%89%E6%8E%92%E9%AA%A8/@25.109127,121.8444248,18z/data=!4m15!1m8!3m7!1s0x345d450011a9e74f:0x9894cadfcf468da8!2z5a6J6L-q6Jel54eJ5o6S6aqo!8m2!3d25.109127!4d121.8444248!10e5!16s%2Fg%2F11lcc_jyhw!3m5!1s0x345d450011a9e74f:0x9894cadfcf468da8!8m2!3d25.109127!4d121.8444248!16s%2Fg%2F11lcc_jyhw?authuser=0&entry=ttu&g_ep=EgoyMDI2MTAyNy4wIKXMDSoASAFQAw%3D%3D",
    "hima cafe": "https://www.google.com/maps/place/hima+cafe+%7C+%E6%9A%87+%E2%80%A2+%E5%92%96%E5%95%A1%EF%BC%88%E7%84%A1%E9%A0%90%E7%B4%84%E3%80%81%E5%85%AC%E4%BC%91%E8%AB%8B%E7%9C%8Big)/@25.105649,121.8448328,15.72z/data=!4m6!3m5!1s0x345d45a0390fbe2f:0x48c69d0512703b52!8m2!3d25.1094547!4d121.8435214!16s%2Fg%2F11vwhnb1lf?entry=ttu&g_ep=EgoyMDI2MTAyNy4wIKXMDSoASAFQAw%3D%3D",
    "ランタン上げ体験": "https://maps.app.goo.gl/g8Br214v6ceNJJLo8",
    "十分老街": "https://maps.app.goo.gl/ARU4F2Qn7DccN7uQA",
    "平溪街": "https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%8C%97%E5%B8%82%E5%B9%B3%E6%BA%AA%E5%8D%80%E5%B9%B3%E6%BA%AA%E8%A1%97",
    "基隆塔": "https://maps.app.goo.gl/xrD9bvDm6dvEMeMNA",
    "海洋広場": "https://maps.app.goo.gl/AZRq7bKhZWk7nMQF8",
    "彩色屋": "https://maps.app.goo.gl/fRKGYwE38P8zrp4fA",
    "阿根納造船廠遺構": "https://maps.app.goo.gl/kFdNnEFCKET48jWL6",
    "仁愛市場": "https://maps.app.goo.gl/kPmushGka9MxiL486",
    "基隆廟口夜市": "https://maps.app.goo.gl/FasxHrd7GgTPYDKT7",
    "三角窗麵攤": "https://maps.app.goo.gl/nr8dcsvUbo18Xf2bA",
    "正老牌咖哩麵": "https://maps.app.goo.gl/oE5pZWoZLLgPCpPc8",
    "天天鮮排骨飯": "https://maps.app.goo.gl/uyjr6oJqY4pa94jt9",
    "野柳地質公園": "https://maps.app.goo.gl/7e8YHHJxRTdjTUtk6",
    "女王頭": "https://maps.app.goo.gl/SezQNPeF6oapcS349",
  };
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  // 「片道 NT$90」 → 「NT$90」, 「台鉄 NT$73＋タクシー代」 → 「NT$73＋タクシー代」 (the row is already named)
  const price = p => String(p || '').replace(/^片道\s*/, '').replace(/^台鉄\s+(?=NT\$)/, '');
  const facts = r => [r.time, price(r.price)].filter(Boolean).join(' · ');

  const page = document.createElement('div');
  page.className = 'tt269-page';
  section.querySelector('.tt221-stage')?.after(page);
  section.classList.add('tt269-ready');

  // v2.0.73: each sentence is one unbroken piece, so an 11px note that needs two lines
  // breaks after 「。」, never inside a word.
  function sentences(text) {
    return (text.match(/[^。]+。?/g) || []).map(t => `<span class="tt269-sent">${safe(t)}</span>`).join('');
  }
  function sketch(r) {
    const n = r.stops.length, at = i => (i / (n - 1)) * 100;
    const segs = r.legs.map((l, i) => `<span class="tt269-seg tt269-seg--${l.kind}" style="left:${at(i)}%;width:${at(i + 1) - at(i)}%"><span class="tt269-seg-label">${safe(l.head.replace(/　/g, ' '))}</span></span>`);
    const stops = r.stops.map((s, i) => {
      const kind = i === 0 ? 'start' : i === n - 1 ? 'end' : 'xfer';
      const name = s.url ? `<a href="${safe(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${safe(s.name)}の場所を地図で見る">${safe(s.name)}</a>` : safe(s.name);
      return `<li class="tt269-stop tt269-stop--${kind}" style="left:${at(i)}%"><span class="tt269-dot" aria-hidden="true"></span>
        <span class="tt269-stop-name">${name}</span>${kind === 'xfer' ? '<span class="tt269-stop-sub">乗換</span>' : s.sub ? `<span class="tt269-stop-sub">${safe(s.sub)}</span>` : ''}</li>`;
    });
    const notes = r.legs.map(l => [l.head.replace(/　/g, ' '), l.dir, l.detail].filter(Boolean).join(' · '));
    return `<div class="tt269-sketch" role="img" aria-label="${safe(r.stops.map(s => s.name).join('→'))}">${segs.join('')}<ol>${stops.join('')}</ol></div>
      <ul class="tt269-notes">${notes.map(t => `<li>${safe(t)}</li>`).join('')}</ul>`;
  }

  function render(d) {
    const P = PAGES[d];
    if (!P) return;
    let first = null;
    const ways = P.ways.map(g => `<p class="tt269-group">${safe(g.label)}</p>` + g.rows.map(([m, o, title]) => {
      const r = api.describe(d, m, o);
      if (!r) return '';
      first ??= r;
      return `<div class="tt269-way">
        <button type="button" class="tt269-way-head" aria-expanded="false"><span class="tt269-way-name">${safe(title)}</span><span class="tt269-way-facts">${safe(facts(r))}</span><span class="tt269-chev" aria-hidden="true"></span></button>
        <a class="tt269-map" href="${safe(r.mapUrl)}" target="_blank" rel="noopener noreferrer">経路を見る</a>
        <div class="tt269-way-body" hidden><p class="tt269-way-sum">${safe(facts(r))}</p>${sketch(r)}</div></div>`;
    }).join('')).join('');
    const sections = P.sections.map(s => `<section class="tt269-sec"><h4 class="tt269-label">${safe(s.label)}</h4>
      <ul class="tt269-bubbles">${s.bubbles.map(b => MAPS[b] ? `<li><a href="${safe(MAPS[b])}" target="_blank" rel="noopener noreferrer" aria-label="${safe(b)}を地図で見る">${safe(b)}</a></li>` : `<li>${safe(b)}</li>`).join('')}</ul>
      ${s.event ? `<h4 class="tt269-label tt269-label--sub">${safe(s.event.label)}</h4><p class="tt269-event"><strong>${safe(s.event.name)}</strong><span>${safe(s.event.sub)}</span></p>` : ''}</section>`).join('');
    page.dataset.dest = String(d);
    page.innerHTML = `<div class="tt269-hero"><img src="assets/daytrips/photo/${P.photo}.jpg" alt="" decoding="async">
        <div class="tt269-hero-text"><span class="tt269-ro">${P.ro}</span><h3 class="tt269-place">${P.name}</h3><p class="tt269-tagline">${safe(P.tagline)}</p></div></div>
      ${sections}
      <section class="tt269-access"><h3 class="tt269-access-title">行き方</h3>${ways}</section>
      <p class="tt269-hint">タップで路線図と「経路を見る」（Google Maps）を表示</p>
      <p class="tt269-caution">${sentences((first?.warning || '').replace(/\n/g, ''))}</p>
      <p class="tt269-foot">${sentences('運賃・所要時間は目安です。時刻は「経路を見る」（Google Maps）で確認。')}</p>`;
    page.scrollTop = 0;
  }

  // one way open at a time
  page.addEventListener('click', e => {
    const head = e.target.closest('.tt269-way-head');
    if (!head) return;
    const way = head.parentElement, open = head.getAttribute('aria-expanded') !== 'true';
    for (const w of page.querySelectorAll('.tt269-way.is-open')) {
      w.classList.remove('is-open'); w.querySelector('.tt269-way-head').setAttribute('aria-expanded', 'false'); w.querySelector('.tt269-way-body').hidden = true;
    }
    if (!open) return;
    way.classList.add('is-open'); head.setAttribute('aria-expanded', 'true'); way.querySelector('.tt269-way-body').hidden = false;
    window.tt2Reveal?.(way, {settle: page}); // v2.0.102: an opened way rises into sight
  });

  const current = () => Math.max(0, destinations.findIndex(b => b.getAttribute('aria-expanded') === 'true'));
  destinations.forEach((b, i) => b.addEventListener('click', () => requestAnimationFrame(() => render(i))));
  document.addEventListener('tt:viewchange', () => requestAnimationFrame(() => requestAnimationFrame(() => render(current()))));
  render(current());
})();
