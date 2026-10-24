# لوحة TakeFlow داخل Avid Media Composer

TakeFlow Tv - تصميم وتطوير محمد قندقلي · v752 · **هيكلٌ موثَّق: الصفحة جاهزة، والغلاف ينتظر تسجيل Avid**

**TakeFlow panel inside Avid Media Composer · v752 · a documented scaffold: the page is ready, the wrapper waits for the Avid registration.**

---

## كيف تعمل اللوحة في Media Composer
**How a panel works in Media Composer**

تسمح Avid لشركاء التطوير ببناء «لوحات» (Media Composer Panel SDK) تفتح داخل نافذة المونتاج: اللوحة متصفّحٌ مضمَّن (Chromium) يحمّل عنواناً على الويب، ويعطيه جسراً (JavaScript API) إلى المونتاج: استيراد ملفّات إلى Bin، فتح ملفّ، قراءة التحديد، التصدير إلى مجلّد. الواجهة نفسها صفحةُ ويب عاديّة.

*Avid lets development partners build panels (Media Composer Panel SDK) that open inside the editing window: the panel is an embedded Chromium that loads a web URL and gives it a JavaScript bridge into Media Composer — import files into a Bin, open a file, read the selection, export to a folder. The UI itself is an ordinary web page.*

TakeFlow لا يحتاج صفحةً جديدة لذلك: الموقع نفسه يفتح في **وضع اللوحة** (`?mode=panel`)، فيخفي الشريط العلويّ والجانبيّ والسفليّ ويبقي عموداً واحداً ضيّقاً (٣٢٠–٥٦٠ بكسل) بطلبات المونتير. وهذا الوضع يعمل اليوم في أيّ متصفّح.

*TakeFlow needs no new page for that: the same site opens in panel mode (`?mode=panel`), hides the top, side and bottom bars and keeps one narrow column (320–560 px) with the editor's montage items. This mode works today in any browser.*

**عنوان اللوحة — Panel URL:** `https://<station>.takeflowtv.com/?mode=panel&for=avid`

(`<station>` هو نطاق المحطّة في TakeFlow. `vercel.json` يمنع فتح الموقع داخل `iframe` — فاللوحة صفحةٌ عليا في متصفّح الـSDK لا إطارٌ داخل صفحة.)

*(`<station>` is the station's TakeFlow domain. `vercel.json` forbids framing, so the panel is a top-level page inside the SDK's browser, not an iframe.)*

---

## ما يعمل اليوم بلا الـSDK
**What works today without the SDK**

افتح العنوان أعلاه في أيّ متصفّح على جهاز المونتير (أو ثبّته كتطبيقٍ من Chrome/Edge ليبقى نافذةً صغيرة بجانب Avid):

*Open the URL above in any browser on the editor's machine (or install it as a Chrome/Edge app so it stays a small window next to Avid):*

- باب الدخول نفسه إن لم تكن جلسة؛ وبعده قائمة **طلباتي في المونتاج**: ما استلمته، وما هو مفتوحٌ لقسم المونتاج وجاهزٌ (سلّم المصمّم أو لا جرافيك قبله)، بترتيب موعد البثّ، مع التحديث اللحظيّ نفسه الذي في البرنامج.
  *The same sign-in door when there is no session; then my montage items (taken by me, or open to the montage desk and ready), by air time, with the app's live updates.*
- في كلّ بطاقة: النشرة والموعد · العنوان · رقم المادّة بأرقام المحطّة · الحال (`tfStage`) · مكان المادّة المحفوظ (`__pathM` ثمّ `__airPath` ثمّ `completed_file_path`) مع زرّ **«انسخ المسار»**.
  *Per card: bulletin and time · title · material number · stage · the stored material path with a Copy path button.*
- **«بدأت»** = قبول المسار وبدء التركيب (`rawAccept(id, 'M')`) · **«سلّمت»** = تسليم البثّ بنافذته نفسها (`rawAirDeliver(id)`). الطلب القديم ببطاقات يمرّ بـ`startMontageWork` / `finishMontageWork`.
  *Started = accept and start (`rawAccept`) · Delivered = the deliver-to-air dialog (`rawAirDeliver`). Legacy card requests go through `startMontageWork` / `finishMontageWork`.*
- تبديل اللغة من رأس اللوحة، والبحث بالعنوان أو رقم المادّة أو النشرة.
  *Language toggle in the header; search by title, material number or bulletin.*

ما لا يعمل بلا الـSDK: زرّا **«إلى الـ Bin»** و**«افتح القالب»** — يظهران فقط حين يضع الغلاف الجسر `window.tfHost` ويقول إنّه يقدر.

*Not available without the SDK: the To Bin and Open template buttons — they appear only when the wrapper installs the `window.tfHost` bridge and reports the capability.*

---

## ما على غلاف الـSDK أن ينفّذه — جسر `window.tfHost`
**What the SDK wrapper must implement — the `window.tfHost` bridge**

الغلاف يحقن سكربتاً صغيراً قبل تحميل الصفحة (أو في أوّلها) يعرّف:

*The wrapper injects a small script before the page (or at its very top) that defines:*

```js
window.tfHost = {
  kind: 'avid',                                   // 'avid' | 'ps' | null
  can(cap) { return cap === 'importToBin' || cap === 'openFile' || cap === 'exportTo'; },
  importToBin(binName, paths) { /* SDK import API → Promise<{ ok: true } | { ok: false, error: '…' }> */ },
  openFile(path)             { /* SDK open/locate  → Promise<{ ok, error }> */ },
  exportTo(dir)              { /* SDK export       → Promise<{ ok, error }> */ },
};
```

- `importToBin(binName, paths)`: `binName` هو رقم المادّة (أو العنوان إن لا رقم)، و`paths` لائحة مسارات UNC كما خُزّنت في الطلب. الغلاف يستعمل واجهة الاستيراد في الـSDK ليُنشئ Bin بهذا الاسم (أو يفتحه) ويستورد الملفّات إليه. يعيد `{ ok: true }` أو `{ ok: false, error }` — الصفحة تعرض الخطأ كما هو وتقول ما يُفعل.
  *`binName` is the material number (or the title); `paths` are UNC paths as stored. The wrapper creates or opens that Bin through the SDK import API and imports the files. It resolves `{ ok: true }` or `{ ok: false, error }`; the page shows the error and what to do.*
- `openFile(path)`: يفتح الملفّ أو يحدّده في المونتاج. · `exportTo(dir)`: يصدّر التحديد الحاليّ إلى مجلّد (للنسخة التالية: تسليمٌ من داخل اللوحة).
  *`openFile` opens or locates the file; `exportTo` exports the current selection to a folder (next version: deliver from inside the panel).*
- الجسر الفارغ الذي تضعه الصفحة وحدها: `{ kind: null, can: () => false }` — فلا زرّ يظهر. الفحوص تضع جسراً وهميّاً يسجّل النداءات (`tf-view.cjs` مجموعة `v752p` · `tf-live.cjs`).
  *The page alone installs `{ kind: null, can: () => false }`, so no button shows. The tests install a fake bridge that records the calls.*

---

## ما يلزم من المحطّة
**What the station must tell us**

- إصدار Media Composer على أجهزة المونتاج (الـPanel SDK يحتاج 2022.12 فما فوق، والأفضل 2023.x أو أحدث).
  *The Media Composer version on the editing machines (Panel SDK needs 2022.12 or later; 2023.x or newer is better).*
- نوع التخزين: **NEXIS** (المسارات بحرفٍ أو عبر NEXIS Client) أو **خادم ملفّات عاديّ** بمسارات UNC — لأنّ الاستيراد إلى Bin يتعامل مع كلٍّ منهما بطريقته.
  *Storage type: NEXIS or a plain file server with UNC paths — the Bin import treats each differently.*
- هل المسارات المحفوظة في TakeFlow (`__pathM` · `__airPath`) هي نفسها التي يراها جهاز المونتير (الحرف نفسه أو UNC نفسه).
  *Whether the paths stored in TakeFlow are the ones the editor's machine sees (same drive letter or same UNC).*
- اسم المسؤول التقنيّ الذي سيثبّت الغلاف على الأجهزة، والسماح لنطاق المحطّة في جدار الحماية من متصفّح الـSDK.
  *The technical contact who will install the wrapper, and that the station domain is allowed from the SDK browser.*

---

## رسالة التسجيل إلى Avid — جاهزة للإرسال
**Registration email to Avid — ready to send**

**إلى — To:** `partners@avid.com`
**الموضوع — Subject:** `Media Composer Panel SDK access — TakeFlow TV newsroom production platform`

**ملخّص بالعربيّة:** نعرّف Avid بمنصّة TakeFlow TV (إدارة الإنتاج في غرفة الأخبار: من المحرّر إلى الجرافيك والمونتاج والبثّ)، ونطلب الوصول إلى Panel SDK وعقد الشراكة لبناء لوحةٍ داخل Media Composer تعرض للمونتير مهامّه ومسارات المادّة، وتستورد الملفّات إلى Bin، وتسجّل البدء والتسليم. نذكر أنّ اللوحة صفحة ويب جاهزة اليوم، وأنّ الحاجة هي الجسر الرسميّ وحده، ونطلب المستندات ومتطلّبات التوقيع والتوزيع.

*(The Arabic summary above says what the English email below says.)*

```
Subject: Media Composer Panel SDK access — TakeFlow TV newsroom production platform

Hello Avid Partner team,

We build TakeFlow TV, a production-management platform for television newsrooms: editors send
requests to graphics, montage and playout; each request carries its material number, air time,
delivery path and status, and the on-air board and rundown read from the same data.

Our montage editors work in Media Composer, and we would like to give them a panel inside it:
a narrow web page (already live at https://<station>.takeflowtv.com/?mode=panel&for=avid) that
lists their assigned items by air time, shows the stored material path, and records "started"
and "delivered" back to the newsroom. With the Panel SDK bridge we would add two actions:
import the delivered files into a Bin named after the material number, and open or locate a file.

We are writing to request:
  1. access to the Media Composer Panel SDK and its documentation,
  2. the partner / developer agreement needed to build and distribute such a panel,
  3. the signing and distribution requirements for installing the panel on station machines,
  4. the supported Media Composer versions and any notes for NEXIS versus plain file-server storage.

The panel needs no media processing from Media Composer beyond the SDK's import, open and export
calls; all newsroom data stays on the station's own servers.

Thank you — we are happy to share a demo of the panel page and answer any technical questions.

Best regards,
TakeFlow TV — development
<contact email>
```

قبل الإرسال: ضع نطاق المحطّة وبريد التواصل. لا أسماء ولا مفاتيح في الرسالة.

*Before sending: put in the station domain and the contact email. No names and no keys in the message.*

---

## الفحوص
**Checks**

- `tf-view.cjs` مجموعة `v752p`: الصفحة في `?mode=panel&for=avid` و`for=ps` على 360×720 و480×900 بالعربيّة والإنكليزيّة — لا شريط علويّ ولا جانبيّ، البطاقات بترتيب الموعد، رقم المادّة بأرقام المحطّة، «انسخ المسار»، «بدأت» و«سلّمت» تكتبان في الطلب فعلاً، أزرار المضيف غائبةٌ بلا جسر وحاضرةٌ بجسرٍ وهميّ، لا تمرير أفقيّ، لا عربيّة في الإنكليزيّة. الصور `tf-view-shots/v752p-*.png`.
- `tf-live.cjs` كتلة `v752p`: ترشيح `tfPanelRows` (لي · لقسمي · لا لغيري · لا المسلَّم) ومحتوى البطاقة وبوّابة الجسر.
- `tf-edge.mjs` كتلة `PN752`: لوحة Photoshop في Node (الدخول والختم والقائمة والتسليم).
