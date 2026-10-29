/* =========================================================
   BARACCA — app.js
   Inventario attrezzi, lista della spesa e manutenzione.
   ========================================================= */

const APP_VERSION = '1.0.0';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TEMI = [
  { k: 'bosco', n: 'Bosco', e: '🌲', d: '#8ee6a4', l: '#15803d', a2: '#2dd4bf' },
  { k: 'oceano', n: 'Oceano', e: '🌊', d: '#6b95ff', l: '#2a62f0', a2: '#8b5cf6' },
  { k: 'salvia', n: 'Salvia', e: '🌿', d: '#5fd4a8', l: '#0f9b74', a2: '#38bdf8' },
  { k: 'tramonto', n: 'Tramonto', e: '🌅', d: '#ff9d57', l: '#ea580c', a2: '#f43f5e' },
  { k: 'sole', n: 'Sole', e: '☀️', d: '#ffcb47', l: '#c27803', a2: '#fb923c' },
  { k: 'lavanda', n: 'Lavanda', e: '💜', d: '#b39cff', l: '#7c3aed', a2: '#ec4899' },
  { k: 'rubino', n: 'Rubino', e: '❤️', d: '#ff7a7a', l: '#dc2626', a2: '#fb923c' },
  { k: 'grafite', n: 'Grafite', e: '🖤', d: '#c3cad6', l: '#475569', a2: '#94a3b8' }
];

const ICON = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M4 3h16"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/></svg>',
  cloudOff: '<svg viewBox="0 0 24 24"><path d="M7 18a5 5 0 0 1-.6-9.96M10 4.3A6 6 0 0 1 18 9a4.5 4.5 0 0 1 2.4 8.3M3 3l18 18"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/></svg>'
};

/* Attrezzi da giardino di Federico, da aggiungere con un tocco */
const ATTREZZI_GIARDINO = [
  { nome: 'Motosega 1', categoria: 'Giardinaggio a motore', manutenzione: true },
  { nome: 'Motosega 2', categoria: 'Giardinaggio a motore', manutenzione: true },
  { nome: 'Decespugliatore 1', categoria: 'Giardinaggio a motore', manutenzione: true },
  { nome: 'Decespugliatore 2', categoria: 'Giardinaggio a motore', manutenzione: true },
  { nome: 'Sega a banco', categoria: 'Elettroutensili', manutenzione: true }
];

const UI = {
  state: { colore: 'bosco', nome: '', invCat: 'tutte', invStato: 'tutti', cerca: '', manAnno: 'tutti', mostraComprati: false },

  /* ---------- Avvio ---------- */
  async init() {
    try { Object.assign(this.state, JSON.parse(localStorage.getItem('baracca-ui') || '{}')); } catch (e) {}
    this.state.cerca = '';
    this.applyColor();
    await DB.open();
    await DB.loadAll();
    window.addEventListener('hashchange', () => this.render());
    document.addEventListener('click', e => this.onClick(e));
    $('#btnAdd').onclick = () => this.quickAdd();
    $('#btnTheme').onclick = () => this.openThemeSheet();
    $('#btnAltro').onclick = () => location.hash = '#altro';
    $('#btnBack').onclick = () => history.length > 1 ? history.back() : (location.hash = '#home');
    $('#sheetClose').onclick = () => this.closeSheet();
    $('#sheetBackdrop').onclick = () => this.closeSheet();
    $('#btnSync').onclick = () => Sync.run(true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeSheet(); });
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { this.applyColor(); this.render(); }); } catch (e) {}
    this.render();
    Sync.init();
    if (!Sync.attivo()) SpeseCasa.programma(3000);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  },

  saveUi() { const { cerca, ...st } = this.state; try { localStorage.setItem('baracca-ui', JSON.stringify(st)); } catch (e) {} },

  /* ---------- Tema ---------- */
  modo() { try { return localStorage.getItem('baracca-tema') || 'dark'; } catch (e) { return 'dark'; } },
  isDark() { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; },
  setModo(t) {
    if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    try { localStorage.setItem('baracca-tema', t); } catch (e) {}
    this.applyColor();
  },
  applyColor() {
    const t = TEMI.find(x => x.k === this.state.colore) || TEMI[0];
    const vars = { '--accent': this.isDark() ? t.d : t.l, '--accent-2': t.a2 };
    for (const k in vars) document.documentElement.style.setProperty(k, vars[k]);
    try { localStorage.setItem('baracca-colore-css', JSON.stringify(vars)); } catch (e) {}
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1117';
  },
  openThemeSheet() {
    const modo = this.modo();
    this.openSheet('Temi e colori', `
      <div class="field"><span class="lbl">Aspetto</span>
        <div class="seg">${[['dark', '🌙 Scuro'], ['light', '☀️ Chiaro'], ['auto', '📱 Auto']].map(([k, l]) => `<button class="${modo === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:18px"><span class="lbl">Colore</span>
        <div class="themes">${TEMI.map(t => `<button class="theme-btn ${this.state.colore === t.k ? 'on' : ''}" data-c="${t.k}">
          <span class="sw" style="background:linear-gradient(140deg, ${this.isDark() ? t.d : t.l}, ${t.a2})">${t.e}</span>${t.n}</button>`).join('')}</div></div>`);
    const body = $('#sheetBody');
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { this.setModo(b.dataset.m); this._needRender = true; this.openThemeSheet(); });
    body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { this.state.colore = b.dataset.c; this.saveUi(); this.applyColor(); this._needRender = true; this.openThemeSheet(); });
  },

  /* ---------- Router ---------- */
  render() {
    const hash = location.hash.replace('#', '') || 'home';
    const [route, param] = hash.split('/');
    const parent = { attrezzo: 'inventario' }[route] || route;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === parent));
    $('#btnBack').hidden = !['attrezzo', 'altro'].includes(route);
    const view = $('#view');
    const nuova = this._lastHash !== hash;
    if (nuova) { view.style.animation = 'none'; void view.offsetWidth; view.style.animation = ''; }
    const views = {
      home: () => this.vHome(), inventario: () => this.vInventario(), attrezzo: () => this.vAttrezzo(param),
      comprare: () => this.vComprare(), manutenzione: () => this.vManutenzione(), altro: () => this.vAltro()
    };
    (views[route] || views.home)();
    if (nuova) window.scrollTo(0, 0);
    this._lastHash = hash;
  },
  setTitle(t) { $('#pageTitle').textContent = t; document.title = t === 'Baracca' ? 'Baracca' : t + ' · Baracca'; },

  onClick(e) {
    const el = e.target.closest('[data-edit],[data-go],[data-act]');
    if (!el || el.closest('#frm')) return;
    if (el.dataset.edit) { const [t, id] = el.dataset.edit.split(':'); this.openForm(t, id); }
    else if (el.dataset.go) location.hash = el.dataset.go;
    else this.action(el.dataset.act, el);
  },

  async action(act, el) {
    const d = el.dataset;
    const set = (k, v) => { this.state[k] = v; this.saveUi(); this.render(); };
    switch (act) {
      case 'new': this.openForm(d.table, null, { attrezzoId: d.aid, categoria: d.cat }); break;
      case 'cat': set('invCat', d.v); break;
      case 'stato': set('invStato', d.v); break;
      case 'anno': set('manAnno', d.v); break;
      case 'qty': {
        const a = DB.get('attrezzi', d.id); if (!a) return;
        const q = Math.max(0, num(a.quantita || 1) + Number(d.d));
        await DB.save('attrezzi', { ...a, quantita: q }); this.render(); break;
      }
      case 'compra': {
        const c = DB.get('comprare', d.id); if (!c) return;
        await DB.save('comprare', { ...c, comprato: !c.comprato, compratoIl: !c.comprato ? D.today() : '' });
        this.toast(!c.comprato ? 'Comprato ✓' : 'Rimesso in lista'); this.render(); break;
      }
      case 'in-inventario': this.inInventario(d.id); break;
      case 'mostra-comprati': set('mostraComprati', !this.state.mostraComprati); break;
      case 'pulisci-comprati': {
        const fatti = DB.list('comprare').filter(c => c.comprato);
        if (!fatti.length || !confirm(`Togliere dalla lista i ${fatti.length} articoli già comprati?`)) return;
        for (const c of fatti) await DB.remove('comprare', c.id);
        this.render(); break;
      }
      case 'precarica': this.precarica(); break;
      case 'export': this.exportBackup(); break;
      case 'import': this.importBackup(); break;
      case 'temi': this.openThemeSheet(); break;
      case 'nome': this.openNomeSheet(); break;
      case 'sheets': this.openSyncSheet(); break;
    }
  },

  /* ---------- Helpers ---------- */
  toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(this._toastT); this._toastT = setTimeout(() => t.hidden = true, 2600);
  },
  saluto() {
    const h = new Date().getHours();
    return (h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera') + (this.state.nome ? ' ' + esc(this.state.nome) : '') + ' 👋';
  },
  avatar(a, cls = '') { return `<div class="vavatar ${cls}">${a.foto ? `<img src="${a.foto}" alt="">` : (CONFIG.emojiCategoria[a.categoria] || '📦')}</div>`; },
  stat(k, v) { return `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`; },
  chipStato(a) { const s = a.stato || 'Funziona'; return `<span class="chip ${CONFIG.chipStato[s] || ''}">${CONFIG.emojiStato[s] || ''} ${esc(s)}</span>`; },
  attrezzi() { return DB.list('attrezzi').sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it')); },
  conManutenzione() { return this.attrezzi().filter(a => a.manutenzione); },
  manutenzioni(aid) { return DB.list('manutenzioni').filter(m => !aid || m.attrezzoId === aid).sort((a, b) => (b.data || '').localeCompare(a.data || '')); },
  daComprare() {
    const p = { Alta: 0, Media: 1, Bassa: 2 };
    return DB.list('comprare').filter(c => !c.comprato).sort((a, b) => (p[a.priorita] ?? 1) - (p[b.priorita] ?? 1) || (a.nome || '').localeCompare(b.nome || '', 'it'));
  },
  totaleStimato(list) { return list.reduce((s, c) => s + num(c.prezzo) * (num(c.quantita) || 1), 0); },
  empty(e, t, p, btn = '') { return `<div class="card empty"><div class="e-ic">${e}</div><h4>${t}</h4><p>${p}</p>${btn}</div>`; },

  /* =========================================================
     HOME
     ========================================================= */
  vHome() {
    this.setTitle('Baracca');
    const att = this.attrezzi();
    const daSist = att.filter(a => a.stato && a.stato !== 'Funziona');
    const comp = this.daComprare();
    const anno = String(new Date().getFullYear());
    const manAnno = this.manutenzioni().filter(m => (m.data || '').startsWith(anno));
    const pezzi = att.reduce((s, a) => s + (a.quantita === '' || a.quantita == null ? 1 : num(a.quantita)), 0);
    $('#view').innerHTML = `
      <div class="hello"><h2>${this.saluto()}</h2><p>La tua baracca in un colpo d'occhio</p></div>
      <div class="quick-row">
        <button class="qa" data-act="new" data-table="attrezzi"><span class="em t-fuel">🧰</span>Attrezzo</button>
        <button class="qa" data-act="new" data-table="comprare"><span class="em t-exp">🛒</span>Da comprare</button>
        <button class="qa" data-act="new" data-table="manutenzioni"><span class="em t-maint">🔧</span>Manutenzione</button>
      </div>
      <div class="hero" style="margin-top:14px" data-go="#inventario">
        <div class="label">Attrezzi in baracca</div>
        <div class="big">${F.num(att.length)}</div>
        <div class="muted">${F.num(pezzi)} pezzi in tutto</div>
        <div class="mini">
          <div><span>Da sistemare</span><b>${daSist.length}</b></div>
          <div><span>Da comprare</span><b>${comp.length}</b></div>
          <div><span>Manut. ${anno}</span><b>${F.eur(manAnno.reduce((s, m) => s + num(m.costo), 0), 0)}</b></div>
        </div>
      </div>
      ${!att.length ? `<div class="spacer"></div>${this.empty('🧰', 'Baracca vuota', 'Inizia dai tuoi attrezzi da giardino: motoseghe, decespugliatori e sega a banco.', `<button class="btn" data-act="precarica">${ICON.plus} Aggiungili con un tocco</button>`)}` : ''}
      ${daSist.length ? `<div class="section-title"><h3>Da sistemare</h3></div><div class="list">${daSist.map(a => this.itemAttrezzo(a)).join('')}</div>` : ''}
      ${comp.length ? `<div class="section-title"><h3>Da comprare</h3><a href="#comprare">Tutti (${comp.length})</a></div><div class="list">${comp.slice(0, 4).map(c => this.itemComprare(c)).join('')}</div>` : ''}
      ${manAnno.length || this.manutenzioni().length ? `<div class="section-title"><h3>Ultime manutenzioni</h3><a href="#manutenzione">Vedi tutte</a></div><div class="list">${this.manutenzioni().slice(0, 3).map(m => this.itemManutenzione(m, true)).join('')}</div>` : ''}`;
  },

  /* =========================================================
     INVENTARIO
     ========================================================= */
  itemAttrezzo(a) {
    const sub = [esc(a.categoria || 'Altro')];
    if (a.posizione) sub.push('📍 ' + esc(a.posizione));
    if (a.stato === 'Prestato' && a.prestatoA) sub.push('a ' + esc(a.prestatoA));
    const q = a.quantita === '' || a.quantita == null ? 1 : num(a.quantita);
    return `
      <div class="item" data-go="#attrezzo/${a.id}">
        ${this.avatar(a, 'item-av')}
        <div class="main"><div class="t">${esc(a.nome)}</div><div class="s">${sub.join(' · ')}</div></div>
        <div class="r" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${q !== 1 ? `<b>×${F.num(q)}</b>` : ''}${a.stato && a.stato !== 'Funziona' ? this.chipStato(a) : ''}
        </div>
      </div>`;
  },

  vInventario() {
    this.setTitle('Inventario');
    const st = this.state;
    const tutti = this.attrezzi();
    const q = st.cerca.trim().toLowerCase();
    let list = tutti.filter(a => (st.invCat === 'tutte' || a.categoria === st.invCat) && (st.invStato === 'tutti' || (a.stato || 'Funziona') === st.invStato));
    if (q) list = list.filter(a => [a.nome, a.posizione, a.marca, a.modello, a.note, a.categoria].join(' ').toLowerCase().includes(q));
    const cats = CONFIG.categorie.filter(c => tutti.some(a => a.categoria === c));
    const gruppi = CONFIG.categorie.map(c => [c, list.filter(a => (CONFIG.categorie.includes(a.categoria) ? a.categoria : 'Altro') === c)]).filter(g => g[1].length);
    $('#view').innerHTML = `
      <div class="field" style="margin-bottom:10px"><input type="search" id="cerca" placeholder="🔎 Cerca un attrezzo, una posizione…" value="${esc(st.cerca)}" autocomplete="off"></div>
      ${cats.length > 1 ? `<div class="pills"><button class="${st.invCat === 'tutte' ? 'on' : ''}" data-act="cat" data-v="tutte">✨ Tutte</button>
        ${cats.map(c => `<button class="${st.invCat === c ? 'on' : ''}" data-act="cat" data-v="${esc(c)}">${CONFIG.emojiCategoria[c]} ${esc(c)}</button>`).join('')}</div>` : ''}
      ${tutti.length ? `<div class="pills" style="margin-top:4px"><button class="${st.invStato === 'tutti' ? 'on' : ''}" data-act="stato" data-v="tutti">Tutti</button>
        ${CONFIG.stati.map(s => `<button class="${st.invStato === s ? 'on' : ''}" data-act="stato" data-v="${s}">${CONFIG.emojiStato[s]} ${s} (${tutti.filter(a => (a.stato || 'Funziona') === s).length})</button>`).join('')}</div>` : ''}
      <div id="invList">${this.listaInventario(gruppi, tutti.length)}</div>
      <div class="spacer"></div>
      <button class="btn block" data-act="new" data-table="attrezzi">${ICON.plus} Nuovo attrezzo</button>`;
    const inp = $('#cerca');
    inp.oninput = () => { st.cerca = inp.value; this.vInventarioLista(); };
    const on = $('#view .pills button.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  },
  vInventarioLista() {
    // aggiorna solo la lista, così la tastiera resta aperta mentre cerchi
    const st = this.state, q = st.cerca.trim().toLowerCase();
    let list = this.attrezzi().filter(a => (st.invCat === 'tutte' || a.categoria === st.invCat) && (st.invStato === 'tutti' || (a.stato || 'Funziona') === st.invStato));
    if (q) list = list.filter(a => [a.nome, a.posizione, a.marca, a.modello, a.note, a.categoria].join(' ').toLowerCase().includes(q));
    const gruppi = CONFIG.categorie.map(c => [c, list.filter(a => (CONFIG.categorie.includes(a.categoria) ? a.categoria : 'Altro') === c)]).filter(g => g[1].length);
    $('#invList').innerHTML = this.listaInventario(gruppi, DB.list('attrezzi').length);
  },
  listaInventario(gruppi, totale) {
    if (!totale) return this.empty('🧰', 'Nessun attrezzo', 'Aggiungi quello che hai in baracca. Per iniziare posso mettere i tuoi attrezzi da giardino.',
      `<button class="btn" data-act="precarica">${ICON.plus} Motoseghe, decespugliatori e sega a banco</button>`);
    if (!gruppi.length) return this.empty('🔎', 'Niente da mostrare', 'Nessun attrezzo con questi filtri.');
    return gruppi.map(([c, items]) => `<div class="day-label" style="display:flex;justify-content:space-between"><span>${CONFIG.emojiCategoria[c]} ${esc(c)}</span><span>${items.length}</span></div>
      <div class="list">${items.map(a => this.itemAttrezzo(a)).join('')}</div>`).join('');
  },

  async precarica() {
    const esistenti = new Set(DB.list('attrezzi').map(a => (a.nome || '').toLowerCase()));
    let n = 0;
    for (const a of ATTREZZI_GIARDINO) {
      if (esistenti.has(a.nome.toLowerCase())) continue;
      await DB.save('attrezzi', { ...a, quantita: 1, stato: 'Funziona', posizione: '', createdAt: new Date().toISOString() });
      n++;
    }
    this.toast(n ? `Aggiunti ${n} attrezzi ✓ Rinominali come vuoi` : 'Ci sono già tutti');
    this.render();
  },

  /* ---------- Scheda attrezzo ---------- */
  vAttrezzo(id) {
    const a = DB.get('attrezzi', id);
    if (!a) { location.hash = '#inventario'; return; }
    this.setTitle(a.nome);
    const q = a.quantita === '' || a.quantita == null ? 1 : num(a.quantita);
    const man = this.manutenzioni(id);
    const speso = man.reduce((s, m) => s + num(m.costo), 0);
    const anno = String(new Date().getFullYear());
    const kv = [['Categoria', a.categoria], ['Posizione', a.posizione], ['Marca', a.marca], ['Modello', a.modello],
      ['Prestato a', a.stato === 'Prestato' ? a.prestatoA : '']].filter(x => x[1]);
    $('#view').innerHTML = `
      <div class="card">
        <div class="vhead">
          ${this.avatar(a, 'lg')}
          <div style="flex:1;min-width:0">
            <div class="vname" style="font-size:21px">${esc(a.nome)}</div>
            <div class="vsub">${esc([a.marca, a.modello].filter(Boolean).join(' ') || a.categoria || '')}</div>
            <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap">${this.chipStato(a)}${a.posizione ? `<span class="chip">📍 ${esc(a.posizione)}</span>` : ''}</div>
          </div>
          <button class="icon-btn" data-edit="attrezzi:${a.id}" aria-label="Modifica">${ICON.edit}</button>
        </div>
        <div class="qty-row">
          <span>Quantità</span>
          <div class="stepper">
            <button class="icon-btn" data-act="qty" data-id="${a.id}" data-d="-1" aria-label="Meno">${ICON.minus}</button>
            <b>${F.num(q)}</b>
            <button class="icon-btn" data-act="qty" data-id="${a.id}" data-d="1" aria-label="Più">${ICON.plus}</button>
          </div>
        </div>
      </div>
      ${a.manutenzione ? `
        <div class="section-title"><h3>Manutenzione</h3></div>
        <div class="grid grid-2">
          ${this.stat('💶 Speso in tutto', F.eur(speso))}
          ${this.stat('📅 Speso nel ' + anno, F.eur(man.filter(m => (m.data || '').startsWith(anno)).reduce((s, m) => s + num(m.costo), 0)))}
          ${this.stat('🔧 Interventi', F.num(man.length))}
          ${this.stat('🗓️ Ultimo', man[0] ? D.fmt(man[0].data) : '—')}
        </div>
        <button class="btn block" style="margin-top:12px" data-act="new" data-table="manutenzioni" data-aid="${a.id}">${ICON.plus} Nuova manutenzione</button>
        ${man.length ? `<div class="list" style="margin-top:12px">${man.map(m => this.itemManutenzione(m, false)).join('')}</div>` : ''}` : ''}
      ${kv.length ? `<div class="section-title"><h3>Dettagli</h3></div><div class="kv">${kv.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
      ${a.note ? `<div class="card" style="margin-top:12px"><div class="muted">📝 Note</div>${esc(a.note)}</div>` : ''}
      ${!a.manutenzione ? `<p class="muted" style="margin:16px 6px">Vuoi segnare le spese di manutenzione? Tocca ✏️ e attiva "Tieni traccia della manutenzione".</p>` : ''}`;
  },

  /* =========================================================
     DA COMPRARE
     ========================================================= */
  itemComprare(c) {
    const sub = [];
    if (c.categoria) sub.push(esc(c.categoria));
    if (num(c.quantita) > 1) sub.push('×' + F.num(num(c.quantita)));
    if (c.negozio) sub.push('🏪 ' + esc(c.negozio));
    if (c.comprato && c.compratoIl) sub.push('comprato il ' + D.fmt(c.compratoIl));
    const prezzo = num(c.prezzo) * (num(c.quantita) || 1);
    return `
      <div class="item buy ${c.comprato ? 'done' : ''}" data-edit="comprare:${c.id}">
        <button class="tick" data-act="compra" data-id="${c.id}" aria-label="${c.comprato ? 'Rimetti in lista' : 'Segna come comprato'}">${c.comprato ? ICON.check : ''}</button>
        <div class="main"><div class="t">${!c.comprato ? (CONFIG.emojiPriorita[c.priorita] || '🟡') + ' ' : ''}${esc(c.nome)}</div><div class="s">${sub.join(' · ') || '&nbsp;'}</div></div>
        <div class="r">${prezzo ? `<b>${F.eur(prezzo)}</b>` : ''}
          ${c.comprato && !c.inInventario ? `<button class="link" data-act="in-inventario" data-id="${c.id}">➕ In baracca</button>` : ''}</div>
      </div>`;
  },

  vComprare() {
    this.setTitle('Da comprare');
    const lista = this.daComprare();
    const fatti = DB.list('comprare').filter(c => c.comprato).sort((a, b) => (b.compratoIl || '').localeCompare(a.compratoIl || ''));
    const tot = this.totaleStimato(lista);
    $('#view').innerHTML = `
      <form class="add-row" id="frmVeloce">
        <input type="text" id="nuovoNome" placeholder="Cosa ti serve? es. catena 3/8" autocomplete="off" enterkeyhint="done">
        <button class="btn" type="submit" aria-label="Aggiungi">${ICON.plus}</button>
      </form>
      ${lista.length ? `
        <div class="hero" style="margin-top:12px">
          <div class="label">Da comprare</div>
          <div class="big">${lista.length} ${lista.length === 1 ? 'articolo' : 'articoli'}</div>
          <div class="muted">${tot ? 'Spesa stimata ' + F.eur(tot) : 'Aggiungi un prezzo per avere la stima'}</div>
        </div>
        ${CONFIG.priorita.map(p => { const l = lista.filter(c => (c.priorita || 'Media') === p); return l.length ? `<div class="day-label">${CONFIG.emojiPriorita[p]} Priorità ${p.toLowerCase()}</div><div class="list">${l.map(c => this.itemComprare(c)).join('')}</div>` : ''; }).join('')}`
        : `<div class="spacer"></div>${this.empty('🛒', 'Lista vuota', 'Scrivi qui sopra cosa ti serve e premi +. Quando lo compri, tocca il cerchio.')}`}
      ${fatti.length ? `
        <div class="section-title"><h3>Già comprati (${fatti.length})</h3><button class="link" data-act="mostra-comprati">${this.state.mostraComprati ? 'Nascondi' : 'Mostra'}</button></div>
        ${this.state.mostraComprati ? `<div class="list">${fatti.map(c => this.itemComprare(c)).join('')}</div>
          <button class="btn secondary block" style="margin-top:12px" data-act="pulisci-comprati">${ICON.trash} Togli i comprati dalla lista</button>` : ''}` : ''}`;
    $('#frmVeloce').onsubmit = async e => {
      e.preventDefault();
      const nome = $('#nuovoNome').value.trim();
      if (!nome) { this.openForm('comprare'); return; }
      await DB.save('comprare', { nome, priorita: 'Media', quantita: 1, comprato: false });
      this.toast('Aggiunto alla lista 🛒');
      this.render();
      $('#nuovoNome').focus();
    };
  },

  /** Articolo comprato → nuovo attrezzo (o +1 se esiste già) */
  async inInventario(id) {
    const c = DB.get('comprare', id); if (!c) return;
    const esiste = DB.list('attrezzi').find(a => (a.nome || '').toLowerCase() === (c.nome || '').toLowerCase());
    if (esiste && confirm(`"${esiste.nome}" c'è già in baracca. Aumento la quantità di ${F.num(num(c.quantita) || 1)}?`)) {
      await DB.save('attrezzi', { ...esiste, quantita: num(esiste.quantita || 1) + (num(c.quantita) || 1) });
      await DB.save('comprare', { ...c, inInventario: true });
      this.toast('Quantità aggiornata ✓'); this.render(); return;
    }
    await DB.save('comprare', { ...c, inInventario: true });
    this.openForm('attrezzi', null, { nome: c.nome, categoria: c.categoria, quantita: num(c.quantita) || 1, note: c.note });
  },

  /* =========================================================
     MANUTENZIONE
     ========================================================= */
  itemManutenzione(m, mostraAttrezzo) {
    const a = DB.get('attrezzi', m.attrezzoId);
    const s = (mostraAttrezzo ? esc(a ? a.nome : '—') + ' · ' : '') + D.fmt(m.data) + (m.descrizione ? ' · ' + esc(m.descrizione) : '');
    return `
      <div class="item" data-edit="manutenzioni:${m.id}">
        <div class="ic t-maint">${CONFIG.emojiManutenzione[m.tipo] || '🔧'}</div>
        <div class="main"><div class="t">${esc(m.tipo || 'Manutenzione')}</div><div class="s">${s}</div></div>
        <div class="r"><b>${F.eur(num(m.costo))}</b></div>
      </div>`;
  },

  vManutenzione() {
    this.setTitle('Manutenzione');
    const st = this.state;
    const tutte = this.manutenzioni();
    const anni = [...new Set(tutte.map(m => (m.data || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    if (st.manAnno !== 'tutti' && !anni.includes(st.manAnno)) st.manAnno = 'tutti';
    const lista = st.manAnno === 'tutti' ? tutte : tutte.filter(m => (m.data || '').startsWith(st.manAnno));
    const tot = lista.reduce((s, m) => s + num(m.costo), 0);
    const att = this.conManutenzione();
    if (!att.length && !tutte.length) {
      $('#view').innerHTML = this.empty('🔧', 'Nessun attrezzo da seguire', 'Qui segni le spese per motoseghe, decespugliatori e simili. Vuoi che li aggiunga io?',
        `<button class="btn" data-act="precarica">${ICON.plus} Aggiungi i tuoi attrezzi da giardino</button>`);
      return;
    }
    const perAtt = att.map(a => { const l = lista.filter(m => m.attrezzoId === a.id); return { a, n: l.length, tot: l.reduce((s, m) => s + num(m.costo), 0), ultima: this.manutenzioni(a.id)[0] }; })
      .sort((x, y) => y.tot - x.tot);
    // raggruppa per mese
    const gruppi = [];
    lista.forEach(m => { const k = (m.data || '').slice(0, 7); if (!gruppi.length || gruppi[gruppi.length - 1].k !== k) gruppi.push({ k, items: [] }); gruppi[gruppi.length - 1].items.push(m); });
    $('#view').innerHTML = `
      ${anni.length ? `<div class="pills"><button class="${st.manAnno === 'tutti' ? 'on' : ''}" data-act="anno" data-v="tutti">Sempre</button>
        ${anni.map(y => `<button class="${st.manAnno === y ? 'on' : ''}" data-act="anno" data-v="${y}">${y}</button>`).join('')}</div>` : ''}
      <div class="hero" style="margin-top:8px">
        <div class="label">Speso in manutenzione ${st.manAnno === 'tutti' ? 'in tutto' : 'nel ' + st.manAnno}</div>
        <div class="big">${F.eur(tot)}</div>
        <div class="muted">${lista.length} ${lista.length === 1 ? 'intervento' : 'interventi'}</div>
      </div>
      <button class="btn block" style="margin-top:12px" data-act="new" data-table="manutenzioni">${ICON.plus} Nuova manutenzione</button>
      ${perAtt.length ? `<div class="section-title"><h3>Per attrezzo</h3></div>
        <div class="list">${perAtt.map(x => `
          <div class="item" data-go="#attrezzo/${x.a.id}">
            ${this.avatar(x.a, 'item-av')}
            <div class="main"><div class="t">${esc(x.a.nome)}</div><div class="s">${x.n} ${x.n === 1 ? 'intervento' : 'interventi'}${x.ultima ? ' · ultimo ' + D.fmt(x.ultima.data) : ''}</div></div>
            <div class="r"><b>${F.eur(x.tot)}</b></div>
          </div>`).join('')}</div>` : ''}
      ${gruppi.length ? `<div class="section-title"><h3>Storico</h3></div>` + gruppi.map(g => {
        const t = g.items.reduce((s, m) => s + num(m.costo), 0);
        const lab = g.k ? D.monthLong(+g.k.slice(5) - 1) + ' ' + g.k.slice(0, 4) : 'Senza data';
        return `<div class="day-label" style="display:flex;justify-content:space-between"><span>${lab}</span><span>${F.eur(t, 0)}</span></div>
          <div class="list">${g.items.map(m => this.itemManutenzione(m, true)).join('')}</div>`;
      }).join('') : ''}`;
  },

  /* =========================================================
     ALTRO
     ========================================================= */
  vAltro() {
    this.setTitle('Altro');
    const tema = TEMI.find(x => x.k === this.state.colore) || TEMI[0];
    const item = (act, em, cls, t, s) => `<div class="item" ${act}><div class="ic ${cls}">${em}</div><div class="main"><div class="t">${t}</div><div class="s">${s}</div></div>${ICON.chevron}</div>`;
    $('#view').innerHTML = `
      <div class="list">
        ${item('data-act="sheets"', '📗', 't-exp', 'Google Sheets', Sync.attivo() ? (Sync.stato === 'errore' ? '⚠️ Errore di sincronizzazione' : 'Collegato · sincronizzazione automatica') : 'Non collegato · tocca per collegare')}
        ${item('data-act="temi"', tema.e, 't-fuel', 'Temi e colori', tema.n)}
        ${item('data-act="nome"', '🙂', 't-exp', 'Il tuo nome', this.state.nome ? esc(this.state.nome) : 'Per il saluto in Home')}
      </div>
      <div class="section-title"><h3>Backup dei dati</h3></div>
      <div class="card">
        <div class="note-box">${Sync.attivo() ? '✅ I dati sono sul telefono <b>e</b> nel foglio Google. Le foto degli attrezzi restano solo sul telefono: il backup su file le salva.' : '⚠️ I dati sono salvati <b>solo su questo telefono</b>. Collega Google Sheets oppure fai ogni tanto un backup.'}</div>
        <div class="btn-row">
          <button class="btn" data-act="export">${ICON.download} Scarica</button>
          <button class="btn secondary" data-act="import">${ICON.upload} Ripristina</button>
        </div>
      </div>
      <div class="section-title"><h3>Informazioni</h3></div>
      <div class="kv">
        <div><span>Versione</span><b>${APP_VERSION}</b></div>
        <div><span>Attrezzi</span><b>${DB.list('attrezzi').length}</b></div>
        <div><span>Da comprare</span><b>${this.daComprare().length}</b></div>
        <div><span>Manutenzioni</span><b>${DB.list('manutenzioni').length}</b></div>
      </div>`;
  },

  openNomeSheet() {
    this.openSheet('Come ti chiami?', `<form class="form" id="frmNome">
      <div class="field"><label for="nNome">Il tuo nome</label><input id="nNome" type="text" maxlength="30" value="${esc(this.state.nome)}" placeholder="es. Federico"></div>
      <button class="btn block" type="submit">Salva</button></form>`);
    $('#frmNome').onsubmit = e => { e.preventDefault(); this.state.nome = $('#nNome').value.trim(); this.saveUi(); this.closeSheet(); this.render(); };
  },

  exportBackup() {
    const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'baracca-backup-' + D.today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.toast('Backup scaricato ✓');
  },
  importBackup() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      if (!confirm('Il ripristino SOSTITUISCE tutti i dati attuali con quelli del file. Continuare?')) return;
      try { await DB.importJSON(await f.text()); this.toast('Dati ripristinati ✓'); this.render(); }
      catch (e) { alert('Impossibile leggere il file: ' + e.message); }
    };
    inp.click();
  },

  /* ---------- Finestra dal basso ---------- */
  openSheet(title, html) {
    $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html;
    const era = $('#sheet').hidden;
    $('#sheet').hidden = false; $('#sheetBackdrop').hidden = false;
    if (era) $('#sheetBody').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  },
  closeSheet() {
    const aperto = !$('#sheet').hidden;
    $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true; document.body.style.overflow = '';
    if (aperto && this._needRender) { this._needRender = false; this.render(); }
  },
  refresh() { if ($('#sheet').hidden) this.render(); else this._needRender = true; },

  /* ---------- Google Sheets ---------- */
  updateSyncIcon() {
    const b = $('#btnSync'); if (!b) return;
    b.hidden = Sync.stato === 'off';
    b.className = 'icon-btn sync-' + Sync.stato;
    b.innerHTML = Sync.stato === 'offline' || Sync.stato === 'errore' ? ICON.cloudOff : (Sync.stato === 'sync' ? ICON.refresh : ICON.cloud);
    b.title = { ok: 'Sincronizzato', sync: 'Sincronizzazione…', errore: 'Errore: ' + Sync.errore, offline: 'Offline' }[Sync.stato] || '';
    const st = document.getElementById('syncStatus'); if (st) st.innerHTML = this.syncStatusHTML();
  },
  syncStatusHTML() {
    const c = Sync.cfg();
    const quando = c.lastSync ? new Date(c.lastSync).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'mai';
    const map = { ok: ['good', '● Collegato'], sync: ['warn', '↻ Sincronizzazione…'], errore: ['bad', '● Errore'], offline: ['warn', '● Offline'], off: ['', '○ Non collegato'] };
    const [cls, txt] = map[Sync.stato] || map.off;
    return `<span class="chip ${cls}">${txt}</span> <span class="muted">Ultima sincronizzazione: ${quando}</span>${Sync.stato === 'errore' ? `<div class="muted" style="color:var(--bad);margin-top:6px">${esc(Sync.errore)}</div>` : ''}`;
  },
  openSyncSheet() {
    const c = Sync.cfg(), on = Sync.attivo();
    this.openSheet('Google Sheets', `
      <div id="syncStatus" style="margin-bottom:14px">${this.syncStatusHTML()}</div>
      ${on ? `
        <div class="note-box">Ogni modifica va nel foglio in automatico; quelle fatte nel foglio arrivano quando apri l'app o tocchi la nuvola in alto.</div>
        <div class="btn-row"><button class="btn" id="btnSyncNow">${ICON.refresh} Sincronizza ora</button><button class="btn secondary" id="btnScollega">Scollega</button></div>
        <p class="muted" style="margin-top:14px;word-break:break-all">Collegato a: ${esc(c.url)}</p>` : `
        <form class="form" id="frmSync">
          <div class="field"><label for="sUrl">Indirizzo dell'app web (Apps Script)</label>
            <input id="sUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" required>
            <div class="hint">Apps Script → Distribuisci → Gestisci deployment</div></div>
          <div class="field"><label for="sTok">Codice segreto</label>
            <input id="sTok" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" required>
            <div class="hint">Lo stesso che hai scritto in CODICE_SEGRETO nello script</div></div>
          <button type="submit" class="btn block" id="btnCollega">${ICON.cloud} Collega e sincronizza</button>
        </form>`}`);
    if (on) {
      $('#btnSyncNow').onclick = () => Sync.run(true).then(() => this.openSyncSheet());
      $('#btnScollega').onclick = () => { if (!confirm('Scollegare il foglio Google? I dati restano sia qui sia nel foglio.')) return; Sync.scollega(); this.openSyncSheet(); };
    } else {
      $('#frmSync').onsubmit = async e => {
        e.preventDefault();
        const btn = $('#btnCollega'); btn.disabled = true; btn.textContent = 'Collegamento in corso…';
        try { await Sync.collega($('#sUrl').value, $('#sTok').value); this.toast('Collegato a Google Sheets ✓'); this.openSyncSheet(); this._needRender = true; }
        catch (err) { btn.disabled = false; btn.innerHTML = ICON.cloud + ' Collega e sincronizza'; alert('Collegamento non riuscito:\n' + err.message); }
      };
    }
  },

  quickAdd() {
    const hash = location.hash;
    const aid = hash.startsWith('#attrezzo/') ? hash.split('/')[1] : '';
    if (hash === '#comprare') { this.openForm('comprare'); return; }
    const opt = (t, em, cls, title, sub) => `<button data-q="${t}"><span class="em ${cls}">${em}</span><div>${title}<small>${sub}</small></div></button>`;
    this.openSheet('Cosa vuoi aggiungere?', `<div class="quick">
      ${opt('attrezzi', '🧰', 't-fuel', 'Attrezzo', 'Qualcosa che hai in baracca')}
      ${opt('comprare', '🛒', 't-exp', 'Da comprare', 'Qualcosa che ti serve')}
      ${opt('manutenzioni', '🔧', 't-maint', 'Manutenzione', 'Spesa per sistemare un attrezzo')}
    </div>`);
    $('#sheetBody').querySelectorAll('[data-q]').forEach(b => b.onclick = () => this.openForm(b.dataset.q, null, { attrezzoId: aid }));
  },

  /* =========================================================
     MODULI
     ========================================================= */
  forms: {
    attrezzi: {
      titolo: ['🧰 Nuovo attrezzo', '🧰 Modifica attrezzo'],
      campi: () => [
        { k: 'foto', type: 'photo' },
        { k: 'nome', label: 'Cos\'è?', placeholder: 'es. Avvitatore Makita', req: true },
        { k: 'categoria', label: 'Categoria', type: 'chips', options: CONFIG.categorie.map(c => ({ v: c, e: CONFIG.emojiCategoria[c] })), req: true },
        [{ k: 'quantita', label: 'Quantità', type: 'int', def: 1 }, { k: 'posizione', label: 'Dove sta', placeholder: 'es. scaffale 2' }],
        { k: 'stato', label: 'Stato', type: 'chips', options: CONFIG.stati.map(s => ({ v: s, e: CONFIG.emojiStato[s] })) },
        { k: 'prestatoA', label: 'Prestato a', placeholder: 'es. zio Gino', showIf: 'stato=Prestato' },
        { k: 'manutenzione', label: 'Tieni traccia della manutenzione', type: 'switch', def: false, hint: 'Per motoseghe, decespugliatori e simili' },
        { more: [[{ k: 'marca', label: 'Marca', placeholder: 'es. Stihl' }, { k: 'modello', label: 'Modello', placeholder: 'es. MS 180' }], { k: 'note', label: 'Note', type: 'textarea' }] }
      ],
      mount(root, rec) {
        const q = n => root.querySelector(`[name=${n}]`);
        q('categoria').addEventListener('change', () => { if (!rec && CONFIG.categorieMotore.includes(q('categoria').value)) q('manutenzione').checked = true; });
      }
    },
    comprare: {
      titolo: ['🛒 Da comprare', '🛒 Modifica articolo'],
      campi: () => [
        { k: 'nome', label: 'Cosa ti serve?', placeholder: 'es. catena 3/8 per motosega', req: true },
        { k: 'priorita', label: 'Quanto è urgente?', type: 'chips', options: CONFIG.priorita.map(p => ({ v: p, e: CONFIG.emojiPriorita[p] })) },
        [{ k: 'quantita', label: 'Quantità', type: 'int', def: 1 }, { k: 'prezzo', label: 'Prezzo stimato €', type: 'dec', hint: 'Per pezzo' }],
        { k: 'categoria', label: 'Categoria', type: 'chips', options: [{ v: '', l: 'Nessuna' }].concat(CONFIG.categorie.map(c => ({ v: c, e: CONFIG.emojiCategoria[c] }))) },
        { more: [{ k: 'negozio', label: 'Dove comprarlo', placeholder: 'es. Brico, Amazon, ferramenta' }, { k: 'note', label: 'Note', type: 'textarea' }] }
      ]
    },
    manutenzioni: {
      titolo: ['🔧 Nuova manutenzione', '🔧 Modifica manutenzione'],
      campi: () => [
        { k: 'attrezzoId', label: 'Attrezzo', type: 'attrezzo', req: true },
        { k: 'tipo', label: 'Cosa hai fatto?', type: 'chips', options: CONFIG.tipiManutenzione.map(t => ({ v: t, e: CONFIG.emojiManutenzione[t] })), req: true },
        [{ k: 'data', label: 'Data', type: 'date', req: true }, { k: 'costo', label: 'Costo €', type: 'dec', big: true }],
        { k: 'descrizione', label: 'Descrizione', placeholder: 'es. catena nuova + affilatura' },
        { more: [{ k: 'note', label: 'Note', type: 'textarea' }] }
      ],
      valida(o) { if (!o.costo && !o.descrizione) { UI.toast('Aggiungi almeno il costo o una descrizione'); return false; } return true; }
    }
  },

  chipsHTML(options, val) {
    return options.map(o => {
      const x = typeof o === 'string' ? { v: o } : o;
      return `<button type="button" data-v="${esc(x.v)}" class="${String(val) === String(x.v) ? 'on' : ''}">${x.e ? `<span>${x.e}</span>` : ''}${esc(x.l ?? x.v)}</button>`;
    }).join('');
  },
  setChip(root, k, val) {
    const inp = root.querySelector(`[name="${k}"]`);
    inp.value = val;
    root.querySelectorAll(`.chips[data-for="${k}"] button`).forEach(b => b.classList.toggle('on', b.dataset.v === String(val)));
    inp.dispatchEvent(new Event('change'));
  },

  fieldHTML(f, rec) {
    const val = rec[f.k] ?? (f.def !== undefined ? f.def : '');
    const id = 'f_' + f.k, req = f.req ? ' required' : '';
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    const hint = f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '';
    const lab = `<label for="${id}">${esc(f.label)}</label>`;
    const wrap = html => f.showIf ? `<div data-showif="${f.showIf}">${html}</div>` : html;
    switch (f.type) {
      case 'chips':
        return wrap(`<div class="field"><span class="lbl">${esc(f.label)}</span><input type="hidden" name="${f.k}" value="${esc(val)}">
          <div class="chips" data-for="${f.k}">${this.chipsHTML(f.options, val)}</div>${hint}</div>`);
      case 'attrezzo': {
        let list = this.conManutenzione();
        if (!list.length) list = this.attrezzi();
        const cur = DB.get('attrezzi', val);
        if (cur && !list.includes(cur)) list = [cur, ...list];
        if (!list.length) return `<div class="note-box">Prima aggiungi un attrezzo in Inventario.</div><input type="hidden" name="${f.k}" value="">`;
        if (list.length === 1) return `<input type="hidden" name="${f.k}" value="${esc(list[0].id)}"><div class="field"><span class="lbl">${esc(f.label)}</span><div class="chips"><button type="button" class="on">${this.avatar(list[0], 'sm')}${esc(list[0].nome)}</button></div></div>`;
        return `<div class="field"><span class="lbl">${esc(f.label)}</span><input type="hidden" name="${f.k}" value="${esc(val)}">
          <div class="chips scroll" data-for="${f.k}">${list.map(a => `<button type="button" data-v="${a.id}" class="${val === a.id ? 'on' : ''}">${this.avatar(a, 'sm')}${esc(a.nome)}</button>`).join('')}</div></div>`;
      }
      case 'date': return `<div class="field">${lab}<input type="date" id="${id}" name="${f.k}" value="${esc(val)}"${req}>${hint}</div>`;
      case 'int': return `<div class="field">${lab}<input type="number" inputmode="numeric" step="1" min="0" id="${id}" name="${f.k}" value="${esc(val)}"${ph}${req}>${hint}</div>`;
      case 'dec': return `<div class="field">${lab}<input type="text" inputmode="decimal" id="${id}" name="${f.k}" class="${f.big ? 'big' : ''}" value="${val === '' ? '' : esc(String(val).replace('.', ','))}"${ph}${req} autocomplete="off">${hint}</div>`;
      case 'textarea': return `<div class="field">${lab}<textarea id="${id}" name="${f.k}"${ph}>${esc(val)}</textarea>${hint}</div>`;
      case 'switch': return `<label class="switch"><span>${esc(f.label)}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</span><input type="checkbox" name="${f.k}" ${val === true || val === 'true' ? 'checked' : ''}><span class="tog"></span></label>`;
      case 'photo': return `<div class="field"><div class="photo-pick">
          <div class="vavatar" id="photoPrev">${val ? `<img src="${val}" alt="">` : '📷'}</div>
          <button type="button" class="btn secondary" id="photoBtn">${val ? 'Cambia foto' : 'Aggiungi una foto'}</button>
          ${val ? '<button type="button" class="link" id="photoDel">Rimuovi</button>' : ''}</div></div>`;
      default: return wrap(`<div class="field">${lab}<input type="text" id="${id}" name="${f.k}" value="${esc(val)}"${ph}${req} autocomplete="off">${hint}</div>`);
    }
  },
  campiHTML(campi, rec) {
    return campi.map(c => {
      if (Array.isArray(c)) return `<div class="row2">${c.map(f => this.fieldHTML(f, rec)).join('')}</div>`;
      if (c.more) return `<details class="more"${c.more.some(f => [f].flat().some(x => rec[x.k])) ? ' open' : ''}><summary>Altri dettagli</summary><div class="form">${this.campiHTML(c.more, rec)}</div></details>`;
      return this.fieldHTML(c, rec);
    }).join('');
  },
  appiattisci(campi) { return campi.flatMap(c => Array.isArray(c) ? c : c.more ? this.appiattisci(c.more) : [c]); },

  openForm(table, id, preset = {}) {
    const def = this.forms[table];
    const rec = id ? { ...DB.get(table, id) } : {};
    if (!id) {
      if (table === 'attrezzi') Object.assign(rec, { categoria: preset.categoria || 'Utensili a mano', stato: 'Funziona', quantita: 1 },
        Object.fromEntries(Object.entries(preset).filter(([k, v]) => ['nome', 'categoria', 'quantita', 'note'].includes(k) && v)));
      if (table === 'comprare') Object.assign(rec, { priorita: 'Media', quantita: 1, categoria: '' });
      if (table === 'manutenzioni') {
        rec.data = D.today(); rec.tipo = 'Tagliando';
        const lista = this.conManutenzione();
        rec.attrezzoId = preset.attrezzoId && DB.get('attrezzi', preset.attrezzoId) ? preset.attrezzoId : (lista[0] || this.attrezzi()[0] || {}).id || '';
      }
      if (table === 'attrezzi' && CONFIG.categorieMotore.includes(rec.categoria)) rec.manutenzione = true;
    }
    const campi = def.campi(rec), flat = this.appiattisci(campi);
    this.openSheet(def.titolo[id ? 1 : 0], `
      <form class="form" id="frm" novalidate>
        ${this.campiHTML(campi, rec)}
        <div class="sheet-foot">
          ${id ? `<button type="button" class="btn danger" id="btnDel" aria-label="Elimina">${ICON.trash}</button>` : ''}
          <button type="submit" class="btn">${id ? 'Salva modifiche' : 'Salva'}</button>
        </div>
      </form>`);
    const root = $('#frm');
    const showIf = () => root.querySelectorAll('[data-showif]').forEach(el => {
      const [k, v] = el.dataset.showif.split('='); el.hidden = (root.querySelector(`[name="${k}"]`) || {}).value !== v;
    });
    root.addEventListener('click', e => {
      const b = e.target.closest('.chips[data-for] button'); if (!b) return;
      const box = b.closest('.chips'); box.classList.remove('err');
      this.setChip(root, box.dataset.for, b.dataset.v); showIf();
    });
    showIf();
    if (def.mount) def.mount(root, id ? rec : null);
    root.querySelectorAll('.chips button.on').forEach(b => b.scrollIntoView({ block: 'nearest', inline: 'center' }));

    let foto = rec.foto || '';
    if ($('#photoBtn')) {
      $('#photoBtn').onclick = () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async () => { if (!inp.files[0]) return; foto = await this.resizeImage(inp.files[0], 640); $('#photoPrev').innerHTML = `<img src="${foto}" alt="">`; };
        inp.click();
      };
      const del = $('#photoDel'); if (del) del.onclick = () => { foto = ''; $('#photoPrev').textContent = '📷'; del.remove(); };
    }

    root.onsubmit = async e => {
      e.preventDefault();
      const o = { ...rec };
      for (const f of flat) {
        if (f.type === 'photo') continue;
        const el = root.querySelector(`[name="${f.k}"]`); if (!el) continue;
        if (f.type === 'switch') o[f.k] = el.checked;
        else if (f.type === 'int' || f.type === 'dec') o[f.k] = el.value.trim() === '' ? '' : num(el.value);
        else o[f.k] = el.value.trim();
      }
      if (table === 'attrezzi') { o.foto = foto; if (!o.createdAt) o.createdAt = new Date().toISOString(); if (o.stato !== 'Prestato') o.prestatoA = ''; }
      root.querySelectorAll('.err').forEach(x => x.classList.remove('err'));
      const missing = flat.filter(f => f.req && (o[f.k] === '' || o[f.k] === undefined));
      if (missing.length) {
        missing.forEach(f => { const el = root.querySelector(`.chips[data-for="${f.k}"]`) || root.querySelector(`[name="${f.k}"]`); if (el) el.classList.add('err'); });
        this.toast('Manca: ' + missing.map(f => f.label.replace(/^\W+\s/, '')).join(', '));
        return;
      }
      if (def.valida && !def.valida(o)) return;
      await DB.save(table, o);
      this.closeSheet();
      this.toast(id ? 'Modifiche salvate ✓' : { attrezzi: 'In baracca! 🧰', comprare: 'Aggiunto alla lista 🛒', manutenzioni: 'Manutenzione salvata 🔧' }[table]);
      this.render();
    };

    const del = $('#btnDel');
    if (del) del.onclick = async () => {
      if (table === 'attrezzi') {
        const n = this.manutenzioni(id).length;
        if (!confirm(`Eliminare "${rec.nome}"${n ? ` e le sue ${n} manutenzioni` : ''}?`)) return;
        await DB.removeAttrezzo(id); this.closeSheet(); this.toast('Eliminato');
        location.hash = '#inventario'; this.render();
      } else {
        if (!confirm('Eliminare questo elemento?')) return;
        await DB.remove(table, id); this.closeSheet(); this.toast('Eliminato'); this.render();
      }
    };
  },

  resizeImage(file, max, q = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src); resolve(c.toDataURL('image/jpeg', q));
      };
      img.onerror = reject; img.src = URL.createObjectURL(file);
    });
  }
};

UI.init().catch(err => {
  document.getElementById('view').innerHTML = `<div class="card"><b>Errore di avvio</b><p class="muted">${esc(err.message || err)}</p></div>`;
  console.error(err);
});
