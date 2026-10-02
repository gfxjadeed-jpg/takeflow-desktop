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
   الغلاف 1.3.2: agentScan ما في مجلّدات مشاهد اليوم الآن («افحص المجلّد الآن») · updateFeed يقبل رابط مستودع GitHub */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tfDesktop', {
  version: process.versions.electron ? 'electron ' + process.versions.electron : 'electron',
  platform: process.platform,
  info: () => ipcRenderer.invoke('tf-desktop-info'),
  setBadge: (n) => ipcRenderer.send('tf-badge', Math.max(0, Math.min(999, Number(n) || 0))),
  focus: () => ipcRenderer.send('tf-focus'),
  caps: () => ipcRenderer.invoke('tf-desk-caps'),
  pick: (k) => ipcRenderer.invoke('tf-desk-pick', String(k || '')),
  fsAuto: (o) => ipcRenderer.invoke('tf-fs-auto', { show: String((o && o.show) || ''), title: String((o && o.title) || ''), ref: String((o && o.ref) || ''), role: String((o && o.role) || '') }),
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
  agentScan: () => ipcRenderer.invoke('tf-agent-scan'),   /* 1.3.2 — أسماء صور اليوم في مجلّدات المشاهد (قراءة وحدها) */
  on: (ch, cb) => {
    if (!['tf-fs-arrived', 'tf-media-progress', 'tf-media-ready', 'tf-media-failed', 'tf-avid-progress', 'tf-update-state', 'tf-agent-file'].includes(ch) || typeof cb !== 'function') return false;
    ipcRenderer.on(ch, (e, d) => cb(d));
    return true;
  },
});
/* تعيد { ok } أو { ok:false, error } — والبرنامج (requests.js) يقول النتيجة للمستخدم بلغته */
contextBridge.exposeInMainWorld('tfOpenPath', (p) => ipcRenderer.invoke('tf-open-path', String(p || '')));
