# GitHub Pages Deployment Checklist

## قبل تشغيل Actions

1. افتح المستودع في GitHub.
2. ادخل إلى Settings.
3. من القائمة الجانبية اختر Pages.
4. عند Build and deployment:
   Source = GitHub Actions
5. احفظ الإعداد إن ظهر زر Save.
6. ادخل إلى Settings > Actions > General.
7. تأكد أن Actions مفعّلة.
8. تأكد أن Workflow permissions تسمح بالقراءة والكتابة إن وجدت.
9. تأكد أن الفرع الأساسي هو main.
10. إذا المستودع Private، تأكد أن خطتك تدعم GitHub Pages للمستودعات الخاصة.
11. ارجع إلى Actions.
12. شغّل workflow يدويًا من Run workflow أو اعمل push جديد.

## سبب الخطأ Not Found في configure-pages

هذا الخطأ يعني غالبًا:
- GitHub Pages غير مفعّل للمستودع.
- أو Source ليس GitHub Actions.
- أو المستخدم لا يملك صلاحيات Pages.
- أو المستودع Private وخطة الحساب لا تدعم Pages.
- أو إعدادات Actions/Pages غير مفعلة.

## إذا ظهر موقع أبيض بعد النجاح

تحقق من:
- vite.config base
- dist/index.html
- assets paths
- أن URL يحتوي اسم المستودع إذا كان Project Page
- وجود dist/404.html للتطبيقات SPA

## إذا فشل build

تحقق من:
- npm run verify:sources
- npm run generate:data
- npm run build
- package-lock.json
- أخطاء TypeScript
- أخطاء Vite
