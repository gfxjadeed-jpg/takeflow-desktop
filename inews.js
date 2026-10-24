// TakeFlow Tv - تصميم وتطوير محمد قندقلي
/* ═══════════════════════════════════════════════════════════════════
   inews.js — جسر iNews (الغلاف 1.9.6 · v752): عميل FTP صغير وقارئ NSML — بلا أيّ تبعيّة
   ─────────────────────────────────────────────────────────────────
   خادم iNews يعرض الرن داون عبر FTP: كلّ طابورٍ (queue) مجلّد، وكلّ قصّةٍ ملفٌّ باسم
   <المعرّف>:<الموقع>:<الموقع> ونصٌّ بصيغة NSML. هذا الملفّ يقرأ ولا يكتب:
     • connect(opts)   اتصالٌ واحد (USER · PASS · FEAT · TYPE I) — الوضع السلبيّ (PASV) وحده، ومهلٌ واضحة
     • parseList(text) سطور LIST ← قصص (المعرّف · الموقع · العنوان · العائمة) والطوابير الفرعيّة تُبلَّغ ولا تُقرأ
     • parseNsml(text) النصّ ← المعرّف والحقول والعداد وجسم النصّ وأسطر الإشارات
     • pollOnce(opts)  دورةٌ كاملة: اتصالٌ واحد، كلّ الطوابير، ثمّ QUIT — وتعيد لقطةً مرتّبةً بترتيب iNews
   الأمان: كلمة المرور لا تُسجَّل ولا تُعاد في أيّ رسالة · جسم القصّة لا يخرج من اللقطة (عدد الكلمات وحده) ·
   سقف ٢٠٠ قصّة لكلّ طابور و٤ ميغابايت لكلّ دورة · فشل قصّةٍ واحدة لا يُسقط الدورة.
   يعمل في Node 18 فما فوق بلا Electron — فيُفحص في tf-desk وtf-edge كما هو.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
const net = require('net');

const CONNECT_MS = 8000;
const CMD_MS = 15000;
const MAX_STORIES = 200;
const MAX_BYTES = 4 * 1048576;
const MAX_CUE_LINES = 40;
const FILE_RE = /[A-Z0-9]{8}:[A-Z0-9]{8}:[A-Z0-9]{8}/i;
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

function err(code, msg) { const e = new Error(msg || code); e.code = code; return e; }

/* ── النصّ ── */
/* page-number ← pageNumber · modify-date ← modifyDate · video-id ← videoId */
function camel(k) {
  return String(k || '').trim().toLowerCase().replace(/[^a-z0-9]+([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/[^a-z0-9]+$/g, '');
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function unesc(s) {
  return String(s == null ? '' : s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    const low = e.toLowerCase();
    if (low[0] === '#') {
      const n = low[1] === 'x' ? parseInt(low.slice(2), 16) : parseInt(low.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENT, low) ? ENT[low] : m;
  });
}
/* نزع الوسوم: نهاية الفقرة سطرٌ جديد، والباقي يُحذف */
function stripTags(s) {
  return String(s == null ? '' : s).replace(/<\/p\s*>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\r/g, '');
}
function attrs(s) {
  const out = {}; const re = /([A-Za-z_][\w.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g; let m;
  while ((m = re.exec(String(s || '')))) out[m[1].toLowerCase()] = unesc(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4]);
  return out;
}

/* ── LIST ── */
/* "Oct 24 10:05" (هذه السنة، أو الماضية إن وقع التاريخ في المستقبل) أو "Oct 24 2025" — وما لا يُقرأ null */
function parseListDate(line, now) {
  const m = / ([A-Za-z]{3,4})[ ]+([0-9]{1,2})[ ]+(?:([0-9]{4})|([0-9]{1,2}):([0-9]{2}))(?= )/.exec(line);
  if (!m) return null;
  const mo = MONTHS[m[1].toLowerCase()]; if (mo === undefined) return null;
  const d = new Date(now || Date.now());
  let t;
  if (m[3]) t = new Date(Number(m[3]), mo, Number(m[2]), 0, 0, 0, 0);
  else {
    t = new Date(d.getFullYear(), mo, Number(m[2]), Number(m[4]), Number(m[5]), 0, 0);
    if (t.getTime() > d.getTime() + 36e5) t.setFullYear(d.getFullYear() - 1);
  }
  const ms = t.getTime();
  return Number.isFinite(ms) ? ms : null;
}
/* سطور LIST ← مصفوفة قصص بترتيبها، وعليها خاصّيّة subQueues بأسماء الطوابير الفرعيّة (سطورٌ تبدأ بـd) */
function parseList(text, now) {
  const items = []; const subQueues = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const flags = (line.match(/^\S+/) || [''])[0];
    if (flags[0] === 'd') {
      const q = (line.match(/ ([^\s/]+)$/) || [])[1] || '';
      if (q) subQueues.push(q);
      continue;
    }
    const fm = FILE_RE.exec(line);
    if (!fm) continue;
    const file = fm[0].toUpperCase(); const parts = file.split(':');
    const storyName = line.slice(fm.index + fm[0].length).replace(/^\s+/, '');
    items.push({ file, identifier: parts[0], locator: parts[1] + ':' + parts[2], storyName, floated: flags[1] === 'f', modified: parseListDate(line, now), flags });
  }
  items.subQueues = subQueues;
  return items;
}

/* ── NSML ── */
/* <storyid> · <f id="…">نصّ</f> (مفاتيح camelCase) · <meta words rate> · <body> نصّاً بلا وسوم · <ae id><ap> أسطر الإشارات */
function parseNsml(text) {
  const s = String(text || '');
  const story = { id: '', fields: {}, meta: {}, body: '', cues: {} };
  const sid = /<storyid[^>]*>([\s\S]*?)<\/storyid>/i.exec(s); if (sid) story.id = unesc(stripTags(sid[1])).trim();
  const fre = /<f\s+([^>]*?)(\/>|>([\s\S]*?)<\/f\s*>)/gi; let m;
  while ((m = fre.exec(s))) {
    const a = attrs(m[1]); if (!a.id) continue;
    story.fields[camel(a.id)] = m[2] === '/>' ? '' : unesc(stripTags(m[3])).trim();
  }
  const meta = /<meta\s+([^>]*?)\/?>/i.exec(s);
  if (meta) { story.meta = attrs(meta[1]); if (story.meta.words !== undefined) story.meta.words = Number(story.meta.words) || 0; if (story.meta.rate !== undefined) story.meta.rate = Number(story.meta.rate) || 0; }
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(s);
  if (body) story.body = unesc(stripTags(body[1])).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const are = /<ae\s+([^>]*)>([\s\S]*?)<\/ae\s*>/gi;
  while ((m = are.exec(s))) {
    const a = attrs(m[1]); const id = a.id != null ? String(a.id) : String(Object.keys(story.cues).length);
    const lines = []; const pre = /<ap[^>]*>([\s\S]*?)<\/ap\s*>/gi; let p;
    while ((p = pre.exec(m[2]))) { const ln = unesc(stripTags(p[1])).trim(); if (/^\]\]\s*S[\d.]+\b.*\[\[$/.test(ln)) continue; lines.push(ln); }
    story.cues[id] = lines;
  }
  return story;
}

/* ── FTP ── */
function parseHost(h, def) {
  const s = String(h || '').trim(); const m = /^(.+?)(?::(\d{1,5}))?$/.exec(s);
  if (!m) return null;
  const port = m[2] ? Number(m[2]) : (def || 21);
  if (!m[1] || !(port >= 1 && port <= 65535)) return null;
  return { host: m[1], port };
}
function withTimeout(p, ms, code) {
  let t; const to = new Promise((_, rej) => { t = setTimeout(() => rej(err(code || 'ETIMEOUT', 'timeout')), ms); });
  return Promise.race([p, to]).finally(() => clearTimeout(t));
}
function tcp(host, port, ms) {
  return new Promise((res, rej) => {
    let done = false; const s = net.createConnection({ host, port });
    const t = setTimeout(() => { if (done) return; done = true; s.destroy(); rej(err('ETIMEOUT', 'connect timeout ' + host + ':' + port)); }, ms);
    s.once('connect', () => { if (done) return; done = true; clearTimeout(t); res(s); });
    s.once('error', (e) => { if (done) return; done = true; clearTimeout(t); rej(err(e && e.code || 'ECONN', (e && e.message) || 'connect failed')); });
  });
}
/* قارئ الردود: السطر "NNN نصّ" ردٌّ كامل، و"NNN-" يبدأ ردّاً متعدّد الأسطر ينتهي بسطر "NNN " */
function replyReader(sock, cmdMs) {
  let buf = ''; const ready = []; const waiters = []; let cur = null; let closed = false; let closeErr = null;
  const push = (r) => { const w = waiters.shift(); if (w) w.res(r); else ready.push(r); };
  const fail = (e) => { closed = true; closeErr = e; while (waiters.length) waiters.shift().rej(e); };
  sock.setEncoding('latin1');
  sock.on('data', (d) => {
    buf += d; if (buf.length > 1048576) buf = buf.slice(-65536);
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1);
      const m = /^(\d{3})([ -])(.*)$/.exec(line);
      if (!cur) {
        if (!m) continue;
        if (m[2] === '-') cur = { code: Number(m[1]), lines: [m[3]] };
        else push({ code: Number(m[1]), text: m[3], lines: [m[3]] });
      } else {
        if (m && Number(m[1]) === cur.code && m[2] === ' ') { cur.lines.push(m[3]); push({ code: cur.code, text: cur.lines[0], lines: cur.lines }); cur = null; }
        else cur.lines.push(line);
      }
    }
  });
  sock.on('error', (e) => fail(err((e && e.code) || 'ECONN', (e && e.message) || 'control error')));
  sock.on('close', () => fail(err('ECLOSED', 'control connection closed')));
  return {
    next(ms) {
      if (ready.length) return Promise.resolve(ready.shift());
      if (closed) return Promise.reject(closeErr);
      let w; const p = new Promise((res, rej) => { w = { res, rej }; waiters.push(w); });
      return withTimeout(p, ms || cmdMs).catch((e) => { const k = waiters.indexOf(w); if (k >= 0) waiters.splice(k, 1); throw e; });
    },
  };
}
function readAll(sock, ms, cap) {
  return new Promise((res, rej) => {
    const chunks = []; let n = 0, done = false;
    const t = setTimeout(() => { if (done) return; done = true; sock.destroy(); rej(err('ETIMEOUT', 'data timeout')); }, ms);
    sock.on('data', (d) => { if (done) return; n += d.length; if (n > cap) { done = true; clearTimeout(t); sock.destroy(); rej(err('ETOOBIG', 'transfer above the cap')); return; } chunks.push(d); });
    sock.on('error', (e) => { if (done) return; done = true; clearTimeout(t); rej(err((e && e.code) || 'ECONN', (e && e.message) || 'data error')); });
    sock.on('close', () => { if (done) return; done = true; clearTimeout(t); res(Buffer.concat(chunks)); });
  });
}
/* FTP على خادمٍ واحد — opts: { host, port, user, password, connectMs, cmdMs, log } */
async function connectOne(o) {
  const connectMs = o.connectMs || CONNECT_MS, cmdMs = o.cmdMs || CMD_MS;
  const log = typeof o.log === 'function' ? o.log : null;
  const sock = await tcp(o.host, o.port, connectMs);
  sock.setNoDelay(true);
  const rd = replyReader(sock, cmdMs);
  let alive = true; sock.on('close', () => { alive = false; });
  const send = async (cmd, ms) => {
    if (!alive) throw err('ECLOSED', 'control connection closed');
    const safe = /^PASS\b/i.test(cmd) ? 'PASS ****' : cmd;   /* كلمة المرور لا تُسجَّل أبداً */
    if (log) log('> ' + safe);
    sock.write(cmd + '\r\n');
    const r = await rd.next(ms);
    if (log) log('< ' + r.code + ' ' + r.text);
    return r;
  };
  const expect = (r, codes, what) => { if (!codes.includes(r.code)) throw err('E' + r.code, (what || 'ftp') + ': ' + r.code + ' ' + String(r.text || '').slice(0, 160)); return r; };
  const client = {
    host: o.host + ':' + o.port,
    destroy() { alive = false; try { sock.destroy(); } catch (e) {} },
    async login(user, password) {
      const u = await send('USER ' + user); if (u.code === 230) return;
      expect(u, [331, 332], 'USER');
      expect(await send('PASS ' + password), [230, 202], 'PASS');
    },
    async feat() { await send('FEAT'); },   /* أيّ ردٍّ مقبول: ٢١١ بقائمةٍ متعدّدة الأسطر أو ٥٠٠/٥٠٢ */
    async binary() { expect(await send('TYPE I'), [200], 'TYPE'); },
    async cwd(dir) { expect(await send('CWD ' + dir), [250], 'CWD'); },
    async pasv() {
      const r = expect(await send('PASV'), [227], 'PASV');
      const m = /(\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3})/.exec(r.text || '');
      if (!m) throw err('EPASV', 'PASV: unreadable reply');
      let host = m.slice(1, 5).join('.'); const port = Number(m[5]) * 256 + Number(m[6]);
      if (host === '0.0.0.0') host = sock.remoteAddress || o.host;
      return tcp(host, port, connectMs);
    },
    /* نقلٌ واحد: فتح قناة البيانات ثمّ الأمر، ١٥٠ أو ١٢٥، البيانات حتّى الإغلاق، ثمّ ٢٢٦ أو ٢٥٠ */
    async transfer(cmd, cap) {
      const data = await client.pasv();
      let r;
      try { r = await send(cmd); } catch (e) { data.destroy(); throw e; }
      if (![125, 150].includes(r.code)) { data.destroy(); throw err('E' + r.code, cmd.split(' ')[0] + ': ' + r.code + ' ' + String(r.text || '').slice(0, 160)); }
      let buf;
      try { buf = await readAll(data, cmdMs, cap || MAX_BYTES); }
      catch (e) { try { await rd.next(cmdMs); } catch (x) {} throw e; }
      const done = await rd.next(cmdMs);
      if (![226, 250].includes(done.code)) throw err('E' + done.code, cmd.split(' ')[0] + ': ' + done.code + ' ' + String(done.text || '').slice(0, 160));
      return buf;
    },
    async list(cap) { return (await client.transfer('LIST', cap)).toString('utf8'); },
    async retr(file, cap) {
      if (!FILE_RE.test(String(file)) || /[\r\n\s]/.test(String(file))) throw err('EFILE', 'RETR: bad file name');
      return (await client.transfer('RETR ' + file, cap)).toString('utf8');
    },
    async quit() { try { await send('QUIT', 3000); } catch (e) {} client.destroy(); },
  };
  try {
    const g = await rd.next(cmdMs); expect(g, [220], 'greeting');
    if (log) log('< ' + g.code + ' ' + g.text);
    await client.login(String(o.user || ''), String(o.password || ''));
    await client.feat();
    await client.binary();
  } catch (e) { client.destroy(); throw e; }
  return client;
}
/* الخوادم بالترتيب: فشل الاتصال أو ٥٣٠ يمرّ إلى التالي، وآخر خطأٍ يُعاد إن فشلت كلّها */
async function connect(opts) {
  const o = opts || {};
  const hosts = (Array.isArray(o.hosts) ? o.hosts : [o.host]).map((h) => parseHost(h)).filter(Boolean);
  if (!hosts.length) throw err('EHOSTS', 'no hosts');
  let last = null;
  for (const h of hosts) {
    try { return await connectOne(Object.assign({}, o, h)); }
    catch (e) { last = e; if (e.code === 'E530' || !/^E\d{3}$/.test(String(e.code || ''))) continue; throw e; }   /* ردٌّ رقميّ آخر (مثل ٥٥٠) خطأٌ من الخادم نفسه لا من الشبكة */
  }
  throw last || err('ECONN', 'no host answered');
}

/* ── الدورة ── */
function storyOf(item, nsml, matKey) {
  const f = nsml.fields || {}; const words = Number(nsml.meta && nsml.meta.words) || 0;
  const cues = Object.keys(nsml.cues || {}).map((k) => ({ id: k, lines: nsml.cues[k].slice(0, MAX_CUE_LINES) }));
  return {
    id: item.identifier, locator: item.locator, slug: item.storyName, title: f.title || item.storyName, page: String(f.pageNumber || ''),
    mat: String((matKey && f[matKey]) || '').trim().toUpperCase(), floated: !!item.floated, modified: item.modified, words, est: Math.round(words / 2.5), cues,
  };
}
/* pollOnce({ hosts, user, password, queues: [{ q, bulletin }], matField, connectMs, cmdMs, log })
   ← { at, ok, error, host, bytes, results: [{ queue, bulletin, ok, error, n, skipped, subQueues, stories }] } */
async function pollOnce(opts) {
  const o = opts || {}; const at = Date.now();
  const queues = (Array.isArray(o.queues) ? o.queues : []).map((x) => (typeof x === 'string' ? { q: x, bulletin: '' } : { q: String((x && x.q) || ''), bulletin: String((x && x.bulletin) || '') })).filter((x) => x.q);
  const matKey = camel(o.matField || 'video-id');
  const snap = { at, ok: false, error: '', host: '', bytes: 0, results: [] };
  if (!queues.length) { snap.error = 'no_queues'; return snap; }
  let c;
  try { c = await connect(o); }
  catch (e) { snap.error = String((e && e.message) || e); snap.code = e && e.code; return snap; }
  snap.host = c.host;
  let budget = MAX_BYTES;
  try {
    for (const q of queues) {
      const r = { queue: q.q, bulletin: q.bulletin, ok: false, error: '', n: 0, skipped: 0, subQueues: [], stories: [] };
      snap.results.push(r);
      try { await c.cwd(q.q); }
      catch (e) { r.error = String((e && e.message) || e); if (e.code === 'ECLOSED' || e.code === 'ETIMEOUT') throw e; continue; }
      let items;
      try { const txt = await c.list(budget); budget -= Buffer.byteLength(txt); snap.bytes += Buffer.byteLength(txt); items = parseList(txt, at); }
      catch (e) { r.error = String((e && e.message) || e); if (e.code === 'ECLOSED' || e.code === 'ETIMEOUT') throw e; continue; }
      r.subQueues = items.subQueues.slice(0, 50);
      if (items.length > MAX_STORIES) { r.skipped += items.length - MAX_STORIES; items = items.slice(0, MAX_STORIES); }
      for (const it of items) {
        if (budget <= 0) { r.skipped++; r.error = r.error || 'bytes_cap'; continue; }
        try {
          const txt = await c.retr(it.file, budget);
          const n = Buffer.byteLength(txt); budget -= n; snap.bytes += n;
          r.stories.push(storyOf(it, parseNsml(txt), matKey));
        } catch (e) {
          if (e.code === 'ECLOSED' || e.code === 'ETIMEOUT') throw e;
          r.skipped++;   /* قصّةٌ واحدة تعذّرت: تُترك ويُعدّ، والباقي يصل */
        }
      }
      r.n = r.stories.length; r.ok = true;
    }
    snap.ok = true;
  } catch (e) {
    snap.error = String((e && e.message) || e); snap.code = e && e.code;
    snap.ok = snap.results.some((r) => r.ok);
  } finally { await c.quit(); }
  return snap;
}

module.exports = { connect, parseList, parseNsml, pollOnce, camel, unesc, stripTags, parseHost, LIMITS: { CONNECT_MS, CMD_MS, MAX_STORIES, MAX_BYTES } };
