// ==UserScript==
// @name         4399 赛尔号精灵图鉴增强插件
// @name:en      4399 Seer Pet Dex Enhancer
// @namespace    seer-4399-enhancer
// @version      1.0.5
// @description  图鉴联动精灵计算器及属性相克表；提供性格快捷选择、努力值清零与最大按钮，以及攻体攻速加点方案。
// @description:en Link dex pages to calculators and type charts, select natures, and quickly adjust effort values and common stat builds.
// @license      MIT
// @match        *://news.4399.com/seer/*
// @match        *://news.4399.com/gonglue/seer/*
// @grant        unsafeWindow
// @run-at       document-end
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const page = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
  const PREFIX = 'seer-plus';
  const PARAM = 'pet';
  const TYPE_PARAM = 'type';
  const COMMON = ['固执', '保守', '胆小', '开朗'];
  const STATS = ['攻击', '防御', '特攻', '特防', '速度'];
  const isCalculator = /^\/seer\/jsq\/?(?:index\.html?)?$/.test(location.pathname);
  const isTypeChart = /^\/seer\/ssxxk\/?(?:index\.html?)?$/.test(location.pathname);
  if (document.getElementById(`${PREFIX}-loaded`)) return;
  console.info('[4399增强] v1.0.5 已启动', location.pathname);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function installStyle() {
    const style = element('style');
    style.id = `${PREFIX}-loaded`;
    style.dataset.version = '1.0.5';
    style.textContent = `
      .seer-plus-panel, .seer-plus-status { box-sizing: border-box; font: 14px/1.55 system-ui, -apple-system, "Microsoft YaHei", sans-serif; text-align: left; color: #18354a; }
      .seer-plus-panel { background: #fff; border: 1px solid #99c8df; border-radius: 12px; padding: 16px; margin: 0 0 12px; box-shadow: 0 3px 12px #145b8810; clear: both; }
      .seer-plus-panel * { box-sizing: border-box; }
      .seer-plus-panel h3 { font: 700 16px/1.5 system-ui, sans-serif; color: #124765; margin: 0 0 6px; padding: 0; background: none; height: auto; }
      .seer-plus-panel p { margin: 4px 0 12px; padding: 0; line-height: 1.6; color: #405a6b; }
      .seer-plus-panel .seer-plus-current { color: #18354a; min-height: 22px; }
      .seer-plus-quick { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .seer-plus-quick[data-count="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .seer-plus-quick button[hidden] { display: none !important; }
      .seer-plus-panel button { appearance: none; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; width: 100%; height: auto; min-height: 77px; margin: 0; padding: 9px 10px; border: 1px solid #b6ccd9; border-radius: 8px; background: #f6fbff; color: #18354a; font: 13px/1.5 system-ui, sans-serif; cursor: pointer; text-align: left; }
      .seer-plus-panel button:hover { background: #e9f5ff; border-color: #377faf; }
      .seer-plus-panel button[aria-pressed="true"] { border: 2px solid #12659a; padding: 8px 9px; background: #e3f2ff; box-shadow: 0 0 0 1px #12659a20; }
      .seer-plus-panel button:focus-visible, .seer-plus-panel summary:focus-visible { outline: 3px solid #b05a00; outline-offset: 3px; }
      .seer-plus-panel button:disabled { cursor: default; opacity: .65; }
      .seer-plus-name { font-weight: 700; color: #164b70; }
      .seer-plus-badge { font-size: 11px; font-weight: 600; color: #775000; background: #fff0c2; border-radius: 3px; padding: 1px 4px; margin-left: 6px; }
      .seer-plus-up { color: #176238; }
      .seer-plus-down { color: #a13335; }
      .seer-plus-panel details { margin-top: 12px; }
      .seer-plus-panel summary { cursor: pointer; color: #165e8c; font-weight: 600; padding: 3px 0; }
      .seer-plus-group { margin-top: 12px; }
      .seer-plus-group-title { margin: 0 0 6px; font-weight: 600; color: #405a6b; }
      .seer-plus-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
      .seer-plus-grid button { padding: 8px; min-height: 74px; font-size: 12px; background: #fff; }
      .seer-plus-grid button[aria-pressed="true"] { padding: 7px; background: #e3f2ff; }
      .seer-plus-status { width: 980px; max-width: 100%; margin: 12px auto; padding: 11px 15px; border: 1px solid #a8c9df; border-left: 4px solid #12659a; border-radius: 6px; background: #f5fbff; clear: both; }
      .seer-plus-status[data-warning="true"] { border-color: #b88836; background: #fff9eb; }
      .seer-plus-panel[hidden] { display: none !important; }
      .seer-plus-effort-plans { display: flex; flex-wrap: wrap; gap: 8px; }
      .seer-plus-effort-plans button { width: auto; flex: 1 1 120px; min-height: 60px; }
      .seer-plus-panel .seer-plus-effort-total { margin-bottom: 0; }
      .seer-plus-effort-total[data-warning="true"] { color: #a13335; }
      .seer-plus-effort-row { display: flex; align-items: center; width: 84px; gap: 2px; margin: 0 auto; }
      .gtz .seer-plus-effort-row input { box-sizing: border-box; width: 30px; height: 24px; flex: 0 0 30px; padding: 0; font-size: 12px; text-align: center; }
      .seer-plus-effort-actions button { appearance: none; box-sizing: border-box; width: 25px; height: 24px; padding: 2px 0; border: 1px solid #99c8df; border-radius: 4px; background: #fff; color: #164b70; font: 11px/1.5 system-ui, sans-serif; cursor: pointer; }
      .seer-plus-effort-actions button:hover { background: #e3f2ff; border-color: #377faf; }
      .seer-plus-effort-actions button:focus-visible { outline: 3px solid #b05a00; outline-offset: 2px; }
      .seer-plus-effort-actions button:disabled { cursor: default; opacity: .5; }
      .seer-plus-native-select { max-width: 67px; }
      #state .item2 dt i a.seer-plus-type-link { color: inherit; text-decoration: none; }
      #state .item2 dt i a.seer-plus-type-link:hover { color: #12659a; }
      #state .item2 dt i a.seer-plus-type-link:focus-visible { outline: 3px solid #b05a00; outline-offset: 3px; }
      @media (max-width: 700px) { .seer-plus-quick, .seer-plus-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    `;
    (document.head || document.documentElement).append(style);
  }

  function enhanceDetail() {
    const links = Array.from(document.querySelectorAll('a.jsq')).filter(link => {
      const url = new URL(link.href);
      return url.hostname === 'news.4399.com' && /^\/seer\/jsq\/?$/.test(url.pathname);
    });
    const typeLinks = Array.from(document.querySelectorAll('#state .item2 dl.shuxing a.sxb[href]')).filter(link => {
      const url = new URL(link.href);
      return url.hostname === 'news.4399.com' && /^\/seer\/ssxxk\/?(?:index\.html?)?$/.test(url.pathname);
    });
    if (!links.length && !typeLinks.length) return;
    installStyle();
    for (const link of typeLinks) {
      const heading = link.closest('dl').querySelector('dt');
      const label = heading?.querySelector('i');
      const type = normalizeType(label?.textContent || heading?.querySelector('img')?.alt?.replace(/^赛尔号/, '') || '');
      if (!type) continue;
      const url = new URL(link.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      hash.set(TYPE_PARAM, type);
      url.hash = hash.toString();
      link.href = url.href;
      link.target = '_blank';
      link.relList.add('noopener');
      link.title = `在新标签页查看${type}系属性相克表`;
      // Each evolution form owns its own attribute block and real link.
      if (label) {
        const textLink = element('a', `${PREFIX}-type-link`);
        textLink.append(...label.childNodes);
        textLink.href = link.href;
        textLink.target = link.target;
        textLink.rel = 'noopener';
        textLink.title = link.title;
        label.append(textLink);
      }
    }
    // The calculator stores one race-value record per article, normally its final form.
    const primaryName = document.querySelector('#state .item1 dl dt')?.textContent.trim() || '';
    function update() {
      const viewed = document.querySelector('#state .focuslist li.cur span')?.textContent.trim() || primaryName;
      const id = String(page.jlid || '');
      const valid = /^\d{1,16}$/.test(id);
      for (const link of links) {
        const url = new URL(link.href);
        const hash = new URLSearchParams(url.hash.slice(1));
        hash.delete('seerPlus');
        if (valid) hash.set(PARAM, `p${id}`);
        else hash.delete(PARAM);
        url.hash = hash.toString();
        link.href = url.href;
        link.target = '_blank';
        link.relList.add('noopener');
        link.title = `在新标签页计算${primaryName || '本图鉴主精灵'}${viewed && viewed !== primaryName ? '（按图鉴主精灵数据）' : ''}`;
      }
    }
    update();
    // Keep the real href current so middle-click and “open in new tab” work too.
    const list = document.querySelector('#state .focuslist');
    if (list) new MutationObserver(update).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });
    for (const link of links) {
      link.addEventListener('pointerdown', update);
      link.addEventListener('click', update, true);
      link.addEventListener('contextmenu', update);
    }
  }

  function normalizeType(value) {
    return value.replace(/\s+/g, '').replace(/系$/, '');
  }

  function findTypeOption(type, options) {
    const exact = options.filter(node => normalizeType(node.textContent) === type);
    if (exact.length) return exact.length === 1 ? exact[0] : null;

    // Learn base types from the native single-type group, not a second database.
    const singleGroup = document.querySelector('.l_big .box_lc');
    const tokens = new Map(options.filter(node => singleGroup?.contains(node))
      .map(node => { const name = normalizeType(node.textContent); return [name, name]; }));
    if (tokens.has('地面')) tokens.set('地', '地面');
    if (tokens.has('冰')) tokens.set('冰雪', '冰');
    function key(value) {
      const name = normalizeType(value) === '飞龙' ? '飞行龙' : normalizeType(value);
      if (tokens.has(name)) return JSON.stringify([tokens.get(name)]);
      const keys = new Set();
      for (const [prefix, canonical] of tokens) {
        if (!name.startsWith(prefix)) continue;
        const suffix = name.slice(prefix.length);
        if (tokens.has(suffix)) keys.add(JSON.stringify([canonical, tokens.get(suffix)].sort()));
      }
      return keys.size === 1 ? keys.values().next().value : null;
    }
    const target = key(type);
    if (!target) return null;
    const matches = options.filter(node => key(node.textContent) === target);
    return matches.length === 1 ? matches[0] : null;
  }

  function enhanceTypeChart() {
    installStyle();
    const hash = new URLSearchParams(location.hash.slice(1));
    if (!hash.has(TYPE_PARAM)) return;
    const type = normalizeType(hash.get(TYPE_PARAM));
    if (!type || type.length > 32 || hash.getAll(TYPE_PARAM).length !== 1) {
      showStatus('链接中的精灵属性无效，请从图鉴重新打开，或在左侧手动选择属性。', true);
      return;
    }
    // Do not override a manual choice while waiting for the native script.
    let touched = false;
    const onChoose = event => {
      if (event.target.closest('.big_c a[onclick]')) touched = true;
    };
    document.addEventListener('click', onChoose, true);
    const deadline = Date.now() + 12000;
    function startWhenReady() {
      if (touched) {
        document.removeEventListener('click', onChoose, true);
        return;
      }
      const options = Array.from(document.querySelectorAll('.l_big li[id^="lf"] a'));
      if (options.length && page.jQuery && typeof page.sh === 'function' && page.lastId != null) {
        document.removeEventListener('click', onChoose, true);
        const option = findTypeOption(type, options);
        const id = option?.parentElement.id.match(/^lf(\d+)$/)?.[1];
        if (!id || !document.getElementById(`tt${id}`) ||
            !document.getElementById(`1rt${id}`) || !document.getElementById(`2rt${id}`)) {
          showStatus(`属性相克表中未找到“${type}”，请在左侧手动选择属性。`, true);
          return;
        }
        page.sh(Number(id));
        console.info('[4399增强] 已选中精灵属性', type);
        return;
      }
      if (Date.now() < deadline) setTimeout(startWhenReady, 150);
      else {
        document.removeEventListener('click', onChoose, true);
        showStatus('属性相克表尚未就绪，未能自动选择属性。请刷新重试，或在左侧手动选择。', true);
      }
    }
    startWhenReady();
  }

  function showStatus(message, warning = false) {
    let status = document.getElementById(`${PREFIX}-status`);
    if (!status) {
      status = element('div', `${PREFIX}-status`);
      status.id = `${PREFIX}-status`;
      status.setAttribute('role', 'status');
      const grid = document.querySelector('.big_c') || document.querySelector('.r-bg')?.parentElement;
      if (grid) grid.before(status);
      else document.body.prepend(status);
    }
    status.dataset.warning = String(warning);
    status.textContent = message;
    return status;
  }

  function guardReplyDialogs() {
    // 4399's compatible.js treats ANY posted string as pid|fid|cid. Validate at
    // its dialog entry points, without intercepting messages used by extensions.
    const validId = value => /^(?:\d{1,16})$/.test(String(value));
    for (const name of ['show_reply_dialog', 'show_reply_dialog_v2']) {
      const original = page[name];
      if (typeof original !== 'function' || original.seerPlusGuard) continue;
      const guarded = function (...args) {
        if (![args[1], args[2], args[3]].every(validId)) {
          console.info('[4399增强] 已忽略非评论消息触发的回复框');
          return false;
        }
        return original.apply(this, args);
      };
      guarded.seerPlusGuard = true;
      page[name] = guarded;
    }
    // A local @require can arrive after an unrelated extension already triggered
    // an invalid dialog. Close only that malformed reply, never a valid comment.
    const frame = document.querySelector('#my_reply iframe');
    if (frame && page.nowDialogId === 'my_reply' && typeof page.closeWin_c === 'function') {
      try {
        const url = new URL(frame.src, location.href);
        if (/^\/comment\/news\/reply_form/.test(url.pathname) &&
            !['pid', 'fid', 'cid'].every(key => validId(url.searchParams.get(key)))) {
          page.closeWin_c();
        }
      } catch { /* Keep unknown dialog formats unchanged. */ }
    }
  }

  function watchReplyDialogs() {
    // Apply on dex pages too, before their early return. Comment scripts may
    // load later or replace their entry points after document-end.
    guardReplyDialogs();
    document.addEventListener('load', guardReplyDialogs, true);
    // Also repair late inline definitions and malformed dialogs created before
    // a replacement entry point has been wrapped. Valid replies stay open.
    new MutationObserver(guardReplyDialogs).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['src'],
    });
  }

  function readTarget() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const id = hash.get(PARAM);
    if (id === null) return hash.has('seerPlus') ? { invalid: true } : null;
    return /^p\d{1,16}$/.test(id) && hash.getAll(PARAM).length === 1 ? { id } : { invalid: true };
  }

  function selectTarget(target) {
    if (!target) return;
    if (target.invalid) {
      showStatus('链接中的精灵编号无效或格式已过期，请从图鉴重新打开，或使用左侧搜索。', true);
      return;
    }
    const id = target.id;
    const pet = Object.prototype.hasOwnProperty.call(page.pets, id) ? page.pets[id] : null;
    if (!pet) {
      showStatus(`计算器中未找到精灵 ${id}，请使用左侧搜索选择精灵。`, true);
      return;
    }
    if (page.petid !== id) page.changePet(id);
    const list = document.querySelector('#ulPet');
    if (list) {
      let selected = Array.from(list.querySelectorAll('a[rel]')).find(a => a.getAttribute('rel') === id)?.closest('li');
      if (!selected) {
        selected = element('li');
        const link = element('a', '', pet.nameAll || pet.title);
        link.href = '#';
        link.setAttribute('rel', id);
        selected.append(link);
        selected.addEventListener('click', event => {
          event.preventDefault();
          page.liClick(selected);
        });
        list.prepend(selected);
      }
      list.querySelectorAll('li.on').forEach(li => li.classList.remove('on'));
      selected.classList.add('on');
      const scroller = list.closest('.jg');
      if (scroller) scroller.scrollTop += selected.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    }
    const status = showStatus(`已选中：${pet.title}（按图鉴主精灵数据计算）。`);
    // Dismiss the one-time import message after a manual selection.
    document.querySelector('#ulPet')?.addEventListener('click', () => { status.hidden = true; });
    document.querySelector('#sform')?.addEventListener('submit', () => { status.hidden = true; });
  }

  function getNatures(select) {
    return Array.from(select.options).map(option => {
      const name = option.textContent.trim();
      const raw = page.characters?.[option.value];
      const factors = raw && Array.from(raw, Number);
      if (!factors || factors.length !== 5 || factors.some(n => ![0.9, 1, 1.1].includes(n))) return null;
      const up = factors.flatMap((n, i) => n > 1 ? [STATS[i]] : []);
      const down = factors.flatMap((n, i) => n < 1 ? [STATS[i]] : []);
      const effect = up.length || down.length ? [...up.map(s => `${s} ↑10%`), ...down.map(s => `${s} ↓10%`)].join('，') : '无增减';
      return { value: option.value, name, factors, up, down, effect, option };
    }).filter(Boolean);
  }

  function readRaces() {
    return Array.from(document.querySelectorAll('.gtz ._race2'), node => {
      const text = node.textContent.trim();
      return /^\d+$/.test(text) ? Number(text) : NaN;
    });
  }

  function attackChoices(current = readRaces()) {
    if (current.length !== 6 || !current.every(Number.isFinite) || !current.some(n => n > 0)) return [];
    return current[1] === current[3] ? [1, 3] : [current[1] > current[3] ? 1 : 3];
  }

  function naturePanel(select, mode) {
    const natures = getNatures(select);
    if (!natures.length) return;
    const panel = element('section', `${PREFIX}-panel`);
    panel.id = `${PREFIX}-nature-${mode}`;
    const title = element('h3', '', `${mode === 2 ? '能力值计算' : '个体值计算'} · 性格`);
    title.id = `${panel.id}-title`;
    panel.setAttribute('aria-labelledby', title.id);
    const current = element('p', `${PREFIX}-current`);
    current.setAttribute('aria-live', 'polite');
    const quick = element('div', `${PREFIX}-quick`);
    const details = element('details');
    details.append(element('summary', '', `全部 ${natures.length} 种性格 · 查看增减属性`));
    const buttons = [];

    function makeButton(nature, common) {
      const button = element('button');
      button.type = 'button';
      button.dataset.nature = nature.value;
      button.setAttribute('aria-label', `${nature.name}，${nature.effect}${common ? '，常用' : ''}`);
      const name = element('span', `${PREFIX}-name`, nature.name);
      if (common) name.append(element('span', `${PREFIX}-badge`, '常用'));
      button.append(name);
      nature.up.forEach(s => button.append(element('span', `${PREFIX}-up`, `${s} ↑10%`)));
      nature.down.forEach(s => button.append(element('span', `${PREFIX}-down`, `${s} ↓10%`)));
      if (!nature.up.length && !nature.down.length) button.append(element('span', '', '无增减'));
      button.addEventListener('click', () => {
        select.value = nature.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      buttons.push({ button, nature });
      return button;
    }

    for (const name of COMMON) {
      const nature = natures.find(n => n.name === name);
      if (nature) quick.append(makeButton(nature, true));
    }
    for (const group of [...STATS, '无增减']) {
      const items = natures.filter(n => group === '无增减' ? !n.up.length && !n.down.length : n.up[0] === group);
      if (!items.length) continue;
      const section = element('div', `${PREFIX}-group`);
      section.append(element('div', `${PREFIX}-group-title`, group === '无增减' ? '无增减' : `增强${group}`));
      const grid = element('div', `${PREFIX}-grid`);
      items.forEach(n => grid.append(makeButton(n, COMMON.includes(n.name))));
      section.append(grid);
      details.append(section);
    }
    panel.append(title, current, quick, details);
    panel.append(element('p', '', '体力不受性格影响；“常用”不代表每只精灵的最佳选择。'));
    const container = select.closest(mode === 2 ? '.gtz' : '.nlz');
    if (!container) return;
    container.before(panel);
    select.classList.add(`${PREFIX}-native-select`);
    select.setAttribute('aria-label', `${mode === 2 ? '能力值' : '个体值'}计算性格`);
    const multipliers = Array.from(document.querySelectorAll('select[name="_c2"]'));
    const item = document.querySelector('select[name="item"]');
    function sync() {
      const attacks = attackChoices();
      const common = COMMON.filter(name => attacks.includes(name === '固执' || name === '开朗' ? 1 : 3));
      quick.dataset.count = String(common.length);
      natures.forEach(n => { n.option.textContent = `${common.includes(n.name) ? '★ ' : ''}${n.name}｜${n.effect}`; });
      const selected = natures.find(n => n.value === select.value);
      const custom = mode === 2 && selected && multipliers.some((s, i) => Number(s.value) !== selected.factors[i]);
      const hp = mode === 1 && item?.value === '1';
      panel.hidden = hp;
      current.textContent = custom ? '当前为自定义修正；点击性格可恢复该性格的标准修正。' : `当前：${selected ? `${selected.name} · ${selected.effect}` : '未识别'}`;
      select.title = current.textContent;
      buttons.forEach(({ button, nature }) => {
        const recommended = common.includes(nature.name);
        button.hidden = quick.contains(button) && !recommended;
        const badge = button.querySelector(`.${PREFIX}-badge`);
        if (badge) badge.hidden = !recommended;
        button.setAttribute('aria-label', `${nature.name}，${nature.effect}${recommended ? '，常用' : ''}`);
        button.setAttribute('aria-pressed', String(!custom && button.dataset.nature === select.value));
      });
    }
    function onChange() {
      sync();
      document.querySelectorAll(`._result${mode}`).forEach(result => { result.textContent = ''; });
    }
    select.addEventListener('change', onChange);
    if (mode === 2) multipliers.forEach(s => s.addEventListener('change', onChange));
    else item?.addEventListener('change', onChange);
    const observer = new MutationObserver(sync);
    document.querySelectorAll('.gtz ._race2').forEach(node => {
      observer.observe(node, { childList: true, characterData: true, subtree: true });
    });
    sync();
  }

  function effortPanel() {
    const container = document.querySelector('.gtz');
    const inputs = Array.from(container?.querySelectorAll('input[name="nvli2"]') || []);
    const races = Array.from(container?.querySelectorAll('._race2') || []);
    if (inputs.length !== 6 || races.length !== 6) return;
    const names = ['体力', ...STATS];
    const panel = element('section', `${PREFIX}-panel`);
    panel.id = `${PREFIX}-effort`;
    const title = element('h3', '', '能力值计算 · 努力值');
    title.id = `${panel.id}-title`;
    panel.setAttribute('aria-labelledby', title.id);
    const plans = element('div', `${PREFIX}-effort-plans`);
    const total = element('p', `${PREFIX}-effort-total`);
    total.setAttribute('role', 'status');
    panel.append(title, element('p', '', '方案会覆盖六项努力值；“最大”在剩余额度内填满，单项最多 255。'), plans, total);
    container.before(panel);
    const maxButtons = [];
    let raceKey;
    let planButtons = [];

    function values() {
      return inputs.map(input => {
        const text = input.value.trim();
        const value = Number(text);
        return /^\d+$/.test(text) && Number.isInteger(value) && value <= 255 ? value : null;
      });
    }

    function write(next) {
      inputs.forEach((input, i) => { input.value = String(next[i]); });
      inputs.forEach(input => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      sync();
    }

    function makePlan(attack, partner, split) {
      const next = inputs.map((_, i) => i === attack || i === partner ? 255 : 0);
      const name = `${split ? (attack === 1 ? '物攻' : '特攻') : '攻'}${partner === 0 ? '体' : '速'}`;
      const effect = `${names[attack]} 255 + ${names[partner]} 255`;
      const button = element('button');
      button.type = 'button';
      button.dataset.attack = String(attack);
      button.dataset.partner = String(partner);
      button.setAttribute('aria-label', `${name}，${effect}，其余清零`);
      button.append(element('span', `${PREFIX}-name`, name), element('span', '', effect));
      button.addEventListener('click', () => {
        // Read the current pet even if its race-value observer has not run yet.
        const current = readRaces();
        const attacks = attackChoices(current);
        if (!attacks.length) return;
        const chosen = attacks.length === 2 ? attack : attacks[0];
        write(inputs.map((_, i) => i === chosen || i === partner ? 255 : 0));
      });
      plans.append(button);
      planButtons.push({ button, next });
    }

    function sync() {
      const current = readRaces();
      const key = current.join(',');
      if (key !== raceKey) {
        raceKey = key;
        plans.replaceChildren();
        planButtons = [];
        const attacks = attackChoices(current);
        if (attacks.length) {
          const split = attacks.length === 2;
          for (const partner of [0, 5]) for (const attack of attacks) makePlan(attack, partner, split);
        } else {
          plans.append(element('p', '', '种族值尚未就绪，暂不能选择加点方案。'));
        }
      }
      const next = values();
      const invalid = next.some(n => n === null);
      const sum = next.reduce((sum, n) => sum + (n ?? 0), 0);
      total.dataset.warning = String(invalid || sum > 510);
      total.textContent = invalid ? '请输入 0–255 的整数；修正其他项后可使用“最大”。' :
        `已分配 ${sum} / 510${sum > 510 ? '，已超出总上限，请减少加点。' : `，剩余 ${510 - sum}。`}`;
      maxButtons.forEach((button, i) => { button.disabled = next.some((n, j) => j !== i && n === null); });
      planButtons.forEach(({ button, next: preset }) => {
        button.setAttribute('aria-pressed', String(!invalid && preset.every((n, i) => n === next[i])));
      });
    }

    function edited() {
      container.querySelectorAll('._result2').forEach(result => { result.textContent = ''; });
      sync();
    }

    inputs.forEach((input, i) => {
      input.setAttribute('aria-label', `${names[i]}努力值`);
      const actions = element('div', `${PREFIX}-effort-row ${PREFIX}-effort-actions`);
      for (const [label, maximum] of [['清零', false], ['最大', true]]) {
        const button = element('button', '', label);
        button.type = 'button';
        button.setAttribute('aria-label', `${names[i]}努力值${label}`);
        button.addEventListener('click', () => {
          const next = values();
          if (maximum && next.some((n, j) => j !== i && n === null)) return;
          const used = next.reduce((sum, n, j) => sum + (j === i ? 0 : n ?? 0), 0);
          input.value = String(maximum ? Math.max(0, Math.min(255, 510 - used)) : 0);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        actions.append(button);
        if (maximum) maxButtons.push(button);
      }
      input.before(actions);
      actions.insertBefore(input, actions.lastElementChild);
      input.addEventListener('input', edited);
      input.addEventListener('change', edited);
    });
    // Native changePet updates race text and resets effort input properties.
    // Observe its displayed data so search/manual/import selections all sync.
    const observer = new MutationObserver(sync);
    races.forEach(node => observer.observe(node, { childList: true, characterData: true, subtree: true }));
    sync();
  }

  watchReplyDialogs();

  if (isTypeChart) {
    enhanceTypeChart();
    return;
  }
  if (!isCalculator) {
    enhanceDetail();
    return;
  }
  installStyle();
  const target = readTarget();
  // Stop waiting if the user has started editing; a late import would reset their inputs.
  let touched = false;
  const onEdit = event => {
    if (event.target.closest('input, select, button, #ulPet')) touched = true;
  };
  document.addEventListener('input', onEdit, true);
  document.addEventListener('click', onEdit, true);
  const deadline = Date.now() + 12000;
  function startWhenReady() {
    guardReplyDialogs();
    const select = document.querySelector('select[name="characters2"]');
    if (page.pets && page.characters && typeof page.changePet === 'function' && page.petid && select) {
      document.removeEventListener('input', onEdit, true);
      document.removeEventListener('click', onEdit, true);
      if (!touched) selectTarget(target);
      else if (target) showStatus('你已开始编辑，已跳过自动选择精灵；可使用左侧搜索。');
      naturePanel(select, 2);
      effortPanel();
      const individual = document.querySelector('select[name="characters1"]');
      if (individual) naturePanel(individual, 1);
      console.info('[4399增强] 计算器已就绪', { pet: page.petid, target: target?.id || null });
      return;
    }
    if (Date.now() < deadline) setTimeout(startWhenReady, 150);
    else {
      document.removeEventListener('input', onEdit, true);
      document.removeEventListener('click', onEdit, true);
      showStatus('计算器数据尚未就绪，增强功能未启用。请检查页面加载后刷新重试。', true);
    }
  }
  startWhenReady();
})();
