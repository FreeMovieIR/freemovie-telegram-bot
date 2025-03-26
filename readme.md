```markdown
# FreeMovieIRBot - ربات تلگرامی جستجوی فیلم و سریال

![GitHub repo size](https://img.shields.io/github/repo-size/m4tinbeigi-official/FreeMovieIRBot)
![GitHub last commit](https://img.shields.io/github/last-commit/m4tinbeigi-official/FreeMovieIRBot)

**FreeMovieIRBot** یک ربات تلگرامی است که به کاربران امکان جستجوی فیلم و سریال‌ها را با استفاده از API TMDb می‌دهد. این ربات به زبان پارسی طراحی شده و اطلاعات کاملی از جمله خلاصه داستان، ژانر، امتیاز و لینک‌های دانلود را ارائه می‌کند. برای استفاده از ربات، کاربران باید در کانال `@FreeMoviez_ir` عضو شوند.

## ویژگی‌ها
- **جستجوی اینلاین**: با تایپ `@FreeMovieIRBot` و نام فیلم یا سریال در هر چت تلگرامی، نتایج را مشاهده کنید.
- **اطلاعات کامل**: نمایش عنوان، سال انتشار، ژانر، امتیاز IMDb، خلاصه داستان و پوستر.
- **لینک‌های دانلود**: ارائه لینک‌های مستقیم برای دانلود فیلم‌ها و فصل‌های سریال‌ها.
- **بررسی عضویت**: کاربران باید در کانال `@FreeMoviez_ir` عضو باشند.
- **پشتیبانی از زبان پارسی**: تمام اطلاعات به زبان پارسی نمایش داده می‌شود.

## پیش‌نیازها
- **Cloudflare Workers**: این پروژه روی Cloudflare Workers اجرا می‌شود.
- **Telegram Bot Token**: توکن ربات تلگرامی که از [BotFather](https://t.me/BotFather) دریافت می‌کنید.
- **TMDb API Key**: کلید API از [The Movie Database (TMDb)](https://www.themoviedb.org/).

## نصب و راه‌اندازی
1. **مخزن را کلون کنید:**
   ```bash
   git clone https://github.com/FreeMovieIR/freemovie-telegram-bot.git
   cd FreeMovieIRBot
   ```

2. **تنظیم متغیرهای محیطی:**
   - در تنظیمات Cloudflare Workers، متغیر `BOT_TOKEN` را با توکن ربات تلگرامی خود تنظیم کنید.

3. **دیپلوی در Cloudflare:**
   - کد را در Cloudflare Workers آپلود کنید.
   - متغیر محیطی `BOT_TOKEN` را در بخش `Environment Variables` اضافه کنید.
   - پروژه را دیپلوی کنید.

4. **تنظیم وب‌هوک تلگرام:**
   - وب‌هوک ربات را با URL کارگر Cloudflare تنظیم کنید:
     ```
     https://api.telegram.org/bot<Your_Bot_Token>/setWebhook?url=<Your_Cloudflare_Worker_URL>
     ```

## استفاده
- ربات را در تلگرام با دستور `/start` راه‌اندازی کنید.
- برای جستجو، در هر چت تلگرامی تایپ کنید: `@FreeMovieIRBot <نام فیلم یا سریال>` (مثال: `@FreeMovieIRBot The Matrix`).
- از دکمه‌های موجود برای مشاهده جزئیات بیشتر یا دانلود استفاده کنید.

## ساختار پروژه
- **`worker.js`**: فایل اصلی که منطق ربات را پیاده‌سازی می‌کند.
- **وابستگی‌ها**: بدون نیاز به نصب پکیج اضافی (کاملاً serverless).

## نمونه خروجی
وقتی کاربر `@FreeMovieIRBot The Matrix` را تایپ کند:
- عنوان: 🎥 ماتریکس (1999)
- خلاصه: داستان یک هکر که دنیای واقعی و مجازی را کشف می‌کند...
- ژانر: اکشن، علمی-تخیلی
- امتیاز: 8.7/10
- دکمه‌ها: "جزئیات بیشتر" و "تماشا"

## استقرار سریع
با کلیک روی دکمه زیر، پروژه را مستقیماً در Cloudflare Workers دیپلوی کنید:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/m4tinbeigi-official/FreeMovieIRBot)

**نکته**: پس از دیپلوی، متغیر `BOT_TOKEN` را در تنظیمات Cloudflare Workers اضافه کنید.

## مشارکت
اگر مایل به مشارکت هستید:
1. مخزن را فورک کنید.
2. تغییرات خود را اعمال کنید.
3. یک Pull Request ارسال کنید.

## لایسنس
این پروژه تحت مجوز [MIT License](LICENSE) منتشر شده است.

## تماس
- **توسعه‌دهنده**: [مارتین بیگی](https://github.com/m4tinbeigi-official)
- **ربات تلگرام**: [@FreeMovieIRBot](https://t.me/FreeMovieIRBot)
- **کانال تلگرام**: [@FreeMoviez_ir](https://t.me/FreeMoviez_ir)
```