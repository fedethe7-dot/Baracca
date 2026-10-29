/* =========================================================
   BARACCA — gestionecasa.js
   Dal 2027 le spese della baracca finiscono da sole in
   Gestione Casa, categoria 🧰 Baracca (creata se manca):
   - manutenzioni con un costo  → "Manutenzione attrezzi"
   - cose comprate con un prezzo → "Acquisto attrezzi" (prezzo × quantità)
   Paga chi paga di solito nella casa (si cambia poi in Gestione Casa).
   Modifiche ed eliminazioni qui si riflettono anche là.
   Accesso: la sessione di Gestione Casa sullo stesso telefono
   oppure la chiave di sistema dell'hub "Le mie app".
   ========================================================= */

const SpeseCasa = {
  URL: 'https://script.google.com/macros/s/AKfycbx_UKlBm4SKEYtPWrUO9bh1MuMBBKSzJbpgFQj1j9pbW5oFF3bkJL5DevaKj1rF537-wA/exec',
  DAL: '2027-01-01',
  CAT: { id: 'baracca', name: 'Baracca', emoji: '🧰', base: true },
  PREF: 'ebar_',               // id delle spese create da qui: ebar_m_<manutenzione> / ebar_c_<acquisto>
  K_SESS: 'baracca-gcSess',
  K_USATO: 'baracca-gcUsato',
  _busy: false, _again: false, _t: null,

  ls(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  raw(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  cent(v) { return Math.round((parseFloat(String(v == null ? '' : v).replace(/[€\s]/g, '').replace(',', '.')) || 0) * 100); },

  /** Le spese che devono esserci in Gestione Casa */
  voglio() {
    const out = {};
    DB.list('manutenzioni').forEach(m => {
      const c = this.cent(m.costo), d = String(m.data || '').slice(0, 10);
      if (c > 0 && d >= this.DAL) out[this.PREF + 'm_' + m.id] = { cent: c, data: d, desc: 'Manutenzione attrezzi' };
    });
    DB.list('comprare').forEach(x => {
      const q = parseFloat(String(x.quantita || '1').replace(',', '.')) || 1;
      const c = Math.round(this.cent(x.prezzo) * q), d = String(x.compratoIl || '').slice(0, 10);
      if (x.comprato && c > 0 && d >= this.DAL) out[this.PREF + 'c_' + x.id] = { cent: c, data: d, desc: 'Acquisto attrezzi' };
    });
    return out;
  },

  programma(ms = 2000) {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.manda(), ms);
  },

  async api(action, dati, sess) {
    const r = await fetch(this.URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...(dati || {}), action, session: sess ? sess.session : undefined }) });
    const j = await r.json();
    if (!j.ok) { const e = new Error(j.error || 'ERRORE'); e.code = j.error || 'ERRORE'; throw e; }
    return j;
  },

  async sessione(nuova) {
    if (!nuova) {
      const s = this.ls(this.K_SESS) || this.ls('gestioneCasa.sessione');
      if (s && s.session) return s;
    }
    const k = this.raw('eco.chiave'), chi = this.raw('eco.me') || 'Federico';
    if (!k) throw new Error('CHIAVE');
    const j = await this.api('loginChiave', { chiave: k, chi });
    const s = { session: j.session, admin: j.admin, me: j.me };
    this.put(this.K_SESS, s);
    return s;
  },

  async manda() {
    const voglio = this.voglio();
    if (!Object.keys(voglio).length && !this.ls(this.K_USATO)) return;   // prima del 2027 non serve fare niente
    if (!navigator.onLine) return;
    if (this._busy) { this._again = true; return; }
    this._busy = true;
    try {
      let sess = await this.sessione(), j;
      try { j = await this.api('load', {}, sess); }
      catch (e) {
        if (e.code !== 'NO_LOGIN' && e.code !== 'NON_AUTORIZZATO') throw e;
        try { localStorage.removeItem(this.K_SESS); } catch (er) {}
        sess = await this.sessione(true); j = await this.api('load', {}, sess);
      }
      const st = j.state || {}, set = st.settings;
      if (!set || !(set.houses || []).length) return;                   // Gestione Casa non ancora preparata
      if (!(set.categories || []).some(c => c.id === this.CAT.id) && j.admin) {
        await this.api('saveSettings', { settings: { ...set, categories: (set.categories || []).concat([this.CAT]) } }, sess);
      }
      const casa = set.houses.find(h => /casa/i.test(h.name)) || set.houses[0];
      const payer = casa.defaultPayer || (casa.members || [])[0] || j.me;
      const esistenti = (st.expenses || []).filter(x => String(x.id).startsWith(this.PREF));
      const nTot = esistenti.length + Object.keys(voglio).length;
      let n = 0;
      for (const x of esistenti) {
        const v = voglio[x.id];
        if (!v) { await this.api('deleteExpense', { id: x.id }, sess); n++; continue; }
        delete voglio[x.id];
        if (x.amount === v.cent && x.date === v.data && x.desc === v.desc) continue;
        const shares = x.amount === v.cent ? x.shares : { [x.payer]: v.cent };   // importo cambiato: resta a chi ha pagato
        await this.api('saveExpense', { expense: { ...x, amount: v.cent, date: v.data, desc: v.desc, shares, updatedAt: Date.now() } }, sess); n++;
      }
      for (const id of Object.keys(voglio)) {
        const v = voglio[id], now = Date.now();
        await this.api('saveExpense', { expense: { id, houseId: casa.id, amount: v.cent, cat: this.CAT.id, desc: v.desc, date: v.data,
          payer, shares: { [payer]: v.cent }, updatedAt: now, createdBy: j.me, createdAt: now } }, sess); n++;
      }
      this.put(this.K_USATO, nTot > 0);
      if (n && typeof UI !== 'undefined') UI.toast('💸 Spese aggiornate in Gestione Casa');
    } catch (e) {
      const m = e.message === 'CHIAVE' ? 'manca la chiave di sistema (impostala nell\'hub "Le mie app")'
        : e.code === 'CHIAVE_ERRATA' ? 'la chiave non coincide'
        : e.code === 'TROPPI_TENTATIVI' ? 'troppi tentativi, riprova più tardi' : 'nessuna risposta, riprovo più tardi';
      if (typeof UI !== 'undefined') UI.toast('⚠️ Gestione Casa: ' + m);
    } finally {
      this._busy = false;
      if (this._again) { this._again = false; this.programma(500); }
    }
  }
};
