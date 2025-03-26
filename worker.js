const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`; // توکن از متغیر محیطی
const BOT_USERNAME = 'FreeMovieIRBot'; // نام کاربری ربات
const CHANNEL_USERNAME = '@FreeMoviez_ir'; // نام کاربری کانال

// کلید API TMDb
const TMDb_API_KEY = '1dc4cbf81f0accf4fa108820d551dafc';
const language = 'fa'; // زبان پارسی
const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
const defaultPoster = 'https://m4tinbeigi-official.github.io/freemovie/images/default-freemovie-300.png';

// تابع بررسی عضویت کاربر در کانال
async function checkChannelMembership(chatId, userId) {
  try {
    const response = await fetch(`${TELEGRAM_API}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`);
    const data = await response.json();

    if (!data.ok) {
      console.error('خطا در بررسی عضویت:', data.description);
      return false;
    }

    const status = data.result.status;
    // کاربر باید عضو باشه (member) یا ادمین (administrator/creator)
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (error) {
    console.error('خطا در درخواست getChatMember:', error);
    return false;
  }
}

// تابع اصلی مدیریت درخواست‌ها
async function handleRequest(request) {
  try {
    if (request.method !== 'POST') {
      return new Response('Hello from Cloudflare!', { status: 200 });
    }

    const update = await request.json();
    if (!update.message && !update.callback_query && !update.inline_query) {
      return new Response('Invalid update', { status: 400 });
    }

    const chatId = update.message ? update.message.chat.id : update.callback_query ? update.callback_query.message.chat.id : null;
    const userId = update.message ? update.message.from.id : update.callback_query ? update.callback_query.from.id : update.inline_query ? update.inline_query.from.id : null;
    const text = update.message ? update.message.text || '' : '';
    const callbackData = update.callback_query ? update.callback_query.data : null;
    const inlineQuery = update.inline_query;

    // بررسی عضویت کاربر در کانال
    const isMember = await checkChannelMembership(chatId, userId);
    if (!isMember) {
      const joinMessage = `برای استفاده از ربات، لطفاً ابتدا در کانال ${CHANNEL_USERNAME} عضو شوید!\nلینک عضویت: https://t.me/FreeMoviez_ir`;
      if (chatId) {
        await sendMessage(TELEGRAM_API, chatId, joinMessage);
      } else if (inlineQuery) {
        await answerInlineQuery(TELEGRAM_API, inlineQuery.id, [{
          type: 'article',
          id: 'join_channel',
          title: 'عضویت در کانال',
          input_message_content: { message_text: joinMessage },
          description: 'برای استفاده از ربات باید عضو کانال باشید.',
        }]);
      }
      return new Response('OK', { status: 200 });
    }

    // مدیریت دستور /start
    if (text === '/start') {
      await sendMessage(TELEGRAM_API, chatId, `🎉 سلام به فیری مووی خوش اومدی! 🍿\nبرای جستجو، توی هر چتی بنویس @${BOT_USERNAME} و اسم فیلم یا سریال رو وارد کن (مثال: @${BOT_USERNAME} The Matrix)`);
      return new Response('OK', { status: 200 });
    }

    // مدیریت جستجوی اینلاین
    if (inlineQuery) {
      const query = inlineQuery.query.trim();
      const inlineQueryId = inlineQuery.id;

      if (!query) {
        await answerInlineQuery(TELEGRAM_API, inlineQueryId, []);
        return new Response('OK', { status: 200 });
      }

      const movieSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDb_API_KEY}&language=${language}&query=${encodeURIComponent(query)}`;
      const tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDb_API_KEY}&language=${language}&query=${encodeURIComponent(query)}`;

      const [movieRes, tvRes] = await Promise.all([
        fetch(movieSearchUrl).then(res => res.ok ? res.json() : Promise.reject(`خطای سرور (فیلم‌ها): ${res.status}`)),
        fetch(tvSearchUrl).then(res => res.ok ? res.json() : Promise.reject(`خطای سرور (سریال‌ها): ${res.status}`)),
      ]).catch(error => {
        console.error('Error in inline search:', error);
        return [[], []];
      });

      const movies = movieRes.results ? movieRes.results.slice(0, 5) : [];
      const tvSeries = tvRes.results ? tvRes.results.slice(0, 5) : [];
      const inlineResults = [];

      for (const movie of movies) {
        const title = movie.title || 'نامشخص';
        const year = movie.release_date ? movie.release_date.substr(0, 4) : 'نامشخص';
        const poster = movie.poster_path ? `${baseImageUrl}${movie.poster_path}` : defaultPoster;
        const overview = movie.overview ? movie.overview.slice(0, 100) + '...' : 'بدون توضیحات';

        inlineResults.push({
          type: 'photo',
          id: `movie_${movie.id}`,
          photo_url: poster,
          thumb_url: poster,
          caption: `🎥 ${title} (${year})\n${overview}\n🆔 ${movie.id}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'ℹ️ جزئیات بیشتر', callback_data: `details_${movie.id}` }],
              [{ text: '📽️ تماشا', url: `https://m4tinbeigi-official.github.io/freemovie/movie/index.html?id=${movie.id}` }],
            ],
          },
        });
      }

      for (const tv of tvSeries) {
        const title = tv.name || 'نامشخص';
        const year = tv.first_air_date ? tv.first_air_date.substr(0, 4) : 'نامشخص';
        const poster = tv.poster_path ? `${baseImageUrl}${tv.poster_path}` : defaultPoster;
        const overview = tv.overview ? tv.overview.slice(0, 100) + '...' : 'بدون توضیحات';

        inlineResults.push({
          type: 'photo',
          id: `series_${tv.id}`,
          photo_url: poster,
          thumb_url: poster,
          caption: `📺 ${title} (${year})\n${overview}\n🆔 ${tv.id}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'ℹ️ جزئیات بیشتر', callback_data: `seriesdetails_${tv.id}` }],
              [{ text: '📽️ تماشا', url: `https://m4tinbeigi-official.github.io/freemovie/series/index.html?id=${tv.id}` }],
            ],
          },
        });
      }

      await answerInlineQuery(TELEGRAM_API, inlineQueryId, inlineResults);
      return new Response('OK', { status: 200 });
    }

    // مدیریت جزئیات فیلم یا سریال
    if (callbackData && (callbackData.startsWith('details_') || callbackData.startsWith('seriesdetails_'))) {
      const isMovie = callbackData.startsWith('details_');
      const itemId = isMovie ? callbackData.replace('details_', '') : callbackData.replace('seriesdetails_', '');
      const type = isMovie ? 'فیلم' : 'سریال';

      await sendMessage(TELEGRAM_API, chatId, `⏳ یه لحظه صبر کن، دارم اطلاعات ${type} ${itemId} رو برات میارم...`);

      const details = isMovie
        ? await fetchMovieDetails(itemId, TMDb_API_KEY, language)
        : await fetchSeriesDetails(itemId, TMDb_API_KEY, language);

      if (!details) {
        await sendMessage(TELEGRAM_API, chatId, `❌ مشکلی پیش اومد! نمی‌تونم اطلاعات ${type} رو پیدا کنم.`);
        return new Response('OK', { status: 200 });
      }

      if (isMovie) {
        const poster = details.poster_path ? `${baseImageUrl}${details.poster_path}` : defaultPoster;
        const year = details.release_date ? details.release_date.split('-')[0] : 'نامشخص';
        const title = details.title || 'نامشخص';
        const overview = details.overview || 'بدون خلاصه';
        const genres = details.genres ? details.genres.map(g => g.name).join('، ') : 'نامشخص';
        const rating = details.vote_average ? Number(details.vote_average).toFixed(1) : 'بدون امتیاز';

        const detailsMessage = `🎬 ${title} (${year})\n\n` +
                              `📖 خلاصه: ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}\n` +
                              `🎭 ژانر: ${genres}\n` +
                              `⭐ امتیاز: ${rating}/10`;

        await sendPhotoWithCaption(TELEGRAM_API, chatId, poster, detailsMessage, [
          [{ text: '📽️ تماشا', url: `https://m4tinbeigi-official.github.io/freemovie/movie/index.html?id=${itemId}` }],
        ]);
      } else {
        const poster = details.poster_path ? `${baseImageUrl}${details.poster_path}` : defaultPoster;
        const title = details.name || 'نامشخص';
        const year = details.first_air_date ? details.first_air_date.substr(0, 4) : 'نامشخص';
        const overview = details.overview || 'بدون خلاصه';
        const genres = details.genres ? details.genres.map(g => g.name).join('، ') : 'نامشخص';
        const rating = details.vote_average ? Number(details.vote_average).toFixed(1) : 'بدون امتیاز';

        const detailsMessage = `📺 ${title} (${year})\n\n` +
                              `📖 خلاصه: ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}\n` +
                              `🎭 ژانر: ${genres}\n` +
                              `⭐ امتیاز: ${rating}/10`;

        await sendPhotoWithCaption(TELEGRAM_API, chatId, poster, detailsMessage, [
          [{ text: '📽️ تماشا', url: `https://m4tinbeigi-official.github.io/freemovie/series/index.html?id=${itemId}` }],
        ]);
      }

      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id }),
      });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error in handleRequest:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// توابع کمکی
async function fetchMovieDetails(movieId, apiKey, language) {
  const movieUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=${language}`;
  const response = await fetch(movieUrl);
  if (!response.ok) throw new Error(`خطای سرور (فیلم): ${response.status}`);
  return await response.json();
}

async function fetchSeriesDetails(seriesId, apiKey, language) {
  const seriesUrl = `https://api.themoviedb.org/3/tv/${seriesId}?api_key=${apiKey}&language=${language}`;
  const response = await fetch(seriesUrl);
  if (!response.ok) throw new Error(`خطای سرور (سریال): ${response.status}`);
  return await response.json();
}

async function sendMessage(telegramApi, chatId, text) {
  const url = `${telegramApi}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);
}

async function sendPhotoWithCaption(telegramApi, chatId, photoUrl, caption, buttons) {
  const url = `${telegramApi}/sendPhoto`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
    }),
  });
  if (!response.ok) {
    await sendMessage(telegramApi, chatId, caption);
  }
}

async function answerInlineQuery(telegramApi, inlineQueryId, results) {
  const url = `${telegramApi}/answerInlineQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inline_query_id: inlineQueryId,
      results,
      cache_time: 300,
    }),
  });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});