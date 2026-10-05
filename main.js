// TakeFlow Tv - تصميم وتطوير محمد قندقلي
/* ═══════════════════════════════════════════════════════════════════
   TakeFlow TV — تطبيق سطح المكتب (Electron) · v557 · الغلاف 1.1 (v567)
   ─────────────────────────────────────────────────────────────────
   غلافٌ خفيف: النافذة تفتح موقع المحطة (config.json → url) فتصل كلّ
   تحديثات الويب فوراً بلا تنزيلٍ جديد. الغلاف نفسه لا يتغيّر إلّا نادراً.
   ما يزيده على المتصفّح:
     • نافذةٌ خاصّة بالبرنامج تبقى مفتوحة وتعود من شريط المهامّ
     • فتح مجلّد NEWS من مسار الطلب (tfOpenPath) — المتصفّح يمنعه
     • إشعارات النظام من البرنامج نفسه (القناة الحيّة) — لا يحتاج Web Push
     • نافذة ربط Gmail/Outlook وبوت تيليغرام تُفتح في المتصفّح الافتراضيّ
   الغلاف 1.1:
     • أيقونةٌ بجانب الساعة: الإغلاق يُخفي النافذة ولا يوقف الإشعارات (الخروج من قائمتها)
     • شارة غير المقروء على أيقونة البرنامج، ووميضٌ في شريط المهامّ حين يصل جديد والنافذة في الخلف
     • «ابدأ مع تشغيل الجهاز» — يبدأ مخفيّاً بجانب الساعة
     • النافذة تعود بحجمها ومكانها كما تُركت
     • التنزيلات إلى مجلّد «التنزيلات» مباشرةً، وإشعارٌ يفتح مكان الملفّ
     • الضغط على إشعار النظام يعيد النافذة إلى الواجهة
   الغلاف 1.2 (v578) — مساحة التصميم والمونتاج على الجهاز:
     • المسار التلقائيّ: مجلّدٌ منظَّم (اليوم ← النشرة ← رقم المادّة والعنوان ← المسار) تحت جذرٍ
       يحدّده config.json (media.root) — يُنشأ بضغطةٍ من نافذة التسليم ويُملأ حقله
     • التحقّق من المسار قبل الإرسال: موجود؟ مجلّد أم ملفّ؟ كم ملفّاً؟ — لا بعد أن يشكو المستلم
     • مراقبة مجلّد التسليم: حين يستقرّ ملفٌّ جديد فيه (حجمه ثابت بين فحصين) يُقال للصفحة
     • المعاينة: tfmedia:// يبثّ الملفّ من القرص أو الشبكة إلى <video> بالمدى (Range)، وMXF وما
       لا يقرؤه Chromium يُحوَّل إلى نسخةٍ خفيفة (proxy) بـffmpeg المرفق وتُحفظ فلا تُعاد
     • إلى Avid: نسخٌ إلى مجلّد المراقبة (media.avidWatch) باسمٍ مؤقّت ثمّ إعادة تسمية بعد مطابقة
       الحجم — فلا يلتقط Avid نصف ملفّ
   الغلاف 1.4 (v622) — شريط عنوانٍ من البرنامج نفسه:
     • النافذة بلا إطار النظام (titleBarStyle: hidden) وأزرار التصغير والتكبير والإغلاق من ويندوز نفسه فوقها
       (Windows Controls Overlay) — والشريط تحتها ترسمه الصفحة: القوائم (ملف · تحرير · عرض · انتقال · مساعدة)
       من سجلّ أوامر ☰ نفسه، بالعربيّة من اليمين وبالإنكليزيّة من اليسار، وبألوان الهويّة
     • الصفحة تبلّغ ألوان شريطها (tf-titlebar) فيتلوّن معها شريط الأزرار · وأوامر النافذة (tf-win-cmd) من قائمةٍ مسموحة
     • صفحةٌ أقدم لا ترسم الشريط ← بعد عشر ثوانٍ يُحقن شريط سحبٍ بسيط فلا تبقى النافذة بلا مقبض
     • config.json → titleBar: "system" يعيد إطار النظام كما كان (لمن يفضّله أو لجهازٍ لا يعرضه)
     • الأيقونة الجديدة (build/icon.ico بسبعة مقاسات لويندوز)
   الأمان: contextIsolation، لا nodeIntegration، الروابط الخارجيّة في المتصفّح،
   وفتح المسارات مقيّدٌ بشكل مسارٍ محلّيّ/شبكيّ لا رابط. وكلّ قنوات 1.2 من صفحة المحطة وحدها،
   والمعاينة برمزٍ عشوائيّ يصدره الغلاف لملفٍّ بعينه — لا مسار في الرابط.
   ═══════════════════════════════════════════════════════════════════ */
const { app, BrowserWindow, shell, ipcMain, Menu, session, dialog, Tray, nativeImage, Notification, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Readable } = require('stream');

const CFG_DEFAULT = { url: 'https://takeflowtv.vercel.app', openPaths: true, zoom: 1.0, closeToTray: true, updates: { enabled: false } };
function loadConfig() {
  const out = Object.assign({}, CFG_DEFAULT);
  for (const p of [path.join(app.getPath('userData'), 'config.json'), path.join(__dirname, 'config.json')]) {
    try { if (fs.existsSync(p)) { Object.assign(out, JSON.parse(fs.readFileSync(p, 'utf8'))); break; } } catch (e) { console.error('config', p, e.message); }
  }
  if (!/^https:\/\//.test(String(out.url || ''))) out.url = CFG_DEFAULT.url;   /* https فقط */
  return out;
}
const CFG = loadConfig();
const APP_ORIGIN = new URL(CFG.url).origin;
/* 1.2 — المسارات: root للمسار التلقائيّ · avidWatch مجلّد مراقبة Avid · ffmpeg مسارٌ بديل للمرفق */
const MEDIA = Object.assign({ root: '', avidWatch: '', ffmpeg: '', proxyHeight: 540 }, (CFG.media && typeof CFG.media === 'object') ? CFG.media : {});
/* tfmedia:// قبل الجاهزيّة: مخطّطٌ آمن يبثّ (stream) ويُقرأ بـfetch — شرطٌ لـ<video> بالمدى */
try { protocol.registerSchemesAsPrivileged([{ scheme: 'tfmedia', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } }]); } catch (e) { console.error('tfmedia scheme', e.message); }
/* أصولٌ يُسمح لها بنافذةٍ منبثقة داخل التطبيق (رجوع OAuth يحتاج opener) */
const POPUP_OK = [APP_ORIGIN, 'https://accounts.google.com', 'https://login.microsoftonline.com', 'https://login.live.com'];

let win = null, tray = null, quitting = false, lastBadge = 0;
const START_HIDDEN = process.argv.includes('--hidden');
const ICON = path.join(__dirname, 'build', 'icon.png');
/* 1.4 — ويندوز يأخذ ICO بمقاساته (١٦…٢٥٦) فلا تُصغَّر صورةٌ كبيرة في شريط المهامّ وبجانب الساعة */
const ICON_WIN = path.join(__dirname, 'build', process.platform === 'win32' && fs.existsSync(path.join(__dirname, 'build', 'icon.ico')) ? 'icon.ico' : 'icon.png');
/* 1.4 — شريط العنوان من الصفحة (الافتراضيّ) أو إطار النظام (titleBar: "system") */
const CHROME = CFG.titleBar !== 'system';
const CHROME_H = 36;
let titlebarSeen = false, titlebarTimer = null;
/* شارة غير المقروء على ويندوز (أيقونةٌ فوق أيقونة البرنامج في شريط المهامّ) — نقطةٌ حمراء 32×32 */
const DOT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAzUlEQVR4nO2XQQ6DMAwECc/oj3rhsVz4Ub+R3iLXsWNv7aKIstcku6ONALMs/66CHqi11qFhKZCne7MV/C2IuQkNRkGGi1r467mJ+x/HDkOoCzxcC9XEYTSI9Rfh0hmtzQ4gIxyBEBvICPd6fABQwoxwyYu3MGzgDDWA6POOiGaJDWTWb3nOcwU3wA1ApX3VItI8GwA6yUREs+a6AkqWeQ3Uizc9bCADwvLoADhhBMIzFYkNZEB4R7J5h1ILwqvQWB4BSfsxQUHOfKFdQ29G8Wsw7O8PeQAAAABJRU5ErkJggg==';

/* ── حجم النافذة ومكانها كما تُركت ── */
const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');
function loadState() {
  try { const s = JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); if (s && s.width >= 800 && s.height >= 560) return s; } catch (e) {}
  return { width: 1440, height: 900 };
}
function saveState() {
  if (!win || win.isDestroyed()) return;
  try { const b = win.getNormalBounds(); fs.writeFileSync(STATE_FILE(), JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height, maximized: win.isMaximized() })); } catch (e) {}
}
function showWin() {
  if (!win) { createWindow(); return; }
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

function createWindow() {
  const st = loadState();
  /* 1.4 — بلا إطار النظام: أزرار النافذة من ويندوز فوق شريطٍ ترسمه الصفحة (ماك: الأزرار الثلاثة في مكانها) */
  const frame = !CHROME ? {} : process.platform === 'darwin'
    ? { titleBarStyle: 'hiddenInset' }
    : { titleBarStyle: 'hidden', titleBarOverlay: { color: '#0a0e1a', symbolColor: '#e8eef8', height: CHROME_H } };
  win = new BrowserWindow(Object.assign({
    width: st.width, height: st.height, x: st.x, y: st.y, minWidth: 1024, minHeight: 680,
    title: 'TakeFlow TV', backgroundColor: '#0a0e1a', autoHideMenuBar: true, show: false,
    icon: ICON_WIN,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: true,
      additionalArguments: ['--tf-chrome=' + (CHROME ? (process.platform === 'darwin' ? 'mac' : 'wco') : 'off')] },
  }, frame));
  /* 1.4 — الصفحة تبلّغ شريطها بعد كلّ تحميل؛ صفحةٌ أقدم لا تفعل ← شريط سحبٍ بسيط بعد عشر ثوانٍ */
  win.webContents.on('did-start-loading', () => { titlebarSeen = false; });
  win.webContents.on('did-finish-load', () => {
    if (!CHROME) return;
    clearTimeout(titlebarTimer);
    titlebarTimer = setTimeout(() => { if (!titlebarSeen && win && !win.isDestroyed()) titlebarFallback(); }, 10000);
  });
  win.once('ready-to-show', () => {
    if (st.maximized) win.maximize();
    if (!START_HIDDEN) win.show();
    if (CFG.zoom && CFG.zoom !== 1) win.webContents.setZoomFactor(Number(CFG.zoom));
  });
  /* الإغلاق يُخفي إلى جانب الساعة — الإشعارات تبقى تصل. الخروج من قائمة الأيقونة أو «خروج» */
  win.on('close', (ev) => {
    saveState();
    if (!quitting && CFG.closeToTray && tray) {
      ev.preventDefault(); win.hide();
      if (!app._toldTray) {
        app._toldTray = true;
        try { new Notification({ title: 'TakeFlow TV', body: 'البرنامج يعمل بجانب الساعة وتصلك إشعاراته. للخروج: الأيقونة ← خروج.', icon: ICON }).show(); } catch (e) {}
      }
    }
  });
  win.on('focus', () => { try { win.flashFrame(false); } catch (e) {} });
  /* الروابط: داخل التطبيق لموقع المحطة، ونافذةٌ منبثقة لربط البريد، والباقي في المتصفّح */
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const o = new URL(url).origin;
      if (POPUP_OK.includes(o)) return { action: 'allow', overrideBrowserWindowOptions: { width: 560, height: 720, autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false } } };
    } catch (e) {}
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (ev, url) => {
    try { if (new URL(url).origin !== APP_ORIGIN) { ev.preventDefault(); shell.openExternal(url); } } catch (e) { ev.preventDefault(); }
  });
  win.on('closed', () => { win = null; });
  win.loadURL(CFG.url);
  /* لا شبكة عند التشغيل: صفحةٌ تقول ذلك وتعيد المحاولة */
  win.webContents.on('did-fail-load', (ev, code, desc, url, isMain) => {
    if (!isMain || code === -3) return;
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><body style="font-family:system-ui;background:#0a0e1a;color:#eee;display:grid;place-items:center;height:100vh;margin:0">
      <div style="text-align:center;line-height:2"><b style="font-size:20px">تعذّر الوصول إلى الخادم</b><br>${desc || ''} (${code})<br><span style="opacity:.75">${CFG.url}</span><br><br>
      <button onclick="location.href='${CFG.url}'" style="font:inherit;padding:10px 18px;border-radius:10px;border:0;background:#e8a020;color:#1a1305;font-weight:700;cursor:pointer">إعادة المحاولة</button></div></body></html>`));
  });
}

/* ── الأيقونة بجانب الساعة ── */
function trayMenu() {
  const auto = app.getLoginItemSettings().openAtLogin;
  return Menu.buildFromTemplate([
    { label: 'افتح TakeFlow TV', click: showWin },
    { type: 'separator' },
    { label: 'ابدأ مع تشغيل الجهاز', type: 'checkbox', checked: !!auto, click: (it) => {
        app.setLoginItemSettings({ openAtLogin: !!it.checked, args: ['--hidden'] });
        tray && tray.setContextMenu(trayMenu());
      } },
    { label: 'افتح مجلّد التنزيلات', click: () => shell.openPath(app.getPath('downloads')) },
    { label: 'المسارات', submenu: pathsMenu() },   /* 1.2 */
    { type: 'separator' },
    { label: 'خروج', click: () => { quitting = true; app.quit(); } },
  ]);
}
/* 1.2 — الجذر ومجلّد Avid يُختاران بنافذة النظام ويُحفظان في إعداد المستخدم (userData/config.json) — لا تحرير JSON باليد */
function pathsMenu() {
  return [
    { label: 'جذر المسارات التلقائيّة…' + (MEDIA.root ? '  (' + MEDIA.root + ')' : ''), click: () => pickFolder('root') },
    { label: 'مجلّد مراقبة Avid…' + (MEDIA.avidWatch ? '  (' + MEDIA.avidWatch + ')' : ''), click: () => pickFolder('avidWatch') },
  ];
}
async function pickFolder(key) {
  try {
    const r = await dialog.showOpenDialog(win && !win.isDestroyed() ? win : undefined, {
      title: key === 'root' ? 'جذر المسارات التلقائيّة' : 'مجلّد مراقبة Avid', properties: ['openDirectory', 'createDirectory'], defaultPath: MEDIA[key] || undefined });
    if (!r || r.canceled || !r.filePaths || !r.filePaths[0]) return false;
    const v = r.filePaths[0];
    if (!PATH_OK.test(v)) { dialog.showMessageBox({ type: 'warning', message: 'المسار ليس مجلّداً محلّياً أو شبكيّاً' }); return false; }
    MEDIA[key] = v;
    const f = path.join(app.getPath('userData'), 'config.json');
    let cur = {};
    try { cur = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { cur = Object.assign({}, CFG); }
    cur.media = Object.assign({}, cur.media || {}, { [key]: v });
    fs.writeFileSync(f, JSON.stringify(cur, null, 2));
    if (tray) tray.setContextMenu(trayMenu());
    try { new Notification({ title: 'TakeFlow TV', body: (key === 'root' ? 'جذر المسارات: ' : 'مجلّد Avid: ') + v, icon: ICON }).show(); } catch (e) {}
    return true;
  } catch (e) { console.error('pickFolder', e.message); return false; }
}
/* 1.1.1 — «أيقونة شريط المهام فارغة»: build/icon.png لم يكن ضمن ملفّات الحزمة (files)،
   فكانت الصورة فارغة في النسخة المثبّتة (تعمل من المصدر فقط). أُضيفت للحزمة، وإن غابت
   لأيّ سبب نأخذ أيقونة البرنامج نفسه بدل مربّعٍ فارغ. */
function trayImage() {
  const img = nativeImage.createFromPath(ICON_WIN);   /* 1.4 — ICO على ويندوز: مقاس ١٦ مرسومٌ لا مصغَّر */
  return img.isEmpty() ? img : img.resize({ width: 16, height: 16 });
}
function createTray() {
  try {
    const img = trayImage();
    tray = new Tray(img);
    if (img.isEmpty()) {
      app.getFileIcon(process.execPath, { size: 'small' })
        .then(i => { try { if (tray && i && !i.isEmpty()) tray.setImage(i); } catch (e) {} })
        .catch(() => {});
    }
    tray.setToolTip('TakeFlow TV');
    tray.setContextMenu(trayMenu());
    tray.on('click', showWin);
  } catch (e) { console.error('tray', e.message); tray = null; }
}
/* ── شارة غير المقروء ── */
function setBadge(n) {
  n = Math.max(0, Math.min(999, Number(n) || 0));
  try { app.setBadgeCount(n); } catch (e) {}                       /* ماك ولينكس */
  if (process.platform === 'win32' && win && !win.isDestroyed()) {
    try { win.setOverlayIcon(n ? nativeImage.createFromDataURL(DOT_PNG) : null, n ? n + ' غير مقروء' : ''); } catch (e) {}
  }
  if (tray) tray.setToolTip(n ? 'TakeFlow TV — ' + n + ' غير مقروء' : 'TakeFlow TV');
  if (n > lastBadge && win && !win.isFocused()) { try { win.flashFrame(true); } catch (e) {} }
  lastBadge = n;
}
/* ── التنزيلات: إلى «التنزيلات» مباشرةً باسمٍ لا يدهس ملفّاً موجوداً ── */
function uniquePath(dir, name) {
  const safe = String(name || 'file').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 180) || 'file';
  const ext = path.extname(safe), base = safe.slice(0, safe.length - ext.length);
  let p = path.join(dir, safe), i = 1;
  while (fs.existsSync(p) && i < 500) p = path.join(dir, `${base} (${i++})${ext}`);
  return p;
}
function wireDownloads() {
  session.defaultSession.on('will-download', (ev, item) => {
    const to = uniquePath(app.getPath('downloads'), item.getFilename());
    item.setSavePath(to);
    item.once('done', (e, state) => {
      if (state !== 'completed') return;
      try {
        const n = new Notification({ title: 'نزل الملفّ', body: path.basename(to) + ' — اضغط لفتح مكانه', icon: ICON });
        n.on('click', () => shell.showItemInFolder(to));
        n.show();
      } catch (err) {}
    });
  });
}

/* نسخةٌ واحدة تعمل — الثانية تعيد الأولى إلى الواجهة */
if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => showWin());
  app.on('before-quit', () => { quitting = true; saveState(); });
  if (process.platform === 'win32') app.setAppUserModelId('tv.takeflow.desktop');   /* إشعارات ويندوز باسم البرنامج */
  app.whenReady().then(() => {
    /* الإشعارات والحافظة مسموحة لموقع المحطة وحده — الباقي يُرفض */
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => {
      const ok = ['notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'media'].includes(permission) && String(details && details.requestingUrl || '').startsWith(APP_ORIGIN);
      cb(ok);
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'عرض', submenu: [
        { label: 'إعادة تحميل', accelerator: 'CmdOrCtrl+R', click: () => win && win.webContents.reload() },
        { label: 'تكبير', accelerator: 'CmdOrCtrl+=', click: () => win && win.webContents.setZoomFactor(Math.min(2, win.webContents.getZoomFactor() + 0.1)) },
        { label: 'تصغير', accelerator: 'CmdOrCtrl+-', click: () => win && win.webContents.setZoomFactor(Math.max(0.6, win.webContents.getZoomFactor() - 0.1)) },
        { label: 'الحجم الأصليّ', accelerator: 'CmdOrCtrl+0', click: () => win && win.webContents.setZoomFactor(1) },
        { label: 'ملء الشاشة', accelerator: 'F11', click: () => win && win.setFullScreen(!win.isFullScreen()) },
        { type: 'separator' },
        { label: 'أدوات المطوّر', accelerator: 'F12', click: () => win && win.webContents.toggleDevTools() },
        { label: 'خروج', accelerator: 'CmdOrCtrl+Q', click: () => { quitting = true; app.quit(); } },
      ] },
      { label: 'المسارات', submenu: pathsMenu() },   /* 1.2 */
      { label: 'حول', submenu: [
        { label: 'TakeFlow TV — الإصدار ' + app.getVersion(), click: () => dialog.showMessageBox({ message: 'TakeFlow TV', detail: 'تطبيق سطح المكتب ' + app.getVersion() + '\n' + CFG.url + '\n\nTakeFlow Tv - تصميم وتطوير محمد قندقلي' }) },
        /* 1.3 — من قائمة النظام أيضاً: النتيجة تُقال في الصفحة (tf-update-state) */
        { label: 'تحقّق من التحديثات', click: async () => { const s = await updateCheck('menu'); if (!s.configured) dialog.showMessageBox({ message: 'التحديث التلقائيّ غير مضبوط بعد', detail: 'يُضبط وحده بعد الدخول إلى البرنامج: المصدر من إعدادات المحطة (الإعدادات ← حول ← التطبيق المكتبيّ).' }); else if (s.state === 'ready') dialog.showMessageBox({ message: 'إصدارٌ جديد جاهز ' + s.version, detail: 'يُثبَّت عند إغلاق التطبيق — أو من «أعد التشغيل الآن» في الصفحة.' }); } },
      ] },
    ]));
    wireDownloads();
    try { protocol.handle('tfmedia', serveMedia); } catch (e) { console.error('tfmedia', e.message); }   /* 1.2 */
    setTimeout(proxySweep, 20000);
    createTray();
    createWindow();
    app.on('activate', () => showWin());
    /* 1.3 — التحديث التلقائيّ: يُفحص بعد نصف دقيقة ثمّ كلّ ستّ ساعات، والبرنامج يسأل متى شاء */
    updaterInit();
    setTimeout(() => updateCheck('auto'), 30000);
    setInterval(() => updateCheck('auto'), 6 * 3600e3);
  });
}

/* ═══ 1.3 — التحديث بلا إعادة تثبيت ═══
   المثبّت الجديد يُنشر مرّةً فينزّله الغلاف في الخلفيّة ويُثبّته عند الإغلاق — أو فوراً من «أعد التشغيل الآن».
   الحالة تصل الصفحة عبر tf-update-state: checking · none · available · downloading · ready · error.

   1.3.1 — المصدر من المحطة لا من المثبّت: كان 1.3.0 يقرأ owner/repo من config.json، والفارغ فيه
   يعني «لا تحديث» حتّى يُعاد البناء. الآن تُرسل الصفحة (بعد الدخول) رابط المصدر — مجلّد
   desktop-releases في Supabase المحطة، يرفع الأدمن إليه المثبّت من الإعدادات ← «حول» — فيُحفظ في
   إعداد المستخدم ويُستعمل من الإقلاع التالي قبل أن تُفتح الصفحة.
   ولا يُقبل أيّ رابط: https وحده، ومن Supabase (مجلّدٌ عامّ) أو GitHub أو مضيفٍ في updates.allowHosts —
   فمن عبث بإعدادات المحطة لا يستطيع أن يدفع برنامجاً غريباً إلى أجهزة الغرفة. */
let UPD = { state: 'idle', version: '', percent: 0, error: '', at: 0, configured: false, updater: null, feed: '', wired: false, ready: Promise.resolve(), via: '' };
function updSend() { try { if (win && !win.isDestroyed()) win.webContents.send('tf-update-state', updState()); } catch (e) {} }
function updState() { return { state: UPD.state, version: UPD.version, percent: UPD.percent, error: UPD.error, at: UPD.at, configured: UPD.configured, current: app.getVersion(), feed: UPD.feed }; }
function feedOk(u) {
  let x; try { x = new URL(String(u || '')); } catch (e) { return false; }
  if (x.protocol !== 'https:' || x.username || x.password) return false;
  const extra = (CFG.updates && Array.isArray(CFG.updates.allowHosts) ? CFG.updates.allowHosts : []).map(String).filter((h) => /^[a-z0-9.*-]+$/i.test(h));
  const hostRe = (h) => new RegExp('^' + h.replace(/\./g, '\\.').replace(/\*/g, '[a-z0-9-]+') + '$', 'i');
  const host = x.hostname;
  if (/\.supabase\.co$/i.test(host)) return /^\/storage\/v1\/object\/public\/[^/]+\//.test(x.pathname);
  if (/^github\.com$/i.test(host)) return !!ghRepo(u) || /^\/[^/]+\/[^/]+\/releases\//.test(x.pathname);
  return extra.some((h) => hostRe(h).test(host));
}
/* 1.3.2 — رابط مستودع GitHub كما يُنسخ من المتصفّح (https://github.com/owner/repo · …/releases · …/releases/latest · …/releases/tag/v1)
   يصير مزوّد github: electron-updater يقرأ آخر إصدارٍ منشور (ومعه latest.yml) من المستودع العامّ. ومجلّد تنزيلٍ صريح
   (…/releases/download/… · …/releases/latest/download/) يبقى مصدراً عامّاً كما كان. لا غير github.com، ولا أسماء غريبة. */
function ghRepo(u) {
  let x; try { x = new URL(String(u || '')); } catch (e) { return null; }
  if (x.protocol !== 'https:' || x.username || x.password || !/^github\.com$/i.test(x.hostname) || x.search || x.hash) return null;
  const m = x.pathname.match(/^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})(\/.*)?$/);
  if (!m) return null;
  const repo = m[2].replace(/\.git$/i, ''), rest = (m[3] || '').replace(/\/+$/, '');
  if (!repo || /^\.+$/.test(repo)) return null;
  if (rest && !/^\/releases(?:\/latest|\/tag\/[A-Za-z0-9._-]{1,60})?$/.test(rest)) return null;
  return { owner: m[1], repo };
}
function updWire() {
  if (UPD.wired) return true;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true; autoUpdater.allowPrerelease = false;
    autoUpdater.on('checking-for-update', () => { UPD.state = 'checking'; UPD.error = ''; updSend(); });
    autoUpdater.on('update-available', (i) => { UPD.state = 'downloading'; UPD.version = String((i && i.version) || ''); UPD.percent = 0; updSend(); });
    autoUpdater.on('update-not-available', () => { UPD.state = 'none'; UPD.at = Date.now(); updSend(); });
    autoUpdater.on('download-progress', (p) => { UPD.state = 'downloading'; UPD.percent = Math.round((p && p.percent) || 0); updSend(); });
    autoUpdater.on('update-downloaded', (i) => { UPD.state = 'ready'; UPD.version = String((i && i.version) || UPD.version); UPD.percent = 100; updSend(); });
    autoUpdater.on('error', (e) => { UPD.state = 'error'; UPD.error = String((e && e.message) || e || '').slice(0, 200); updSend(); });
    UPD.updater = autoUpdater; UPD.wired = true;
    return true;
  } catch (e) { UPD.state = 'error'; UPD.error = String(e.message || e); console.error('updates', e.message); return false; }
}
/* المصدر: المحفوظ من المحطة (updates.feed) ← رابطٌ عامّ (updates.url) ← GitHub (owner/repo) */
function updaterInit() {
  const u = (CFG.updates && typeof CFG.updates === 'object') ? CFG.updates : {};
  if (u.enabled === false) { UPD.configured = false; return; }
  let feed = null, gh = null;
  if (u.feed && feedOk(u.feed) && (gh = ghRepo(u.feed))) feed = { provider: 'github', owner: gh.owner, repo: gh.repo, src: String(u.feed) };   /* 1.3.2 */
  else if (u.feed && feedOk(u.feed)) feed = { provider: 'generic', url: String(u.feed) };
  else if (u.provider === 'generic' && feedOk(u.url)) feed = { provider: 'generic', url: String(u.url) };
  else if (u.provider !== 'generic' && u.owner && u.repo) feed = { provider: 'github', owner: String(u.owner), repo: String(u.repo) };
  if (!feed) { UPD.configured = false; return; }
  if (!updWire()) { UPD.configured = false; return; }
  try {
    UPD.feed = feed.src || feed.url || ('github:' + feed.owner + '/' + feed.repo);
    if (feed.src) feed = { provider: 'github', owner: feed.owner, repo: feed.repo };   /* ما يصل المحدِّث: المزوّد وحده */
    if (feed.provider === 'generic' && /\.supabase\.co$/i.test(new URL(feed.url).hostname)) {
      /* تخزين Supabase: عبر الوسيط المحلّيّ (المثبّت قد يكون أجزاءً — القسم أدناه) */
      UPD.configured = true;
      UPD.ready = feedProxy(feed.url).then((local) => {
        UPD.updater.disableDifferentialDownload = true;
        UPD.updater.setFeedURL({ provider: 'generic', url: local, useMultipleRangeRequest: false });
        UPD.via = local;
      }).catch((e) => { UPD.configured = false; UPD.state = 'error'; UPD.error = 'feed proxy: ' + String((e && e.message) || e).slice(0, 160); });
    } else {
      UPD.updater.setFeedURL(feed); UPD.configured = true; UPD.via = ''; UPD.ready = Promise.resolve();
    }
  } catch (e) { UPD.configured = false; UPD.state = 'error'; UPD.error = String(e.message || e); }
}

/* ═══ 1.3.1 — الوسيط المحلّيّ: المثبّت أجزاءً على خطّة Supabase المجانيّة ═══
   الخطّة المجانيّة لا تقبل ملفّاً أكبر من ٥٠ ميغابايت، والمثبّت ~١٠٠. فترفعه الصفحة (الإعدادات ← حول)
   أجزاءً ≤ ٤٥ ميغابايت مع بيانها ‎<name>.parts.json‎. وelectron-updater يطلب ملفّاً واحداً برابطٍ واحد —
   فيسأل هنا وسيطاً على 127.0.0.1 بمنفذٍ عشوائيّ: latest.yml يمرّ كما هو من المحطة، والمثبّت إن وُجد
   ملفّاً واحداً يمرّ كما هو، وإلّا تُجمع أجزاؤه بترتيب بيانها في جوابٍ واحد بطوله الكامل.
   الأمان لا يتغيّر: البصمة SHA-512 في latest.yml (يكتبه الأدمن وحده) يتحقّق منها electron-updater بعد
   التنزيل — فجزءٌ ناقص أو مبدَّل يُرفض ولا يُثبَّت. والوسيط لا يطلب إلّا من مصدر المحطة المقبول (feedOk)،
   بأسماء ملفّاتٍ بسيطة، وبـGET وحده. والتنزيل كاملٌ دائماً (لا فرق blockmap عبر الأجزاء). */
const FEEDPX = { server: null, port: 0, base: '' };
const PX_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/;
const feedGet = (url) => fetch(url, { redirect: 'follow', cache: 'no-store' });
async function pipeWeb(body, res) {
  let n = 0;
  if (body) for await (const chunk of body) { n += chunk.length; if (!res.write(chunk)) await new Promise((r) => res.once('drain', r)); }
  return n;
}
async function feedParts(base, name) {
  let r; try { r = await feedGet(base + encodeURIComponent(name) + '.parts.json'); } catch (e) { return null; }
  if (!r.ok) return null;
  let j; try { j = await r.json(); } catch (e) { return null; }
  if (!j || j.name !== name || !Array.isArray(j.parts) || !j.parts.length || j.parts.length > 64 || !Number.isInteger(j.size)) return null;
  let sum = 0;
  for (const p of j.parts) {
    if (!p || typeof p.p !== 'string' || !PX_NAME.test(p.p) || p.p.indexOf(name + '.p') !== 0 || !Number.isInteger(p.size) || p.size <= 0) return null;
    sum += p.size;
  }
  return sum === j.size ? j : null;
}
async function feedServe(req, res) {
  const fail = (c) => { try { res.writeHead(c); res.end(); } catch (e) {} };
  try {
    if (req.method !== 'GET') return fail(405);
    let name = ''; try { name = decodeURIComponent(String(req.url || '').split('?')[0].replace(/^\/+/, '')); } catch (e) { return fail(400); }
    if (!PX_NAME.test(name) || !FEEDPX.base || !feedOk(FEEDPX.base)) return fail(404);
    if (/\.blockmap$/i.test(name)) return fail(404);                 /* التنزيل كاملٌ دائماً */
    const up = await feedGet(FEEDPX.base + encodeURIComponent(name));
    if (up.ok) {
      const h = { 'Content-Type': up.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'no-store' };
      const len = up.headers.get('content-length'); if (len && /^\d+$/.test(len)) h['Content-Length'] = len;
      res.writeHead(200, h); await pipeWeb(up.body, res); return res.end();
    }
    if (!/\.exe$/i.test(name)) return fail(404);
    const man = await feedParts(FEEDPX.base, name);
    if (!man) return fail(404);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': String(man.size), 'Cache-Control': 'no-store' });
    for (const p of man.parts) {
      const r = await feedGet(FEEDPX.base + encodeURIComponent(p.p));
      if (!r.ok) throw new Error('part ' + p.p + ': ' + r.status);
      if (await pipeWeb(r.body, res) !== p.size) throw new Error('part ' + p.p + ': size');
    }
    res.end();
  } catch (e) { try { res.destroy(e); } catch (x) {} }   /* جوابٌ مقطوع: electron-updater يعدّه فشلاً ويعيد لاحقاً */
}
function feedProxy(base) {
  FEEDPX.base = String(base || '');
  if (FEEDPX.server) return Promise.resolve('http://127.0.0.1:' + FEEDPX.port + '/');
  return new Promise((resolve, reject) => {
    const srv = require('http').createServer((q, r) => { feedServe(q, r); });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => { FEEDPX.server = srv; FEEDPX.port = srv.address().port; resolve('http://127.0.0.1:' + FEEDPX.port + '/'); });
  });
}
function updSaveFeed(url) {
  try {
    const f = path.join(app.getPath('userData'), 'config.json');
    let cur = {}; try { cur = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { cur = Object.assign({}, CFG); }
    cur.updates = Object.assign({}, (cur.updates && typeof cur.updates === 'object') ? cur.updates : {}, { feed: url });
    CFG.updates = Object.assign({}, (CFG.updates && typeof CFG.updates === 'object') ? CFG.updates : {}, { feed: url });
    fs.writeFileSync(f, JSON.stringify(cur, null, 2));
  } catch (e) { console.error('update feed', e.message); }
}
ipcMain.handle('tf-update-feed', (ev, url) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const v = String(url || '').trim();
  if (!feedOk(v)) return Object.assign(updState(), { ok: false, error: 'bad_feed' });   /* الترتيب: updState فيه error أيضاً */
  if ((CFG.updates || {}).enabled === false) return Object.assign(updState(), { ok: false, error: 'disabled' });
  const was = UPD.configured;
  if (v !== UPD.feed) { updSaveFeed(v); updaterInit(); }
  if (!was && UPD.configured) setTimeout(() => updateCheck('feed'), 5000);   /* أوّل مرّة: لا ننتظر ستّ ساعات */
  return Object.assign(updState(), { ok: UPD.configured });
});

async function updateCheck(why) {
  if (!UPD.configured || !UPD.updater) return updState();
  try { await UPD.ready; } catch (e) {}                              /* الوسيط المحلّيّ يُفتح أوّلاً */
  if (!UPD.configured) return updState();
  if (UPD.state === 'ready' || UPD.state === 'downloading' || UPD.state === 'checking') return updState();
  try { await UPD.updater.checkForUpdates(); } catch (e) { UPD.state = 'error'; UPD.error = String((e && e.message) || e).slice(0, 200); updSend(); }
  return updState();
}
ipcMain.handle('tf-update-check', async (ev) => fromApp(ev) ? await updateCheck('user') : { ok: false, error: 'origin' });
ipcMain.handle('tf-update-state', (ev) => fromApp(ev) ? updState() : { ok: false, error: 'origin' });
ipcMain.handle('tf-update-install', (ev) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  if (UPD.state !== 'ready' || !UPD.updater) return { ok: false, error: 'not_ready' };
  quitting = true;
  setTimeout(() => { try { UPD.updater.quitAndInstall(false, true); } catch (e) { console.error('install', e.message); } }, 200);
  return { ok: true };
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

/* فتح مسار NEWS: مسارٌ محلّيّ (C:\…) أو شبكيّ (\\NEWS\…) أو /… — لا روابط ولا أوامر */
const PATH_OK = /^(?:[a-zA-Z]:[\\/]|\\\\[^\\/]+\\|\/)[^\r\n"<>|*?]{1,600}$/;
ipcMain.handle('tf-open-path', async (ev, p) => {
  if (!CFG.openPaths) return { ok: false, error: 'disabled' };
  if (!ev.senderFrame || !String(ev.senderFrame.url || '').startsWith(APP_ORIGIN)) return { ok: false, error: 'origin' };
  const v = String(p || '').trim();
  if (!PATH_OK.test(v)) return { ok: false, error: 'bad_path' };
  const err = await shell.openPath(v);
  return err ? { ok: false, error: err } : { ok: true };
});
ipcMain.handle('tf-desktop-info', () => ({ version: app.getVersion(), platform: process.platform, url: CFG.url, host: seg(require('os').hostname() || '', 60) }));   /* 1.3.1 — اسم الجهاز: الوكيل يُعرَف به في الغرفة */
/* الغلاف 1.1 — من صفحة المحطة وحدها */
const fromApp = (ev) => !!(ev.senderFrame && String(ev.senderFrame.url || '').startsWith(APP_ORIGIN));
ipcMain.on('tf-badge', (ev, n) => { if (fromApp(ev)) setBadge(n); });
ipcMain.on('tf-focus', (ev) => { if (fromApp(ev)) showWin(); });

/* ═══ الغلاف 1.4 (v622) — شريط العنوان من الصفحة ═══
   tf-titlebar: الصفحة ترسم شريطها وتبلّغ لونيه فيتلوّن شريط أزرار ويندوز معه (لونان بصيغة #rrggbb وحدها، والارتفاع ٢٨–٤٨).
   tf-win-cmd: أوامر القوائم التي لا تملكها الصفحة — من قائمةٍ مسموحة بأسمائها، ومن صفحة المحطة وحدها. */
const HEX = /^#[0-9a-fA-F]{6}$/;
ipcMain.on('tf-titlebar', (ev, o) => {
  if (!fromApp(ev) || !CHROME || !win || win.isDestroyed()) return;
  titlebarSeen = true; clearTimeout(titlebarTimer);
  if (process.platform === 'darwin' || typeof win.setTitleBarOverlay !== 'function') return;
  const color = HEX.test(String(o && o.color)) ? String(o.color) : '#0a0e1a';
  const symbolColor = HEX.test(String(o && o.symbolColor)) ? String(o.symbolColor) : '#e8eef8';
  const height = Math.max(28, Math.min(48, Math.round(Number(o && o.height) || CHROME_H)));
  try { win.setTitleBarOverlay({ color, symbolColor, height }); } catch (e) { console.error('titlebar', e.message); }
});
const WIN_CMD = {
  reload: () => win.webContents.reload(),
  devtools: () => win.webContents.toggleDevTools(),
  fullscreen: () => win.setFullScreen(!win.isFullScreen()),
  quit: () => { quitting = true; app.quit(); },
  undo: () => win.webContents.undo(), redo: () => win.webContents.redo(),
  cut: () => win.webContents.cut(), copy: () => win.webContents.copy(), paste: () => win.webContents.paste(),
  selectAll: () => win.webContents.selectAll(),
  pickRoot: () => pickFolder('root'), pickAvid: () => pickFolder('avidWatch'),
  downloads: () => shell.openPath(app.getPath('downloads')),
};
ipcMain.on('tf-win-cmd', (ev, name) => {
  if (!fromApp(ev) || !win || win.isDestroyed()) return;
  const f = Object.prototype.hasOwnProperty.call(WIN_CMD, String(name)) ? WIN_CMD[String(name)] : null;
  if (f) { try { f(); } catch (e) { console.error('win-cmd', name, e.message); } }
});
/* صفحةٌ لا ترسم الشريط (أقدم من v622): شريط سحبٍ رفيع تحت أزرار النافذة ويُزاح المحتوى تحته — النافذة تبقى قابلةً للسحب */
function titlebarFallback() {
  try {
    win.webContents.insertCSS(`html{--tf-fb-h:${CHROME_H}px}body{margin-top:var(--tf-fb-h)!important}
      body::before{content:'TakeFlow TV';position:fixed;top:0;left:0;right:0;height:var(--tf-fb-h);z-index:2147483647;display:flex;align-items:center;
      padding:0 12px;font:600 12px system-ui;color:#e8eef8;background:#0a0e1a;-webkit-app-region:drag;app-region:drag}`);
  } catch (e) { console.error('titlebar fallback', e.message); }
}

/* ═══════════════════════════════════════════════════════════════════
   الغلاف 1.2 (v578) — المسار التلقائيّ · التحقّق · المراقبة · المعاينة · Avid
   TakeFlow Tv - تصميم وتطوير محمد قندقلي
   ═══════════════════════════════════════════════════════════════════ */
const PLAY_EXT = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4',
  aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const PROXY_EXT = ['mxf', 'mpg', 'mpeg', 'mts', 'm2ts', 'ts', 'avi', 'mkv', 'wmv', 'flv', 'dv', 'vob', 'mov'];
const extOf = (p) => path.extname(String(p || '')).slice(1).toLowerCase();
const isMedia = (p) => !!PLAY_EXT[extOf(p)] || PROXY_EXT.includes(extOf(p));
/* مسار ويندوز (قرص أو شبكة) يُركَّب بقواعد ويندوز حتّى في الفحص على غيره */
const PX = (p) => (/^[a-zA-Z]:[\\/]|^\\\\/.test(String(p || '')) ? path.win32 : path);
const within = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms))]);
/* جزءٌ من اسم مجلّد: لا محارف ممنوعة في ويندوز، ولا نقطة أو فراغ في آخره، ولا اسمٌ محجوز */
function seg(s, n) {
  let v = String(s == null ? '' : s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 60).replace(/[. ]+$/, '');
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(v)) v = '_' + v;
  return v;
}
const errOf = (e) => (e && (e.code === 'ENOENT' ? 'not_found' : e.code === 'ETIMEOUT' ? 'timeout' : (e.code === 'EACCES' || e.code === 'EPERM') ? 'denied' : 'unreachable')) || 'unreachable';
/* المجلّد ← أحدث ملفّ وسائط فيه (التسليم يُكتب مجلّداً غالباً) */
async function mediaIn(p) {
  const st = await within(fs.promises.stat(p), 6000);
  if (!st.isDirectory()) return { file: p, st };
  const names = (await within(fs.promises.readdir(p), 6000)).filter((n) => !/^[.~]/.test(n) && isMedia(n));
  let best = null;
  for (const n of names.slice(0, 300)) {
    try { const f = PX(p).join(p, n), s2 = await fs.promises.stat(f); if (s2.isFile() && (!best || s2.mtimeMs > best.st.mtimeMs)) best = { file: f, st: s2 }; } catch (e) {}
  }
  if (!best) throw Object.assign(new Error('no media'), { code: 'NOMEDIA' });
  return best;
}

/* ═══ 1.3.1 — وكيل صور النشرة: العين واليد على هذا الجهاز، والعقل في الصفحة ═══
   محمد: «أيّ حساب مصمّم يحطّ الفولدر… بس يشتغل البرنامج يشتغل الوكيل… وبالآخر موافقة المصمّم».
   1.3 كان يقصّ هنا من الوسط ويكتب مباشرةً. الآن:
   · الغلاف يراقب مجلّدات المشاهد ليومها (كلّ خمس ثوانٍ، والملفّ «وصل» حين يثبت حجمه في فحصين —
     لا fs.watch: المراقبة على SMB لا تُعتمد) ويبلّغ الصفحة بكلّ صورةٍ جديدة (tf-agent-file).
   · الصفحة تحجز الصورة في القاعدة (جهازٌ واحد يعالجها وإن كان الوكيل على عشرة أجهزة)، وتكشف الوجوه
     وتقترح القصّ، وترفع معاينةً للمراجعة — والمصمّم يوافق من أيّ مكان (البرنامج · تيليغرام).
   · بعد الموافقة ترسم الصفحة المقاسات بمصنع الصور وتطلب من الغلاف كتابتها (tf-agent-write).
   والغلاف لا يقرأ إلّا من جذر المصدر ولا يكتب إلّا في الوجهات — ما تقوله الصفحة لا يوسّع ذلك.
   · يبدأ وحده مع البرنامج لكلّ حسابٍ مخوَّل، إلّا إن أوقفه صاحب الجهاز («أوقف على هذا الجهاز»). */
const AGENT = { on: false, cfg: null, timer: null, seen: new Map(), busy: false, day: '', found: [], n: 0 };
const AG_IMG = /\.(jpe?g|png)$/i;
const AG_MAX = 80 * 1048576;
function agDay(fmt, d) {
  d = d || new Date(); const p = (x) => String(x).padStart(2, '0');
  const Y = d.getFullYear(), M = p(d.getMonth() + 1), D = p(d.getDate());
  return fmt === 'DD-MM-YYYY' ? D + '-' + M + '-' + Y : fmt === 'YYYYMMDD' ? Y + M + D : fmt === 'DD.MM.YYYY' ? D + '.' + M + '.' + Y : Y + '-' + M + '-' + D;
}
function agFill(pat, v) { return String(pat || '').replace(/\{(day|segment|bulletin|size|n)\}/g, (_, k) => seg(v[k] || '', 60) || '_'); }
function agJoin(root, rel) { const X = PX(root); return X.join(root, ...String(rel || '').split(/[\\/]+/).filter(Boolean)); }
/* الاسم: الرمز كلمةٌ كاملة («main01» اسمٌ لا مقاس · «full» و«w2» مقاسان · الرمز فيه حرفٌ دائماً — agValid)،
   والرقم يُقرأ بعد نزع الرمز: «w2-5» رقمها 5 لا 2 */
function agParse(base, sizes) {
  const b = String(base || '').trim();
  const words = b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const z = sizes.find((s) => words.includes(s.token.toLowerCase()));
  const rest = z ? b.replace(new RegExp('(^|[^a-z0-9])' + z.token + '(?=[^a-z0-9]|$)', 'i'), '$1') : b;
  const m = rest.match(/(\d+)/);
  const n = m ? m[1] : (seg(b, 30) || 'x');
  return { n, size: z ? z.id : '' };
}
function agValid(c) {
  if (!c || typeof c !== 'object') return null;
  const mine = (c.mine && typeof c.mine === 'object') ? c.mine : {};
  const src = String((mine.src && PATH_OK.test(String(mine.src))) ? mine.src : (c.src || ''));
  if (!PATH_OK.test(src)) return null;
  const tok = /^(?=[^a-z]*[a-z])[a-z0-9]{1,16}$/i;   /* حرفٌ واحدٌ على الأقلّ: «3.jpg» رقمٌ لا رمز */
  const sizes = (Array.isArray(c.sizes) ? c.sizes : []).slice(0, 12).map((s) => ({ id: seg(s.id, 20), name: seg(s.name, 40), token: String(s.token || ''), w: Math.round(+s.w), h: Math.round(+s.h) }))
    .filter((s) => s.id && tok.test(s.token) && s.w >= 16 && s.w <= 8000 && s.h >= 16 && s.h <= 8000);
  const want = Array.isArray(mine.segs) ? mine.segs.map(String) : [];
  const segments = (Array.isArray(c.segments) ? c.segments : []).slice(0, 20).map((s) => ({ id: seg(s.id, 20), name: seg(s.name, 40), dir: seg(s.dir || s.name, 60) }))
    .filter((s) => s.id && s.dir && (!want.length || want.includes(s.id)));
  const dests = (Array.isArray(c.dests) ? c.dests : []).slice(0, 12).map((d) => ({ id: seg(d.id, 20), name: seg(d.name, 40), path: String(d.path || ''),
    sizes: (Array.isArray(d.sizes) ? d.sizes : []).map(String), segs: (Array.isArray(d.segs) ? d.segs : []).map(String) })).filter((d) => d.id && d.name && PATH_OK.test(d.path));
  if (!sizes.length || !segments.length) return null;
  const pat = (v, def) => (/^[^:*?"<>|]{1,120}$/.test(String(v || '')) && !/\.\./.test(String(v)) ? String(v) : def);
  return { src, custom: src !== String(c.src || ''), sizes, segments, dests, dayFmt: String(c.dayFmt || 'YYYY-MM-DD'),
    srcPattern: pat(c.srcPattern, '{day}\\{segment}'), outPattern: pat(c.outPattern, '{day}\\{bulletin}\\{segment}\\{size}'), filePattern: pat(c.filePattern, '{bulletin}_{segment}_{n}_{size}') };
}
/* داخل الجذر فعلاً: المسار المطبَّع يبدأ بالجذر وفاصلٍ — لا «..» ولا جذرٌ يشبهه («\\NEWS\gfx2» ليس داخل «\\NEWS\gfx») */
function agInside(root, p) {
  const X = PX(root); const r = X.resolve(String(root || '')), q = X.resolve(String(p || ''));
  const win = X === path.win32, a = win ? r.toLowerCase() : r, b = win ? q.toLowerCase() : q;
  return b === a || b.startsWith(a.endsWith(X.sep) ? a : a + X.sep);
}
function agState() {
  const c = AGENT.cfg;
  return { on: AGENT.on, paused: !!CFG.agentPaused, day: AGENT.day, n: AGENT.n, custom: !!(c && c.custom), src: c ? c.src : '',
    segs: c ? c.segments.map((s) => s.id) : [], found: AGENT.found.slice(0, 30),
    watching: c ? c.segments.map((s) => agJoin(c.src, agFill(c.srcPattern, { day: agDay(c.dayFmt), segment: s.dir }))) : [] };
}
function agEmit(e) {
  AGENT.found.unshift(e); if (AGENT.found.length > 60) AGENT.found.length = 60; AGENT.n++;
  try { if (win && !win.isDestroyed()) win.webContents.send('tf-agent-file', e); } catch (x) {}
}
async function agTick() {
  if (!AGENT.on || !AGENT.cfg || AGENT.busy) return;
  AGENT.busy = true;
  try {
    const c = AGENT.cfg, day = agDay(c.dayFmt);
    if (day !== AGENT.day) { AGENT.day = day; AGENT.seen.clear(); }
    for (const sg of c.segments) {
      const dir = agJoin(c.src, agFill(c.srcPattern, { day, segment: sg.dir }));
      let names = [];
      try { names = await within(fs.promises.readdir(dir), 6000); } catch (e) { continue; }   /* مجلّد اليوم لم يُنشأ بعد */
      for (const nm of names) {
        if (!AG_IMG.test(nm) || /^[.~]/.test(nm)) continue;
        const f = PX(dir).join(dir, nm);
        let st; try { st = await within(fs.promises.stat(f), 6000); } catch (e) { continue; }
        if (!st.isFile() || st.size > AG_MAX || st.size <= 0) continue;
        const k = f.toLowerCase(), prev = AGENT.seen.get(k);
        if (prev && prev.done && prev.mtime === st.mtimeMs && prev.size === st.size) continue;
        if (prev && !prev.done && prev.size === st.size) {
          AGENT.seen.set(k, { done: true, mtime: st.mtimeMs, size: st.size });
          const base = PX(f).basename(f).replace(/\.[^.]+$/, ''), pr = agParse(base, c.sizes);
          const key = require('crypto').createHash('sha1').update(f.toLowerCase() + '|' + st.size + '|' + Math.round(st.mtimeMs)).digest('hex').slice(0, 24);
          agEmit({ at: Date.now(), key, path: f, file: PX(f).basename(f), name: base, seg: sg.id, segName: sg.name, segDir: sg.dir, n: pr.n, size: pr.size, bytes: st.size, day });
        } else if (!prev || prev.size !== st.size || (prev.done && prev.mtime !== st.mtimeMs)) {
          AGENT.seen.set(k, { done: false, size: st.size });   /* أوّل رؤية أو ما زال يُنسخ أو استُبدل */
        }
      }
    }
  } finally { AGENT.busy = false; }
}
function agStart(cfg) {
  AGENT.cfg = cfg; AGENT.on = true;
  if (AGENT.timer) clearInterval(AGENT.timer);
  AGENT.timer = setInterval(() => { agTick().catch(() => {}); }, 5000);
  agTick().catch(() => {});
}
function agStop() { AGENT.on = false; if (AGENT.timer) clearInterval(AGENT.timer); AGENT.timer = null; }
function agSaveCfg(patch) {
  try {
    const f = path.join(app.getPath('userData'), 'config.json');
    let cur = {}; try { cur = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { cur = Object.assign({}, CFG); }
    Object.assign(cur, patch); Object.assign(CFG, patch);
    fs.writeFileSync(f, JSON.stringify(cur, null, 2));
  } catch (e) { console.error('agent cfg', e.message); }
}
/* الصفحة ترسل الإعداد مع كلّ دخولٍ لحسابٍ مخوَّل (auto) — فيبدأ الوكيل وحده ما لم يُوقفه صاحب الجهاز.
   mine: ما يخصّ هذا الجهاز (مشاهده · مجلّدٌ خاصّ بدل جذر المحطة) — محفوظٌ هنا لا في القاعدة */
ipcMain.handle('tf-agent-set', (ev, o) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  o = o || {};
  if (o.mine && typeof o.mine === 'object') {
    const m = { segs: Array.isArray(o.mine.segs) ? o.mine.segs.map((x) => seg(x, 20)).filter(Boolean).slice(0, 20) : [], src: (o.mine.src && PATH_OK.test(String(o.mine.src))) ? String(o.mine.src) : '' };
    agSaveCfg({ agentMine: m });
  }
  if (o.enable === false) { agStop(); agSaveCfg({ agentPaused: true }); return Object.assign({ ok: true }, agState()); }
  if (o.enable === true) agSaveCfg({ agentPaused: false });
  if (!o.cfg) return Object.assign({ ok: true }, agState());
  const cfg = agValid(Object.assign({}, o.cfg, { mine: CFG.agentMine || {} }));
  if (!cfg) { agStop(); return Object.assign(agState(), { ok: false, error: 'bad_config' }); }
  AGENT.cfg = cfg;
  if (CFG.agentPaused || !(o.auto === true || o.enable === true || AGENT.on)) return Object.assign({ ok: true }, agState());
  agStart(cfg);
  return Object.assign({ ok: true }, agState());
});
ipcMain.handle('tf-agent-state', (ev) => fromApp(ev) ? Object.assign({ ok: true, mine: CFG.agentMine || { segs: [], src: '' } }, agState()) : { ok: false, error: 'origin' });
/* القراءة: من جذر المصدر وحده، صورةٌ بامتدادها، وبحدٍّ للحجم */
ipcMain.handle('tf-agent-read', async (ev, p) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const c = AGENT.cfg, f = String(p || '');
  if (!c || !PATH_OK.test(f) || !AG_IMG.test(f) || !agInside(c.src, f)) return { ok: false, error: 'bad_path' };
  try {
    const st = await within(fs.promises.stat(f), 8000);
    if (!st.isFile() || st.size > AG_MAX) return { ok: false, error: 'too_big' };
    const buf = await within(fs.promises.readFile(f), 30000);
    return { ok: true, bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), size: st.size, mtime: st.mtimeMs };
  } catch (e) { return { ok: false, error: errOf(e) }; }
});
/* الكتابة: داخل وجهةٍ من الإعداد وحده، باسمٍ مؤقّت .tfpart ثمّ إعادة التسمية (لا يلتقط برنامج البثّ نصف صورة) */
ipcMain.handle('tf-agent-write', async (ev, o) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const c = AGENT.cfg; o = o || {};
  const dir = String(o.dir || ''), name = seg(String(o.name || ''), 140);
  if (!c || !PATH_OK.test(dir) || !/\.(jpe?g|png)$/i.test(name)) return { ok: false, error: 'bad_path' };
  if (!c.dests.some((d) => agInside(d.path, dir))) return { ok: false, error: 'bad_path' };
  const bytes = o.bytes;
  if (!bytes || typeof bytes.byteLength !== 'number' || bytes.byteLength < 16 || bytes.byteLength > AG_MAX) return { ok: false, error: 'bad_data' };
  const dest = PX(dir).join(dir, name), tmp = dest + '.tfpart';
  try {
    await within(fs.promises.mkdir(dir, { recursive: true }), 8000);
    await within(fs.promises.writeFile(tmp, Buffer.from(bytes.buffer ? new Uint8Array(bytes.buffer, bytes.byteOffset || 0, bytes.byteLength) : bytes)), 20000);
    await within(fs.promises.rename(tmp, dest), 8000);
    return { ok: true, out: dest };
  } catch (e) { try { await fs.promises.unlink(tmp); } catch (x) {} return { ok: false, error: errOf(e) }; }
});
/* مجلّد المصدر الخاصّ بهذا الجهاز: بنافذة النظام لا بكتابة المسار */
ipcMain.handle('tf-agent-pick', async (ev) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  try {
    const r = await dialog.showOpenDialog(win, { title: 'مجلّد صور النشرة على هذا الجهاز', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths || !r.filePaths[0]) return { ok: false, error: 'canceled' };
    return PATH_OK.test(r.filePaths[0]) ? { ok: true, path: r.filePaths[0] } : { ok: false, error: 'bad_path' };
  } catch (e) { return { ok: false, error: 'dialog' }; }
});

/* 1.3.2 — «افحص المجلّد الآن»: ما في مجلّدات مشاهد اليوم الآن (لا ما رآه الوكيل منذ تشغيله) — قراءة أسماءٍ وحدها،
   داخل جذر المصدر، صورٌ بامتدادها وبحدّ الحجم، وبسقف ٢٠٠ — ويعمل والوكيل موقوف (الإعداد وصل من الصفحة) */
const AG_SCAN_MAX = 200;
ipcMain.handle('tf-agent-scan', async (ev) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const c = AGENT.cfg;
  if (!c) return { ok: false, error: 'no_config' };
  const day = agDay(c.dayFmt), files = [];
  for (const sg of c.segments) {
    if (files.length >= AG_SCAN_MAX) break;
    const dir = agJoin(c.src, agFill(c.srcPattern, { day, segment: sg.dir }));
    if (!agInside(c.src, dir)) continue;
    let names = [];
    try { names = await within(fs.promises.readdir(dir), 6000); } catch (e) { continue; }   /* مجلّد اليوم لم يُنشأ بعد */
    for (const nm of names.slice().sort()) {
      if (files.length >= AG_SCAN_MAX) break;
      if (!AG_IMG.test(nm) || /^[.~]/.test(nm)) continue;
      const f = PX(dir).join(dir, nm);
      let st; try { st = await within(fs.promises.stat(f), 6000); } catch (e) { continue; }
      if (!st.isFile() || st.size <= 0 || st.size > AG_MAX) continue;
      files.push({ path: f, file: nm, name: nm.replace(/\.[^.]+$/, ''), seg: sg.id, segName: sg.name, bytes: st.size });
    }
  }
  return { ok: true, day, on: AGENT.on, files };
});

ipcMain.handle('tf-desk-caps', (ev) => fromApp(ev)
  ? { v: '1.3.2', auto: !!MEDIA.root && PATH_OK.test(MEDIA.root), avid: !!MEDIA.avidWatch && PATH_OK.test(MEDIA.avidWatch), paths: !!CFG.openPaths, version: app.getVersion(), updates: UPD.configured, agent: !CFG.agentPaused, agentOn: AGENT.on }
  : {});

/* ═══ 1.2.1 — الطباعة: PDF مباشرٌ إلى «التنزيلات» بلا نافذةٍ منبثقة ═══
   كان البرنامج يفتح about:blank ليطبع، والغلاف يبعث كلّ نافذةٍ غريبةٍ إلى النظام فيقول ويندوز
   «لا تطبيق يفتح about». الآن الصفحة تسلّم المستند نفسه، ونافذةٌ مخفيّة تحوّله PDF وتحفظه
   باسمٍ لا يدهس ملفّاً موجوداً — وإشعارٌ يفتح مكانه. المستند من صفحة المحطة وحدها، وبمهلة. */
ipcMain.handle('tf-print-pdf', async (ev, o) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const html = String((o && o.html) || '');
  if (!html || html.length > 6 * 1024 * 1024) return { ok: false, error: 'bad_doc' };
  const name = String((o && o.name) || 'TakeFlow.pdf').replace(/[\\/:*?"<>|\r\n]+/g, '-');
  let pw = null;
  try {
    pw = new BrowserWindow({ show: false, width: 900, height: 1200,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false, images: true } });
    await within(pw.loadURL('data:text/html;charset=utf-8;base64,' + Buffer.from(html, 'utf8').toString('base64')), 15000);
    await new Promise((r) => setTimeout(r, 500));   /* الخطوط والصور */
    const pdf = await within(pw.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { marginType: 'default' } }), 30000);
    const to = uniquePath(app.getPath('downloads'), /\.pdf$/i.test(name) ? name : name + '.pdf');
    await within(fs.promises.writeFile(to, pdf), 8000);
    try {
      const n = new Notification({ title: 'حُفظ PDF', body: path.basename(to) + ' — اضغط لفتح مكانه', icon: ICON });
      n.on('click', () => shell.showItemInFolder(to));
      n.show();
    } catch (e) {}
    return { ok: true, path: to, name: path.basename(to) };
  } catch (e) { return { ok: false, error: errOf(e) }; }
  finally { try { if (pw) pw.destroy(); } catch (e) {} }
});

/* من نافذة التسليم: «حدّد الجذر» حين لا جذر — نافذة النظام نفسها */
ipcMain.handle('tf-desk-pick', async (ev, key) => (fromApp(ev) && (key === 'root' || key === 'avidWatch')) ? { ok: await pickFolder(key), path: MEDIA[key] || '' } : { ok: false });

/* ① المسار التلقائيّ: <الجذر>\<اليوم>\<النشرة>\<رقم المادّة - العنوان>\<التصميم|المونتاج> */
ipcMain.handle('tf-fs-auto', async (ev, o) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  if (!MEDIA.root || !PATH_OK.test(MEDIA.root)) return { ok: false, error: 'no_root' };
  o = o || {};
  const d = new Date(), pad = (n) => String(n).padStart(2, '0');
  const day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const item = [seg(o.ref, 40), seg(o.title, 60)].filter(Boolean).join(' - ') || 'بلا عنوان';
  const full = PX(MEDIA.root).join(MEDIA.root, day, seg(o.show, 50) || 'عامّ', item, o.role === 'montage' ? 'المونتاج' : 'التصميم');
  if (!PATH_OK.test(full)) return { ok: false, error: 'bad_path' };
  try { await within(fs.promises.mkdir(full, { recursive: true }), 8000); return { ok: true, path: full }; }
  catch (e) { return { ok: false, error: errOf(e) }; }
});

/* ② التحقّق: موجود؟ مجلّد أم ملفّ؟ كم ملفّاً؟ — بمهلة: مسار شبكةٍ لا يُصل إليه لا يعلّق النافذة */
ipcMain.handle('tf-fs-check', async (ev, p) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const v = String(p || '').trim();
  if (!PATH_OK.test(v)) return { ok: false, error: 'bad_path' };
  try {
    const st = await within(fs.promises.stat(v), 6000);
    if (!st.isDirectory()) return { ok: true, exists: true, dir: false, size: st.size, media: isMedia(v) };
    const names = (await within(fs.promises.readdir(v), 6000)).filter((n) => !/^[.~]/.test(n));
    return { ok: true, exists: true, dir: true, files: names.length, media: names.filter(isMedia).length };
  } catch (e) {
    if (e && e.code === 'ENOENT') return { ok: true, exists: false };
    return { ok: false, error: errOf(e) };
  }
});

/* ③ مراقبة مجلّد التسليم — فحصٌ دوريّ لا fs.watch (لا يُعتمد عليه في مجلّدات الشبكة):
   الملفّ «وصل» حين يثبت حجمه بين فحصين، والمؤقّت والجزئيّ لا يُحسبان. أربع مراقباتٍ معاً وساعتان حدّاً. */
const WATCH = new Map();
function stopWatch(id) { const w = WATCH.get(id); if (!w) return; clearInterval(w.timer); clearTimeout(w.stopAt); WATCH.delete(id); }
ipcMain.handle('tf-fs-watch', async (ev, o) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const v = String((o && o.path) || '').trim(), id = String((o && o.id) || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (!PATH_OK.test(v) || !id) return { ok: false, error: 'bad_path' };
  stopWatch(id);
  let names;
  try { names = await within(fs.promises.readdir(v), 6000); } catch (e) { return { ok: false, error: errOf(e) }; }
  while (WATCH.size >= 4) stopWatch(WATCH.keys().next().value);
  const seen = new Set(names), pending = new Map(), wc = ev.sender;
  const poll = async () => {
    let list;
    try { list = await within(fs.promises.readdir(v), 6000); } catch (e) { return; }
    for (const n of list) {
      if (seen.has(n) || /^[.~]|\.(tmp|part|partial|crdownload|tfpart)$/i.test(n)) continue;
      let st;
      try { st = await fs.promises.stat(PX(v).join(v, n)); } catch (e) { continue; }
      if (st.isDirectory()) { seen.add(n); continue; }
      const prev = pending.get(n);
      if (prev && prev.size === st.size && st.size > 0) {
        seen.add(n); pending.delete(n);
        if (!wc.isDestroyed()) wc.send('tf-fs-arrived', { id, name: n, path: PX(v).join(v, n), size: st.size, media: isMedia(n) });
      } else pending.set(n, { size: st.size });
    }
  };
  WATCH.set(id, { timer: setInterval(poll, 1500), stopAt: setTimeout(() => stopWatch(id), 2 * 3600e3) });
  return { ok: true, watching: v };
});
ipcMain.handle('tf-fs-unwatch', (ev, id) => { if (fromApp(ev)) stopWatch(String(id || '')); return { ok: true }; });

/* ④ المعاينة — رمزٌ عشوائيّ لكلّ ملفّ يطلبه البرنامج، يعيش ستّ ساعات. الرابط لا يحمل مساراً */
const TOKENS = new Map();
function tokenFor(file, mime) {
  const t = crypto.randomBytes(16).toString('hex');
  TOKENS.set(t, { file, mime, exp: Date.now() + 6 * 3600e3 });
  return 'tfmedia://m/' + t;
}
async function serveMedia(req) {
  try {
    const u = new URL(req.url);
    const e = TOKENS.get(u.pathname.replace(/^\/+/, ''));
    if (u.hostname !== 'm' || !e || e.exp < Date.now()) return new Response('', { status: 404 });
    const size = (await fs.promises.stat(e.file)).size;
    let start = 0, end = size - 1, status = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.get('range') || '').trim());
    if (m && (m[1] || m[2])) {
      status = 206;
      if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), size - 1); }
      else { start = Math.max(0, size - Number(m[2])); }
    }
    if (start > end || start >= size) return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    const h = { 'Content-Type': e.mime, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': APP_ORIGIN };
    if (status === 206) h['Content-Range'] = 'bytes ' + start + '-' + end + '/' + size;
    return new Response(Readable.toWeb(fs.createReadStream(e.file, { start, end })), { status, headers: h });
  } catch (err) { return new Response('', { status: 404 }); }
}
/* ffmpeg: ما في config.json، ثمّ المرفق مع التطبيق، ثمّ ما في PATH */
function ffmpegPath() {
  if (MEDIA.ffmpeg && fs.existsSync(MEDIA.ffmpeg)) return MEDIA.ffmpeg;
  const bundled = path.join(process.resourcesPath || __dirname, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  return fs.existsSync(bundled) ? bundled : 'ffmpeg';
}
const PROXY_DIR = () => path.join(app.getPath('userData'), 'proxies');
const JOBS = new Map();
const secs = (t) => { const m = /(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(t || ''); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0; };
function makeProxy(job, file, out, wc) {
  const tmp = out + '.part.mp4';
  const args = ['-hide_banner', '-nostdin', '-y', '-i', file, '-map', '0:v:0?', '-map', '0:a:0?', '-vf', 'scale=-2:' + (Number(MEDIA.proxyHeight) || 540),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', tmp];
  let dur = 0, last = -1, done = false;
  const send = (ch, d) => { try { if (wc && !wc.isDestroyed()) wc.send(ch, Object.assign({ job }, d)); } catch (e) {} };
  const fail = (why) => { if (done) return; done = true; JOBS.delete(job); try { fs.unlinkSync(tmp); } catch (e) {} send('tf-media-failed', { error: why }); };
  let ff;
  try { ff = spawn(ffmpegPath(), args, { windowsHide: true }); } catch (e) { fail('no_ffmpeg'); return; }
  JOBS.set(job, ff);
  ff.on('error', (e) => fail(e && e.code === 'ENOENT' ? 'no_ffmpeg' : 'ffmpeg'));
  ff.stderr.on('data', (b) => {
    const t = String(b);
    if (!dur) dur = secs((/Duration: ([\d:.]+)/.exec(t) || [])[1]);
    const tm = /time=([\d:.]+)/.exec(t);
    if (dur && tm) { const pct = Math.min(99, Math.floor(secs(tm[1]) / dur * 100)); if (pct !== last) { last = pct; send('tf-media-progress', { pct }); } }
  });
  ff.on('close', (code) => {
    if (done) return;
    if (code !== 0) { fail('ffmpeg'); return; }
    try { fs.renameSync(tmp, out); } catch (e) { fail('ffmpeg'); return; }
    done = true; JOBS.delete(job);
    send('tf-media-ready', { url: tokenFor(out, 'video/mp4'), kind: 'video', proxy: true });
  });
}
/* النسخ الخفيفة تُحذف بعد سبعة أيّام */
function proxySweep() {
  try {
    const dir = PROXY_DIR();
    for (const n of fs.readdirSync(dir)) { const f = path.join(dir, n); try { if (Date.now() - fs.statSync(f).mtimeMs > 7 * 864e5) fs.unlinkSync(f); } catch (e) {} }
  } catch (e) {}
}
ipcMain.handle('tf-media-open', async (ev, o) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  const v = String((o && o.path) || '').trim();
  if (!PATH_OK.test(v)) return { ok: false, error: 'bad_path' };
  let hit;
  try { hit = await mediaIn(v); } catch (e) { return { ok: false, error: e && e.code === 'NOMEDIA' ? 'no_media' : errOf(e) }; }
  const x = extOf(hit.file), name = path.basename(hit.file);
  if (!isMedia(hit.file)) return { ok: false, error: 'not_media' };
  const mime = PLAY_EXT[x];
  const kind = /^image\//.test(mime || '') ? 'image' : /^audio\//.test(mime || '') ? 'audio' : 'video';
  if (mime && !(o && o.proxy)) return { ok: true, url: tokenFor(hit.file, mime), kind, name, size: hit.st.size };
  if (kind !== 'video') return { ok: false, error: 'not_media' };
  const key = crypto.createHash('sha1').update(hit.file + '|' + hit.st.size + '|' + hit.st.mtimeMs).digest('hex').slice(0, 24);
  const out = path.join(PROXY_DIR(), key + '.mp4');
  try { if (fs.statSync(out).size > 0) return { ok: true, url: tokenFor(out, 'video/mp4'), kind: 'video', proxy: true, name }; } catch (e) {}
  if (JOBS.has(key)) return { ok: true, pending: true, job: key, name };
  if (JOBS.size >= 2) return { ok: false, error: 'busy' };
  try { fs.mkdirSync(PROXY_DIR(), { recursive: true }); } catch (e) {}
  makeProxy(key, hit.file, out, ev.sender);
  return { ok: true, pending: true, job: key, name };
});

/* ⑤ إلى Avid: نسخٌ باسمٍ مؤقّت (.tfpart) ثمّ مطابقة الحجم ثمّ إعادة التسمية — لا يلتقط Avid نصف ملفّ */
ipcMain.handle('tf-avid-send', async (ev, o) => {
  if (!fromApp(ev)) return { ok: false, error: 'origin' };
  if (!MEDIA.avidWatch || !PATH_OK.test(MEDIA.avidWatch)) return { ok: false, error: 'no_avid' };
  const v = String((o && o.path) || '').trim(), id = String((o && o.id) || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (!PATH_OK.test(v)) return { ok: false, error: 'bad_path' };
  let hit;
  try { hit = await mediaIn(v); } catch (e) { return { ok: false, error: e && e.code === 'NOMEDIA' ? 'no_media' : errOf(e) }; }
  const x = extOf(hit.file);
  if (!isMedia(hit.file)) return { ok: false, error: 'not_media' };
  try { await within(fs.promises.access(MEDIA.avidWatch, fs.constants.W_OK), 6000); } catch (e) { return { ok: false, error: 'avid_' + errOf(e) }; }
  const base = [seg(o && o.ref, 40), seg(o && o.title, 60)].filter(Boolean).join(' - ') || path.basename(hit.file, '.' + x);
  const P = PX(MEDIA.avidWatch);
  let dest = P.join(MEDIA.avidWatch, seg(base, 110) + '.' + x), i = 1;
  while (fs.existsSync(dest) && i < 500) dest = P.join(MEDIA.avidWatch, seg(base, 100) + ' (' + (i++) + ').' + x);
  const tmp = dest + '.tfpart', total = hit.st.size, wc = ev.sender;
  try {
    await new Promise((res, rej) => {
      const rs = fs.createReadStream(hit.file), ws = fs.createWriteStream(tmp);
      let got = 0, last = -1;
      rs.on('data', (b) => {
        got += b.length;
        const pct = total ? Math.floor(got / total * 100) : 100;
        if (pct !== last) { last = pct; try { if (!wc.isDestroyed()) wc.send('tf-avid-progress', { id, pct }); } catch (e) {} }
      });
      rs.on('error', rej); ws.on('error', rej); ws.on('finish', res);
      rs.pipe(ws);
    });
    const got = (await fs.promises.stat(tmp)).size;
    if (got !== total) throw Object.assign(new Error('size'), { code: 'ESIZE' });
    await fs.promises.rename(tmp, dest);
    return { ok: true, dest, size: total, name: path.basename(dest) };
  } catch (e) {
    try { await fs.promises.unlink(tmp); } catch (e2) {}
    return { ok: false, error: e && e.code === 'ESIZE' ? 'size_mismatch' : errOf(e) };
  }
});
