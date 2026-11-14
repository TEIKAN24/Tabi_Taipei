/* TABI TAIPEI 2.0 — Stage 01: Figma-native HTML for Title + Chapter 01.
 * Source content is read from original DOM, which remains unmodified for maps,
 * legacy links, data modules and event listeners. No full-frame screenshots. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('tt2-fidelity');
  const tabs = [...document.querySelectorAll('[data-tt-travel-tab]')];
  const source = document.querySelector('.page-body > details.travel-caution');
  const twac = document.querySelector('.page-body > details.travel-twac');
  const passes = document.querySelector('.page-body > details.travel-passes');
  const tabRow = document.querySelector('.tt-travel-tabs');
  if (!tabRow || !source || !twac || !passes) return;

  // Preserve the single existing source of the Japanese text; clone only its
  // readable paragraphs for the interactive, semantic presentation layer.
  function paragraphNodes(original) {
    const list = [...original.querySelectorAll(':scope > .indented p')];
    const items = [];
    for (const p of list) {
      const pieces = p.innerHTML.split(/<br\s*\/?>(?:\s*<br\s*\/?>)*/i);
      for (const html of pieces) {
        const t = document.createElement('p');
        t.className = 'tt2-note-copy';
        t.innerHTML = html.trim();
        if (t.textContent.trim()) items.push(t);
      }
    }
    return items;
  }
  const notes = document.createElement('section');
  notes.className = 'tt2-travel-pane tt2-notes-pane';
  notes.id = 'tt2-notes-pane';
  notes.setAttribute('aria-label','注意事項');
  const list = document.createElement('div');
  list.className = 'tt2-note-list';
  const originals = [...source.querySelectorAll('details.nested-accordion')];
  const figmaTitles = ['宿泊先のアメニティ事情','トイレの紙事情','水道水','コンセント・電圧','交通・移動','お金・支払い・交通系IC','レシートは宝くじ'];
  originals.forEach((original, index) => {
    const sourceLabel = original.querySelector('summary')?.textContent.trim() || '';
    const title = sourceLabel.includes(figmaTitles[index]) ? figmaTitles[index] : sourceLabel;
    const item = document.createElement('details');
    item.className = 'tt2-note';
    item.dataset.figmaRow = String(index+1).padStart(2,'0');
    const summary = document.createElement('summary');
    summary.className = 'tt2-note-summary';
    const arrow = document.createElement('span');
    arrow.className = 'tt2-note-arrow';
    arrow.setAttribute('aria-hidden','true');
    const label = document.createElement('span');
    label.className = 'tt2-note-title';label.textContent = title;
    summary.append(arrow,label);
    const content = document.createElement('div');
    content.className='tt2-note-content';
    const paras = paragraphNodes(original);
    if (index === 0 && paras.length === 1) {
      // Figma 1-1 intentionally separates the original amenities sentence into
      // three display paragraphs. The original wording is unchanged.
      const full = paras[0].textContent;
      const parts = full.match(/[^。]+。(?:[^。]+。)?/g) || [full];
      // Always cut at the exact three original Japanese sentences shown in 1-1.
      const pieces = [
        '法律の規定により、2025年から客室に使い捨てのアメニティは置かれていません。',
        'シャンプーやボディソープは、大きなボトルで備えられています。',
        '歯ブラシ・くし・カミソリなどは、フロントで頼めばもらえます（無料または有料）。'
      ];
      if (pieces.join('') === full.replace(/\s+/g,'')) {
        pieces.forEach(x => {const p=document.createElement('p');p.className='tt2-note-copy';p.textContent=x;content.appendChild(p)});
      } else content.append(...paras);
    } else content.append(...paras);
    item.append(summary,content);list.appendChild(item);
  });
  notes.appendChild(list);
  const extra = document.createElement('section');
  extra.className='tt2-original-note-extra';
  extra.setAttribute('aria-label','その他の注意事項');
  const originalBullet = source.querySelector(':scope > .indented > ul.bulleted-list');
  if (originalBullet) extra.append(originalBullet.cloneNode(true));
  // The original warning is still readable below the Figma first viewport.
  list.addEventListener('toggle',event=>{
    const active=event.target;
    if (active instanceof HTMLDetailsElement && active.open) {
      [...list.children].forEach(other=>{if(other!==active)other.open=false});
    }
  },true);

  const twacPane = document.createElement('section');
  twacPane.className='tt2-travel-pane tt2-twac-pane';
  twacPane.id='tt2-twac-pane';
  twacPane.setAttribute('aria-label','入国カード');
  const officialUrl = twac.querySelector('a[href^="https://twac."]')?.href || 'https://twac.immigration.gov.tw/';
  twacPane.innerHTML=`<div class="tt2-twac-heading"><h2>電子入国カード（TWAC）</h2><span class="tt2-required">必須</span></div><p class="tt2-twac-intro">台湾への入国前に提出する電子入国カード。<br>到着7日前から無料で登録できます。</p><a class="tt2-twac-official" href="${officialUrl}" target="_blank" rel="noopener noreferrer">TWAC公式サイトへ</a><p class="tt2-twac-requirements">必要情報：<br>パスポート情報、往復の航空便名、<br>台湾での滞在先（ホテル名や住所）など。</p>`;

  const passPane=document.createElement('section');
  passPane.className='tt2-travel-pane tt2-passes-pane';
  passPane.id='tt2-passes-pane';
  passPane.setAttribute('aria-label','交通パス');
  const transportLinks=[...passes.querySelectorAll('a[href]')];
  const passNames=['Taipei FunPASS','Taiwan PASS','TR-PASS'];
  const passDescriptions=[
    '台北・新北・基隆を中心に観光する方向け。MRTや対象バスが乗り放題になるプランと、観光施設の入場券付きプランがあります。',
    '台北以外の都市にも足を延ばす方向け。台湾新幹線（高鉄）または台鉄の3日間周遊券に、都市交通と観光地アクセスがセットになっています。',
    '台鉄を利用して台湾各地を巡る方向け。3日間・5日間の周遊券があり、長距離移動の多い旅に適しています。'
  ];
  const sourceCards = [...passes.querySelectorAll('.pass-simple-item')];
  for (let i=0;i<passNames.length;i++) {
    const card=document.createElement('article');card.className='tt2-pass-card';
    if(i===2) card.classList.add('tt2-pass-extra');
    const h=document.createElement('h2');h.textContent=passNames[i];
    const a=document.createElement('a');a.textContent='詳細へ';a.className='tt2-pass-link';
    a.href=transportLinks[i]?.href||'#transport-passes';a.target='_blank';a.rel='noopener noreferrer';
    const p=document.createElement('p');
    // Read descriptions directly from the untouched site; Figma only owns layout.
    p.textContent=sourceCards[i]?.querySelector('p')?.textContent.trim() || passDescriptions[i];
    card.append(h,a,p);passPane.appendChild(card);
  }

  // Preserve original third ticket item below the exact Figma 852px viewport.
  const passContinuation=document.createElement('section');
  passContinuation.className='tt2-pass-continuation';
  passContinuation.setAttribute('aria-label','その他の交通パス');
  const third=passPane.querySelector('.tt2-pass-extra');
  if (third) passContinuation.appendChild(third);
  tabRow.insertAdjacentElement('afterend',notes);
  notes.insertAdjacentElement('afterend',extra);
  extra.insertAdjacentElement('afterend',twacPane);
  twacPane.insertAdjacentElement('afterend',passPane);
  passPane.insertAdjacentElement('afterend',passContinuation);
  function sync() {
    const mode=tabs.find(t=>t.getAttribute('aria-selected')==='true')?.dataset.ttTravelTab||'notes';
    root.dataset.tt2TravelTab=mode;
    const map={notes,twac:twacPane,pass:passPane};
    Object.entries(map).forEach(([key,pane])=>{pane.hidden=key!==mode});
    extra.hidden=mode!=='notes';
    passContinuation.hidden=mode!=='pass';
  }
  tabs.forEach(tab=>tab.addEventListener('click',()=>queueMicrotask(sync)));
  document.addEventListener('tt:viewchange',sync);
  sync();

  // Side-menu order is read from the Figma `side` frame, distinct from Title.
  // Reorder existing native links in place; preserve all original event handlers.
  const menu=document.querySelector('.tt-side-chapters');
  const targets=['travel','food','city-walk','sights','experiences','day-trips','souvenirs'];
  // The visible order is 01/02/03 散策/04 観光/05/06/07; keep stable chapter numbers and destinations.
  const numbers={travel:1,food:2,'city-walk':3,sights:4,experiences:5,'day-trips':6,souvenirs:7};
  if (menu) targets.forEach((target,i)=>{
    const link=menu.querySelector(`[data-tt-target=\"${target}\"]`);
    if (!link) return;
    link.style.setProperty('--i',String(i));
    link.style.setProperty('--chapter-index',String(numbers[target]));
    const number=link.querySelector('.tt-side-index');
    if(number) number.textContent=String(numbers[target]).padStart(2,'0');
    menu.appendChild(link);
  });
})();
