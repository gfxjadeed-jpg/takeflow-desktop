# إصدار التطبيق المكتبيّ من GitHub — من المتصفّح وحده (v614)

TakeFlow Tv - تصميم وتطوير محمد قندقلي

**الفكرة:** لا بناء على جهازك. GitHub يبني مثبّت ويندوز (ومعه ffmpeg) وينشره في Releases ومعه `latest.yml`، والأجهزة تلتقطه وحدها من «مصدر التحديث».

## مرّةً واحدة — المستودع
1. GitHub ← **New repository** ← الاسم `takeflow-desktop` ← **Public** (المحدِّث يقرأ بلا توكن) ← Create.
2. في المستودع: **Add file ← Upload files** ← اسحب **محتوى** مجلّد `desktop/` (لا المجلّد نفسه): `main.js` · `preload.js` · `config.json` · `package.json` · `README.md` · `.gitignore` · مجلّد `build/` ← **Commit changes**.
3. ملفّ العمل الآليّ: **Add file ← Create new file** ← اكتب في الاسم حرفيّاً `.github/workflows/release.yml` ← الصق محتوى `desktop/.github/workflows/release.yml` ← **Commit changes**.
   (مجلّدٌ اسمه يبدأ بنقطة لا يُرفع بالسحب أحياناً — لذلك يُنشأ هكذا.)
4. **Settings ← Actions ← General ← Workflow permissions ← Read and write permissions** ← Save.

## كلّ إصدار
1. افتح `package.json` في المستودع ← ✎ ← غيّر `"version"` (مثلاً `1.3.3`) ← Commit.
2. **Actions ← release ← Run workflow ← Run**. (أو أنشئ وسماً `v1.3.3` — والوسم يجب أن يطابق الإصدار وإلّا يتوقّف قبل النشر.)
3. بعد ٦–١٠ دقائق: **Releases** فيها `v1.3.3` ومعها ثلاثة ملفّات: `TakeFlow-TV-Setup-1.3.3.exe` · `….exe.blockmap` · `latest.yml`. وبصمة SHA-256 في سجلّ التشغيل (خطوة sha256).

## مرّةً واحدة — التوكن (v751 · للمسار الآليّ)
المسار الآليّ تحت يدفع من مستودع TakeFlow إلى `takeflow-desktop`، و`GITHUB_TOKEN` لا يكتب في مستودعٍ آخر — لذلك توكنٌ دقيق (fine-grained) لهذا المستودع وحده:
1. GitHub ← صورة الحساب ← **Settings** ← **Developer settings** ← **Personal access tokens** ← **Fine-grained tokens** ← **Generate new token**.
2. الاسم `takeflow-desktop-release` · **Expiration**: أطول ما يُسمح به (سنة) — GitHub يذكّر بالبريد قبل انتهائه، فيُنشأ آخر ويُبدَّل السرّ نفسه · **Resource owner**: الحساب الذي فيه `takeflow-desktop`.
3. **Repository access** ← **Only select repositories** ← `takeflow-desktop` وحده.
4. **Permissions ← Repository permissions** ← **Contents: Read and write** (يضيف Metadata: Read وحده). و**Workflows: Read and write** فقط إن كان `desktop/.github/workflows/release.yml` سيتغيّر يوماً — دفع تغييرٍ في ملفّ عملٍ يحتاجها، وما سواه لا.
5. **Generate token** ← انسخه الآن (لا يُعرض ثانيةً).
6. في مستودع TakeFlow (الخاصّ): **Settings ← Secrets and variables ← Actions ← New repository secret** ← الاسم `DESKTOP_RELEASE_TOKEN` حرفيّاً ← الصق ← **Add secret**.

## كلّ إصدار — آليّاً من مستودع TakeFlow (v751)
1. في الفرع المدموج: `desktop/package.json` ← `"version"` مرفوع (مثلاً `1.9.5`) — الحارس والمحاكي يلزمان به مع الإصدار. (1.9.6 · v752: `inews.js` ضمن `build.files` — المثبّت يحمله مع `main.js` و`preload.js`.)
2. **Actions ← Desktop installer ← Run workflow** ← `version` = الرقم نفسه ← علامة `confirm` ← **Run workflow**.
3. ما يجري (`.github/workflows/tf-desktop.yml`): المحاكي `node tf-desk.cjs` ← نسخ محتوى `desktop/` إلى `takeflow-desktop` (`rsync --delete` و`.git` يُترك) ← commit `desktop 1.9.5 (v751)` ← الوسم `v1.9.5` ← فيبني `release.yml` هناك المثبّت وينشره كما في «كلّ إصدار» فوق (٦–١٠ دقائق).
4. يتوقّف برسالةٍ واضحة قبل أن يمسّ المستودع العامّ حين: علامة التأكيد غير موضوعة · السرّ غائب · التوكن مرفوض (منتهٍ أو بلا `Contents: Read and write` على `takeflow-desktop` — يُفحص قبل أيّ شيء) · الرقم لا يطابق الحزمة · المحاكي أحمر · تعذّر الوصول إلى `takeflow-desktop` · الوسم موجود من قبل (الإصدار نُشر).
- التوكن لا يُطبع في السجلّ ولا يُحفظ خارج التشغيل. والمسار اليدويّ فوق يبقى احتياطاً حين يتعذّر الآليّ.

## مرّةً واحدة — المحطة
البرنامج ← الإعدادات ← حول ← «التطبيق المكتبيّ» ← **مصدر التحديث (متقدّم)** ← الصق `https://github.com/<حسابك>/takeflow-desktop` ← احفظ.
كلّ غلافٍ مفتوح يأخذ المصدر من المحطة، ويفحص كلّ ستّ ساعات (أو فوراً من «تحقّق من التحديثات»)، وينزّل ويثبّت عند الخروج.

## ما يجب معرفته
- **المستودع عامّ** لأنّ المحدِّث بلا توكن — ولا شيء سرّيّ فيه: الغلاف يفتح موقع المحطة فقط، والمفاتيح كلّها في الخادم.
- **الإصدار الأقدم لا يُثبَّت**: ارفع `version` دائماً.
- **«انشر للأجهزة» من الإعدادات** (رفعٌ إلى Supabase) لا تراه الأجهزة ما دام المصدر GitHub — اللوحة تقول ذلك. مسح رابط المصدر يعيدها إلى مجلّد المحطة.
- ماك ولينكس: الملفّ يبني ويندوز وحده (الفريق كلّه على ويندوز). يُضاف هدفٌ آخر عند الحاجة.
