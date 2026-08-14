# PM Store — دليل النشر على Koyeb المجاني وربط النطاق

> المشروع كامل وجاهز: تطبيق Node واحد (`server.js`) يخدم الواجهة + API + رفع الصور.
> البيانات محفوظة في **Netlify Blobs** (وليست على قرص الاستضافة) — لذلك عند النشر على
> أي استضافة جديدة مع ضبط متغيرات البيئة نفسها، ستجد كل البيانات الحالية موجودة.

---

## 1) إنشاء حساب Koyeb

1. اذهب إلى <https://app.koyeb.com> وسجّل (Google/GitHub/بريد إلكتروني).
2. **لا حاجة لبطاقة ائتمان** — الطبقة المجانية دائماً متاحة:
   - خدمة ويب واحدة: 512MB RAM / 0.1 vCPU / 2GB قرص.
   - **Scale-to-zero**: الخدمة تنام بعد الخمول وتستيقظ تلقائياً عند الزيارة.
   - **5 نطاقات مخصصة** + SSL تلقائي مجاني.
   - المنطقة: Frankfurt أو Washington DC.

## 2) رفع الكود

لديك مساران — اختر أحدهما:

### الطريقة أ (الأسهل) — من GitHub

1. أنشئ مستودعاً خاصاً أو عاماً على GitHub باسم مثل `pm-store`.
2. ارفع ملفات المشروع إليه (لا ترفع `.env` ولا `data.json` ولا `node_modules` — كلها في `.gitignore` و`.dockerignore`).
3. في لوحة Koyeb: **Create App → GitHub** → اختر المستودع.
4. في إعدادات الخدمة:
   - **Builder**: `Dockerfile` (سيكتشف `Dockerfile` الموجود تلقائياً).
   - **Exposed ports**: `8000:http`
   - **Routes**: `/` → `8000`
   - **Health checks**: `8000` → `http` → `/api/health`
   - **Region**: Frankfurt أو Washington.

### الطريقة ب — سطر الأوامر (بدون GitHub)

1. ثبّت Koyeb CLI: <https://github.com/koyeb/koyeb-cli>
2. نفّذ داخل مجلد المشروع:
   ```
   koyeb login
   koyeb app init pm-store
   koyeb deploy
   ```
3. أضف متغيرات البيئة من البند التالي في لوحة Koyeb.

## 3) متغيرات البيئة (الأهم)

في لوحة Koyeb → App → Settings → Environment variables، أضف:

| المتغير | القيمة | ملاحظة |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `8000` | يجب أن يطابق المنفذ المكشوف |
| `JWT_SECRET` | نص عشوائي طويل | مولّد في `render.yaml` أيضاً |
| `ADMIN_EMAIL` | `admin@pmstore.com` | |
| `NETLIFY_BLOBS_SITE_ID` | `7f9609ad-bb30-40bb-b546-f2da64eeeda3` | **إلزامي** لنقل البيانات |
| `NETLIFY_BLOBS_REGION` | `us-east-2` | **إلزامي** |
| `PM_BLOBS_TOKEN` | توكن حساب Netlify (سري) | **إلزامي** — أضفه كـ Secret |
| `ADMIN_PASSWORD` | كلمة مرور قوية من اختيارك (سري) | تُستخدم فقط إذا كان المخزن فارغاً — لا تضعها في أي ملف مشروع |

> المتغيرات الثلاثة `NETLIFY_BLOBS_*` + `PM_BLOBS_TOKEN` تجعل التطبيق يقرأ ويكتب
> نفس مخزن البيانات الحالي على Netlify — فتنتقل المنتجات والطلبات والموظفون تلقائياً.

## 4) التحقق

بعد نجاح النشر ستجد التطبيق على رابط مثل `https://pm-store-kurt.koyeb.app`:

- افتح `/api/health` → يجب أن يعيد `{"status":"ok"}`
- افتح `/` → واجهة المتجر
- افتح `/admin` → سجّل بالبريد الذي ضبطته في `ADMIN_EMAIL` وكلمة المرور التي ضبطتها في `ADMIN_PASSWORD`
- تحقق من `/api/products` → يجب أن تظهر المنتجات الثلاثة نفسها من Netlify

## 5) ربط النطاق `pmstore.ye` (عندما تمتلكه)

1. في لوحة Koyeb: **App → Settings → Domains → Add Domain**.
   أضف `www.pmstore.ye` (وبعدها يمكن إضافة `pmstore.ye`).
2. سيعرض Koyeb سجلات DNS المطلوبة — القيمة النهائية تظهر في صفحة Domains بعد إضافة النطاق (شكلها `<ORG-UUID>.cname.koyeb.app`).

### السجلات الجاهزة للنسخ

**لـ `www` (الأساسي — موصى به):**

| الاسم (Name) | النوع (Type) | القيمة (Value) |
|---|---|---|
| `www` | `CNAME` | `<ORG-UUID>.cname.koyeb.app` |

**للجذر `pmstore.ye`** — Koyeb لا يدعم CNAME على الجذر مباشرة؛ الحل المعتمد:
1. أضف سجل `A` للجذر: `@` → `A` → `78.141.38.218`
2. أضف **تحويل HTTP** من `pmstore.ye` إلى `https://www.pmstore.ye`.

> ⚠️ إذا لم يدعم مسجّلك التحويل (مثل TeleYemen)، انقل DNS إلى **Cloudflare مجاناً**:
> - `@` → `CNAME` → `www` (Cloudflare يفك CNAME على الجذر تلقائياً)
> - `www` → `CNAME` → `<ORG-UUID>.cname.koyeb.app`
> - قاعدة Redirect من `pmstore.ye` إلى `https://www.pmstore.ye`

3. بعد إضافة السجلات اضغط **Refresh** في صفحة Domains → ستصبح **Active** ويصدر Koyeb شهادة SSL تلقائياً.
4. انتظر الانتشار (دقائق إلى 24 ساعة).

## ملاحظات

- **النوم عند الخمول**: على الطبقة المجانية، أول زيارة بعد فترة خمول تستغرق ~10–30 ثانية (استيقاظ). بعدها كل شيء سريع.
- **البيانات**: لا تخزن على قرص Koyeb (القرص مؤقت) — التخزين الحقيقي في Netlify Blobs.
- **إيميلات الطلبات**: لازالت بحاجة لـ Gmail App Password لإرسال إيميلات العملاء.
