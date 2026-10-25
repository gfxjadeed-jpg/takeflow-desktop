// TakeFlow Tv - تصميم وتطوير محمد قندقلي
/* الجسر بين الموقع والتطبيق — أضيق ما يمكن:
   window.tfDesktop  → { version, platform, url }   (البرنامج يعرف أنّه في التطبيق)
   window.tfOpenPath → يفتح مجلّد NEWS من مسار الطلب (requests.js يناديها إن وُجدت)
   الغلاف 1.1: setBadge(n) شارة غير المقروء · focus() إعادة النافذة (من الضغط على إشعار النظام)
   الغلاف 1.2: caps() ما يتاح على هذا الجهاز · fsAuto/fsCheck/fsWatch/fsUnwatch المسار التلقائيّ والتحقّق والمراقبة
     · mediaOpen المعاينة (رابط tfmedia:// برمز) · avidSend إلى مجلّد مراقبة Avid
   الغلاف 1.2.1: printPDF(html, name) الطباعة إلى PDF في التنزيلات بلا نافذةٍ منبثقة
   الغلاف 1.3: updateCheck/updateState/updateInstall التحديث من GitHub Releases · حدث tf-update-state
     · agentSet/agentState وكيل صور النشرة
   الغلاف 1.3.1: updateFeed مصدر التحديث من المحطة · agentRead/agentWrite/agentPick — الوكيل يراقب ويقرأ ويكتب
     والصفحة تحجز وتكشف الوجوه وتنتظر موافقة المصمّم · حدث tf-agent-file (صورةٌ وصلت) بدل tf-agent-log
     · on(قناة، دالّة) لأحداثٍ خمسةٍ بأسمائها فقط — الدالّة تتلقّى البيانات وحدها لا حدث Electron
   الغلاف 1.3.2: agentScan ما في مجلّدات مشاهد اليوم الآن («افحص المجلّد الآن») · updateFeed يقبل رابط مستودع GitHub
   الغلاف 1.4: chrome ('wco' ويندوز ولينكس · 'mac' · '' إطار النظام) — الصفحة ترسم شريط العنوان وقوائمه
     · titlebar({color, symbolColor, height}) لون شريط أزرار النافذة · cmd(اسم) أوامر النافذة والتحرير من قائمةٍ مسموحة
   الغلاف 1.6.0: llm({op, model, prompt, system, temp}) Ollama على الجهاز · asr({op, lang, bytes}) whisper.cpp · asrPick('bin'|'model')
     · sys() الذاكرة والمساحة · حدث tf-llm-pull (تقدّم تنزيل نموذج)
   الغلاف 1.7.0: llm({…, images}) صورٌ للرؤية (base64 — ثلاثٌ على الأكثر) · vision: true (الصفحة تعرف أنّ الغلاف يحملها)
   الغلاف 1.8.0: comfy({op:'status'|'run', workflow, timeoutMs}) ComfyUI على الجهاز — سير عملٍ بصيغة API وصورةٌ تعود بايتات
   الغلاف 1.9.0: comfy({op:'info'}) العقد والنماذج المثبّتة · comfy({op:'url', url}) عنوانٌ على الشبكة الداخليّة بموافقة صاحب الجهاز ·
     comfy({op:'where'}) · asr({op:'models'}) و asr({op:'use', name}) نماذج whisper في مجلّد النموذج · نافذة «النصّ فوق البرامج» (tf-text-pin)
   الغلاف 1.9.3 (v742): fsList(مسار) ملفّات مجلّد الجرافيك بمعايناتها · dragOut(مسار) السحب منه إلى Avid أو أيّ برنامج
   الغلاف 1.9.2 (v735): cred({op:'can'|'get'|'set'|'clear', u, p}) — الاسم وكلمة المرور مشفّرَين بمفتاح النظام لنطاق المحطّة وحده
   الغلاف 1.9.5 (v751): لا جديد في الجسر — نافذة لوحة الهواء (?mode=onair) يفتحها main.js كبيرةً بلا جسر، فلا tfDesktop فيها (كالمنبثقة قبلها)
   الغلاف 1.9.6 (v752): inewsSet/inewsState/inewsTest/inewsStop جسر iNews على هذا الجهاز (الإعداد · الحالة بلا كلمة المرور · اختبار الاتصال · الإيقاف)
     · حدث tf-inews-rundown (لقطة الرن داون من iNews كلّ دورة) */
const { contextBridge, ipcRenderer } = require('electron');
/* يصل من main.js (additionalArguments) — قراءةٌ متزامنة قبل أن تُرسم الصفحة، فلا يومض الإطار */
const CHROME = (() => { const a = (process.argv || []).find(x => /^--tf-chrome=/.test(String(x))); const v = a ? String(a).split('=')[1] : ''; return v === 'wco' || v === 'mac' ? v : ''; })();

/* 1.9.6 — وسيط iNews كما يُرسل: المفاتيح المعروفة وحدها، وما لم تذكره الصفحة لا يُرسل (فيبقى المحفوظ) */
const inewsArg = (o) => {
  o = (o && typeof o === 'object') ? o : {}; const out = {};
  if (Array.isArray(o.hosts)) out.hosts = o.hosts.slice(0, 8).map((h) => String(h || '').slice(0, 140));
  if (o.user !== undefined) out.user = String(o.user || '').slice(0, 80);
  if (o.password !== undefined) out.password = String(o.password || '').slice(0, 160);
  if (Array.isArray(o.queues)) out.queues = o.queues.slice(0, 16).map((q) => ({ q: String((q && q.q) || '').slice(0, 80), bulletin: String((q && q.bulletin) || '').slice(0, 80) }));
  if (o.everyMs !== undefined) out.everyMs = Number(o.everyMs);
  if (o.matField !== undefined) out.matField = String(o.matField || '').slice(0, 60);
  if (o.on !== undefined) out.on = o.on === true;
  return out;
};
contextBridge.exposeInMainWorld('tfDesktop', {
  version: process.versions.electron ? 'electron ' + process.versions.electron : 'electron',
  platform: process.platform,
  chrome: CHROME,   /* 1.4 */
  titlebar: (o) => ipcRenderer.send('tf-titlebar', { color: String((o && o.color) || ''), symbolColor: String((o && o.symbolColor) || ''), height: Number(o && o.height) || 0 }),
  cmd: (n) => ipcRenderer.send('tf-win-cmd', String(n || '')),
  info: () => ipcRenderer.invoke('tf-desktop-info'),
  setBadge: (n) => ipcRenderer.send('tf-badge', Math.max(0, Math.min(999, Number(n) || 0))),
  focus: () => ipcRenderer.send('tf-focus'),
  caps: () => ipcRenderer.invoke('tf-desk-caps'),
  pick: (k) => ipcRenderer.invoke('tf-desk-pick', String(k || '')),
  fsAuto: (o) => ipcRenderer.invoke('tf-fs-auto', { show: String((o && o.show) || ''), title: String((o && o.title) || ''), ref: String((o && o.ref) || ''), role: String((o && o.role) || ''), day: String((o && o.day) || '') }),   /* 1.9.7 — ويوم البثّ */
  fsCheck: (p) => ipcRenderer.invoke('tf-fs-check', String(p || '')),
  fsWatch: (p, id) => ipcRenderer.invoke('tf-fs-watch', { path: String(p || ''), id: String(id || '') }),
  fsUnwatch: (id) => ipcRenderer.invoke('tf-fs-unwatch', String(id || '')),
  mediaOpen: (p, o) => ipcRenderer.invoke('tf-media-open', { path: String(p || ''), proxy: !!(o && o.proxy) }),
  printPDF: (html, name) => ipcRenderer.invoke('tf-print-pdf', { html: String(html || ''), name: String(name || '') }),   /* 1.2.1 — PDF بلا نافذة */
  avidSend: (p, o) => ipcRenderer.invoke('tf-avid-send', { path: String(p || ''), ref: String((o && o.ref) || ''), title: String((o && o.title) || ''), id: String((o && o.id) || '') }),
  updateCheck: () => ipcRenderer.invoke('tf-update-check'),      /* 1.3 — التحديث */
  updateState: () => ipcRenderer.invoke('tf-update-state'),
  updateInstall: () => ipcRenderer.invoke('tf-update-install'),
  updateFeed: (u) => ipcRenderer.invoke('tf-update-feed', String(u || '')),   /* 1.3.1 — مصدر التحديث من إعدادات المحطة */
  agentSet: (o) => ipcRenderer.invoke('tf-agent-set', o || {}),     /* 1.3 — وكيل صور النشرة */
  agentState: () => ipcRenderer.invoke('tf-agent-state'),
  agentRead: (p) => ipcRenderer.invoke('tf-agent-read', String(p || '')),   /* 1.3.1 — من جذر المصدر وحده */
  agentWrite: (o) => ipcRenderer.invoke('tf-agent-write', { dir: String((o && o.dir) || ''), name: String((o && o.name) || ''), bytes: o && o.bytes }),   /* 1.3.1 — إلى الوجهات وحدها */
  agentPick: () => ipcRenderer.invoke('tf-agent-pick'),
  agentScan: () => ipcRenderer.invoke('tf-agent-scan'),
  agentRename: (p, to) => ipcRenderer.invoke('tf-agent-rename', String(p || ''), String(to || '')),   /* 1.9.1 — الاسم المقترح من تقرير الاستلام */
  agentTest: () => ipcRenderer.invoke('tf-agent-test'),   /* 1.5.0 — «اختبر»: المصدر ومجلّدات اليوم والوجهات من هذا الجهاز */   /* 1.3.2 — أسماء صور اليوم في مجلّدات المشاهد (قراءة وحدها) */
  /* 1.6.0 — جهاز المحطّة: الذكاء المحلّيّ (Ollama) · التفريغ (whisper.cpp) · الجهاز */
  llm: (o) => ipcRenderer.invoke('tf-llm', { op: String((o && o.op) || ''), model: String((o && o.model) || ''), prompt: String((o && o.prompt) || ''), system: String((o && o.system) || ''), temp: Number(o && o.temp),
    images: Array.isArray(o && o.images) ? o.images.slice(0, 3).map(String) : [] }),   /* 1.7.0 — الرؤية */
  vision: true,   /* 1.7.0 */
  comfy: (o) => ipcRenderer.invoke('tf-comfy', { op: String((o && o.op) || ''), workflow: o && o.workflow, timeoutMs: Number(o && o.timeoutMs) || 0, url: String((o && o.url) || '').slice(0, 200) }),   /* 1.8.0 — ComfyUI على الجهاز · 1.9.0 url */
  asr: (o) => ipcRenderer.invoke('tf-asr', { op: String((o && o.op) || ''), lang: String((o && o.lang) || ''), bytes: o && o.bytes, name: String((o && o.name) || '').slice(0, 140) }),   /* 1.9.0 name */
  asrPick: (k) => ipcRenderer.invoke('tf-asr-pick', String(k || '')),
  sys: () => ipcRenderer.invoke('tf-sys'),
  fsList: (p) => ipcRenderer.invoke('tf-fs-list', String(p || '')),   /* 1.9.3 (v742) — مجلّد الجرافيك: ملفّاته بمعايناتها */
  dragOut: (p) => ipcRenderer.send('tf-drag-out', String(p || '')),     /* 1.9.3 — السحب إلى Avid: يُنادى من dragstart نفسه */
  cred: (o) => ipcRenderer.invoke('tf-cred', { op: String((o && o.op) || ''), u: String((o && o.u) || '').slice(0, 64), p: String((o && o.p) || '').slice(0, 256) }),   /* 1.9.2 (v735) — تذكّر الدخول مشفّراً بمفتاح النظام */
  /* 1.9.6 (v752) — جسر iNews على هذا الجهاز: الإعداد (كلمةٌ فارغة تُبقي المحفوظة) · الحالة (بلا كلمة المرور أبداً) · اختبار الاتصال · الإيقاف */
  inewsSet: (o) => ipcRenderer.invoke('tf-inews-set', inewsArg(o)),
  inewsState: () => ipcRenderer.invoke('tf-inews-state'),
  inewsTest: (o) => ipcRenderer.invoke('tf-inews-test', inewsArg(o)),
  inewsStop: () => ipcRenderer.invoke('tf-inews-stop'),
  on: (ch, cb) => {
    if (ch === 'tf-inews-rundown' && typeof cb === 'function') { ipcRenderer.on(ch, (e, d) => cb(d)); return true; }   /* 1.9.6 (v752) — لقطة iNews: القناة التاسعة باسمها */
    if (!['tf-fs-arrived', 'tf-media-progress', 'tf-media-ready', 'tf-media-failed', 'tf-avid-progress', 'tf-update-state', 'tf-agent-file', 'tf-llm-pull'].includes(ch) || typeof cb !== 'function') return false;
    ipcRenderer.on(ch, (e, d) => cb(d));
    return true;
  },
});
/* تعيد { ok } أو { ok:false, error } — والبرنامج (requests.js) يقول النتيجة للمستخدم بلغته */
contextBridge.exposeInMainWorld('tfOpenPath', (p) => ipcRenderer.invoke('tf-open-path', String(p || '')));
