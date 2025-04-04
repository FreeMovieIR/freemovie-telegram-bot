const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`; // توکن از متغیر محیطی
const BOT_USERNAME = 'FreeMovieIRBot'; // نام کاربری ربات
const CHANNEL_USERNAME = '@FreeMoviez_ir'; // نام کاربری کانال

// کلید API TMDb
const TMDb_API_KEY = '1dc4cbf81f0accf4fa108820d551dafc';
const language = 'fa'; // زبان پارسی
const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
const baseThumbUrl = 'https://image.tmdb.org/t/p/w200'; // برای تصاویر کوچک‌تر
const defaultPoster = 'https://freemovieir.github.io/images/default-freemovie-300.png';

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
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (error) {
    console.error('خطا در درخواست getChatMember:', error);
    return false;
  }
}

// تابع برای بررسی معتبر بودن URL تصویر
async function isValidImageUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch (error) {
    console.error('خطا در بررسی URL تصویر:', error);
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
    console.log('Update received:', JSON.stringify(update, null, 2));

    if (!update.message && !update.callback_query && !update.inline_query && !update.chosen_inline_result && !update.my_chat_member) {
      return new Response('Invalid update', { status: 400 });
    }

    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id || update.chosen_inline_result?.from?.id || null;
    const userId = update.message?.from?.id || update.callback_query?.from?.id || update.inline_query?.from?.id || update.chosen_inline_result?.from?.id || update.my_chat_member?.from?.id || null;
    const text = update.message?.text || '';
    const callbackData = update.callback_query?.data || null;
    const inlineQuery = update.inline_query;
    const chosenInlineResult = update.chosen_inline_result;

    // بررسی عضویت کاربر در کانال
    if (chatId && userId) {
      const isMember = await checkChannelMembership(chatId, userId);
      if (!isMember) {
        const joinMessage = `برای استفاده از ربات، لطفاً ابتدا در کانال ${CHANNEL_USERNAME} عضو شوید!`;
        const joinButton = [[{ text: 'عضویت در کانال', url: 'https://t.me/FreeMoviez_ir' }]];
        if (chatId) {
          await sendMessageWithButtons(TELEGRAM_API, chatId, joinMessage, joinButton);
        } else if (inlineQuery) {
          await answerInlineQuery(TELEGRAM_API, inlineQuery.id, [{
            type: 'photo',
            id: 'join_channel',
            photo_url: defaultPoster,
            thumb_url: defaultPoster,
            caption: joinMessage,
            reply_markup: { inline_keyboard: joinButton },
          }]);
        }
        return new Response('OK', { status: 200 });
      }
    }

    // مدیریت دستور /start
    if (text === '/start') {
      await sendMessage(TELEGRAM_API, chatId, `سلام به فیری مووی خوش اومدی!\nبرای جستجو، توی هر چتی بنویس @${BOT_USERNAME} و اسم فیلم یا سریال رو وارد کن (مثال: @${BOT_USERNAME} The Matrix)`);
      return new Response('OK', { status: 200 });
    }

    // مدیریت جستجوی اینلاین
    if (inlineQuery) {
      const query = inlineQuery.query.trim();
      const inlineQueryId = inlineQuery.id;

      if (!query) {
        console.log('Query is empty, returning empty results');
        await answerInlineQuery(TELEGRAM_API, inlineQueryId, []);
        return new Response('OK', { status: 200 });
      }

      console.log('Fetching movies and series for query:', query);
      const movieSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDb_API_KEY}&language=${language}&query=${encodeURIComponent(query)}`;
      const tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDb_API_KEY}&language=${language}&query=${encodeURIComponent(query)}`;

      let movieRes, tvRes;
      try {
        const movieFetch = fetch(movieSearchUrl).then(res => res.ok ? res.json() : Promise.reject(`خطای سرور (فیلم‌ها): ${res.status}`));
        const tvFetch = fetch(tvSearchUrl).then(res => res.ok ? res.json() : Promise.reject(`خطای سرور (سریال‌ها): ${res.status}`));
        [movieRes, tvRes] = await Promise.all([movieFetch, tvFetch]);
        console.log('Movies fetched:', movieRes.results?.length || 0, 'Series fetched:', tvRes.results?.length || 0);
      } catch (error) {
        console.error('Error in inline search:', error);
        await answerInlineQuery(TELEGRAM_API, inlineQueryId, []);
        return new Response('OK', { status: 200 });
      }

      const movies = movieRes.results ? movieRes.results.slice(0, 5) : [];
      const tvSeries = tvRes.results ? tvRes.results.slice(0, 5) : [];
      const inlineResults = [];

      console.log('Processing movies:', movies.length);
      for (const movie of movies) {
        const titleFa = movie.title || 'نامشخص';
        const titleEn = movie.original_title || 'Unknown';
        const year = movie.release_date ? movie.release_date.substr(0, 4) : 'نامشخص';
        const thumb = movie.poster_path ? `${baseThumbUrl}${movie.poster_path}` : defaultPoster;
        const overview = movie.overview || 'بدون خلاصه';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'نامشخص';
        const genres = movie.genre_ids ? await fetchGenres(movie.genre_ids, 'movie') : 'نامشخص';

        const title = `🎥 ${titleFa} (${year})`;
        const description = `${titleEn}\n⭐ ${rating}/10 | 🎭 ${genres}\n📖 ${overview.slice(0, 100)}${overview.length > 100 ? '...' : ''}`;

        console.log(`Movie description for ${titleFa}:`, description);

        inlineResults.push({
          type: 'article',
          id: `movie_${movie.id}`,
          title: title,
          description: description,
          thumb_url: thumb,
          input_message_content: {
            message_text: `🎥 ${titleFa} (${year})\n📝 ${titleEn}\n⭐ ${rating}/10\n🎭 ${genres}\n📖 ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}`,
            parse_mode: 'Markdown',
          },
          reply_markup: {
            inline_keyboard: [
              [{ text: 'ℹ️ جزئیات بیشتر', callback_data: `details_${movie.id}` }],
              [{ text: '📽️ تماشا', url: `https://freemovieir.github.io/movie/index.html?id=${movie.id}` }],
            ],
          },
        });
      }

      console.log('Processing series:', tvSeries.length);
      for (const tv of tvSeries) {
        const titleFa = tv.name || 'نامشخص';
        const titleEn = tv.original_name || 'Unknown';
        const year = tv.first_air_date ? tv.first_air_date.substr(0, 4) : 'نامشخص';
        const thumb = tv.poster_path ? `${baseThumbUrl}${tv.poster_path}` : defaultPoster;
        const overview = tv.overview || 'بدون خلاصه';
        const rating = tv.vote_average ? tv.vote_average.toFixed(1) : 'نامشخص';
        const genres = tv.genre_ids ? await fetchGenres(tv.genre_ids, 'tv') : 'نامشخص';

        const title = `📺 ${titleFa} (${year})`;
        const description = `${titleEn}\n⭐ ${rating}/10 | 🎭 ${genres}\n📖 ${overview.slice(0, 100)}${overview.length > 100 ? '...' : ''}`;

        console.log(`Series description for ${titleFa}:`, description);

        inlineResults.push({
          type: 'article',
          id: `series_${tv.id}`,
          title: title,
          description: description,
          thumb_url: thumb,
          input_message_content: {
            message_text: `📺 ${titleFa} (${year})\n📝 ${titleEn}\n⭐ ${rating}/10\n🎭 ${genres}\n📖 ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}`,
            parse_mode: 'Markdown',
          },
          reply_markup: {
            inline_keyboard: [
              [{ text: 'ℹ️ جزئیات بیشتر', callback_data: `seriesdetails_${tv.id}` }],
              [{ text: '📽️ تماشا', url: `https://freemovieir.github.io/series/index.html?id=${tv.id}` }],
            ],
          },
        });
      }

      console.log('Sending inline results:', JSON.stringify(inlineResults, null, 2));
      const response = await answerInlineQuery(TELEGRAM_API, inlineQueryId, inlineResults);
      console.log('Inline query response:', await response.json());
      return new Response('OK', { status: 200 });
    }

    // مدیریت انتخاب فیلم یا سریال از سرچ اینلاین
    if (chosenInlineResult) {
      const resultId = chosenInlineResult.result_id;
      const isMovie = resultId.startsWith('movie_');
      const itemId = isMovie ? resultId.replace('movie_', '') : resultId.replace('series_', '');
      const type = isMovie ? 'فیلم' : 'سریال';

      console.log(`Fetching details for ${type} with ID: ${itemId}`);
      const details = isMovie
        ? await fetchMovieDetails(itemId, TMDb_API_KEY, language)
        : await fetchSeriesDetails(itemId, TMDb_API_KEY, language);

      if (!details) {
        console.log(`Failed to fetch details for ${type} with ID: ${itemId}`);
        await sendMessage(TELEGRAM_API, chatId, `❌ مشکلی پیش اومد! نمی‌تونم اطلاعات ${type} رو پیدا کنم.`);
        return new Response('OK', { status: 200 });
      }

      // ارسال پیام با پوستر و اطلاعات کامل
      if (isMovie) {
        let poster = details.poster_path ? `${baseImageUrl}${details.poster_path}` : defaultPoster;
        const titleFa = details.title || 'نامشخص';
        const titleEn = details.original_title || 'Unknown';
        const year = details.release_date ? details.release_date.split('-')[0] : 'نامشخص';
        const overview = details.overview || 'بدون خلاصه';
        const genres = details.genres ? details.genres.map(g => g.name).join('، ') : 'نامشخص';
        const rating = details.vote_average ? Number(details.vote_average).toFixed(1) : 'بدون امتیاز';
        const runtime = details.runtime ? `${details.runtime} دقیقه` : 'نامشخص';
        const imdbId = details.external_ids?.imdb_id || '';
        const imdbShort = imdbId ? imdbId.replace('tt', '') : '';

        const detailsMessage = `🎬 ${titleFa} (${year})\n` +
                              `📝 نام انگلیسی: ${titleEn}\n` +
                              `📖 خلاصه: ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}\n` +
                              `🎭 ژانر: ${genres}\n` +
                              `⭐ امتیاز: ${rating}/10\n` +
                              `⏳ مدت زمان: ${runtime}`;

        const buttons = [];
        if (imdbShort) {
          buttons.push([
            { text: '📥 لینک اصلی', url: `https://berlin.saymyname.website/Movies/${year}/${imdbShort}` },
            { text: '📥 لینک کمکی 1', url: `https://tokyo.saymyname.website/Movies/${year}/${imdbShort}` },
          ]);
          buttons.push([
            { text: '📥 لینک کمکی 2', url: `https://nairobi.saymyname.website/Movies/${year}/${imdbShort}` },
          ]);
        }
        buttons.push([
          { text: '🌐 مشاهده در سایت', url: `https://freemovieir.github.io/movie/index.html?id=${itemId}` },
        ]);

        // بررسی معتبر بودن URL پوستر
        const isPosterValid = await isValidImageUrl(poster);
        if (!isPosterValid) {
          console.warn(`Poster URL invalid for movie ${itemId}: ${poster}. Falling back to default poster.`);
          poster = defaultPoster;
        }

        console.log(`Sending photo with caption for movie ${itemId}:`, detailsMessage);
        await sendPhotoWithCaption(TELEGRAM_API, chatId, poster, detailsMessage, buttons);
      } else {
        let poster = details.poster_path ? `${baseImageUrl}${details.poster_path}` : defaultPoster;
        const titleFa = details.name || 'نامشخص';
        const titleEn = details.original_name || 'Unknown';
        const year = details.first_air_date ? details.first_air_date.substr(0, 4) : 'نامشخص';
        const overview = details.overview || 'بدون خلاصه';
        const genres = details.genres ? details.genres.map(g => g.name).join('، ') : 'نامشخص';
        const rating = details.vote_average ? Number(details.vote_average).toFixed(1) : 'بدون امتیاز';
        const numberOfSeasons = details.number_of_seasons || 0;
        const imdbId = details.external_ids?.imdb_id || '';

        const detailsMessage = `📺 ${titleFa} (${year})\n` +
                              `📝 نام انگلیسی: ${titleEn}\n` +
                              `📖 خلاصه: ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}\n` +
                              `🎭 ژانر: ${genres}\n` +
                              `⭐ امتیاز: ${rating}/10\n` +
                              `📅 فصل‌ها: ${numberOfSeasons}`;

        const buttons = [];
        if (imdbId && numberOfSeasons > 0) {
          for (let season = 1; season <= Math.min(numberOfSeasons, 2); season++) {
            buttons.push([
              { text: `📥 فصل ${season} - کیفیت 1`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=1` },
              { text: `📥 کیفیت 2`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=2` },
            ]);
            buttons.push([
              { text: `📥 کیفیت 3`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=3` },
              { text: `📥 کیفیت 4`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=4` },
            ]);
          }
        }
        buttons.push([
          { text: '🌐 مشاهده در سایت', url: `https://freemovieir.github.io/series/index.html?id=${itemId}` },
        ]);

        // بررسی معتبر بودن URL پوستر
        const isPosterValid = await isValidImageUrl(poster);
        if (!isPosterValid) {
          console.warn(`Poster URL invalid for series ${itemId}: ${poster}. Falling back to default poster.`);
          poster = defaultPoster;
        }

        console.log(`Sending photo with caption for series ${itemId}:`, detailsMessage);
        await sendPhotoWithCaption(TELEGRAM_API, chatId, poster, detailsMessage, buttons);
      }
      return new Response('OK', { status: 200 });
    }

    // مدیریت جزئیات بیشتر
    if (callbackData && (callbackData.startsWith('details_') || callbackData.startsWith('seriesdetails_'))) {
      const isMovie = callbackData.startsWith('details_');
      const itemId = isMovie ? callbackData.replace('details_', '') : callbackData.replace('seriesdetails_', '');
      const type = isMovie ? 'فیلم' : 'سریال';

      const effectiveChatId = chatId || userId;

      await sendMessage(TELEGRAM_API, effectiveChatId, `⏳ یه لحظه صبر کن، دارم اطلاعات ${type} ${itemId} رو برات میارم...`);

      const details = isMovie
        ? await fetchMovieDetails(itemId, TMDb_API_KEY, language)
        : await fetchSeriesDetails(itemId, TMDb_API_KEY, language);

      if (!details) {
        await sendMessage(TELEGRAM_API, effectiveChatId, `❌ مشکلی پیش اومد! نمی‌تونم اطلاعات ${type} رو پیدا کنم.`);
      } else if (isMovie) {
        let poster = details.poster_path ? `${baseImageUrl}${details.poster_path}` : defaultPoster;
        const titleFa = details.title || 'نامشخص';
        const titleEn = details.original_title || 'Unknown';
        const year = details.release_date ? details.release_date.split('-')[0] : 'نامشخص';
        const overview = details.overview || 'بدون خلاصه';
        const genres = details.genres ? details.genres.map(g => g.name).join('، ') : 'نامشخص';
        const rating = details.vote_average ? Number(details.vote_average).toFixed(1) : 'بدون امتیاز';
        const runtime = details.runtime ? `${details.runtime} دقیقه` : 'نامشخص';
        const imdbId = details.external_ids?.imdb_id || '';
        const imdbShort = imdbId ? imdbId.replace('tt', '') : '';

        const detailsMessage = `🎬 ${titleFa} (${year})\n` +
                              `📝 نام انگلیسی: ${titleEn}\n` +
                              `📖 خلاصه: ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}\n` +
                              `🎭 ژانر: ${genres}\n` +
                              `⭐ امتیاز: ${rating}/10\n` +
                              `⏳ مدت زمان: ${runtime}`;

        const buttons = [];
        if (imdbShort) {
          buttons.push([
            { text: '📥 لینک اصلی', url: `https://berlin.saymyname.website/Movies/${year}/${imdbShort}` },
            { text: '📥 لینک کمکی 1', url: `https://tokyo.saymyname.website/Movies/${year}/${imdbShort}` },
          ]);
          buttons.push([
            { text: '📥 لینک کمکی 2', url: `https://nairobi.saymyname.website/Movies/${year}/${imdbShort}` },
          ]);
        }
        buttons.push([
          { text: '🌐 مشاهده در سایت', url: `https://freemovieir.github.io/movie/index.html?id=${itemId}` },
        ]);

        // بررسی معتبر بودن URL پوستر
        const isPosterValid = await isValidImageUrl(poster);
        if (!isPosterValid) {
          console.warn(`Poster URL invalid for movie ${itemId}: ${poster}. Falling back to default poster.`);
          poster = defaultPoster;
        }

        await sendPhotoWithCaption(TELEGRAM_API, effectiveChatId, poster, detailsMessage, buttons);
      } else {
        let poster = details.poster_path ? `${baseImageUrl}${details.poster_path}` : defaultPoster;
        const titleFa = details.name || 'نامشخص';
        const titleEn = details.original_name || 'Unknown';
        const year = details.first_air_date ? details.first_air_date.substr(0, 4) : 'نامشخص';
        const overview = details.overview || 'بدون خلاصه';
        const genres = details.genres ? details.genres.map(g => g.name).join('، ') : 'نامشخص';
        const rating = details.vote_average ? Number(details.vote_average).toFixed(1) : 'بدون امتیاز';
        const numberOfSeasons = details.number_of_seasons || 0;
        const imdbId = details.external_ids?.imdb_id || '';

        const detailsMessage = `📺 ${titleFa} (${year})\n` +
                              `📝 نام انگلیسی: ${titleEn}\n` +
                              `📖 خلاصه: ${overview.slice(0, 200)}${overview.length > 200 ? '...' : ''}\n` +
                              `🎭 ژانر: ${genres}\n` +
                              `⭐ امتیاز: ${rating}/10\n` +
                              `📅 فصل‌ها: ${numberOfSeasons}`;

        const buttons = [];
        if (imdbId && numberOfSeasons > 0) {
          for (let season = 1; season <= Math.min(numberOfSeasons, 2); season++) {
            buttons.push([
              { text: `📥 فصل ${season} - کیفیت 1`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=1` },
              { text: `📥 کیفیت 2`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=2` },
            ]);
            buttons.push([
              { text: `📥 کیفیت 3`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=3` },
              { text: `📥 کیفیت 4`, url: `https://subtitle.saymyname.website/DL/filmgir/?i=${imdbId}&f=${season}&q=4` },
            ]);
          }
        }
        buttons.push([
          { text: '🌐 مشاهده در سایت', url: `https://freemovieir.github.io/series/index.html?id=${itemId}` },
        ]);

        // بررسی معتبر بودن URL پوستر
        const isPosterValid = await isValidImageUrl(poster);
        if (!isPosterValid) {
          console.warn(`Poster URL invalid for series ${itemId}: ${poster}. Falling back to default poster.`);
          poster = defaultPoster;
        }

        await sendPhotoWithCaption(TELEGRAM_API, effectiveChatId, poster, detailsMessage, buttons);
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

// تابع برای دریافت نام ژانرها
async function fetchGenres(genreIds, type) {
  try {
    const genreUrl = `https://api.themoviedb.org/3/genre/${type}/list?api_key=${TMDb_API_KEY}&language=${language}`;
    const response = await fetch(genreUrl);
    if (!response.ok) {
      console.error(`Failed to fetch genres: ${response.status}`);
      return 'نامشخص';
    }
    const data = await response.json();
    const genres = data.genres.filter(g => genreIds.includes(g.id)).map(g => g.name).join('، ');
    return genres || 'نامشخص';
  } catch (error) {
    console.error('Error fetching genres:', error);
    return 'نامشخص';
  }
}

// توابع کمکی
async function fetchMovieDetails(movieId, apiKey, language) {
  const movieUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=${language}&append_to_response=external_ids`;
  const response = await fetch(movieUrl);
  if (!response.ok) {
    console.error(`Failed to fetch movie details: ${response.status}`);
    return null;
  }
  return await response.json();
}

async function fetchSeriesDetails(seriesId, apiKey, language) {
  const seriesUrl = `https://api.themoviedb.org/3/tv/${seriesId}?api_key=${apiKey}&language=${language}&append_to_response=external_ids`;
  const response = await fetch(seriesUrl);
  if (!response.ok) {
    console.error(`Failed to fetch series details: ${response.status}`);
    return null;
  }
  return await response.json();
}

async function sendMessage(telegramApi, chatId, text) {
  const url = `${telegramApi}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) {
    console.error(`Failed to send message: ${response.status}, ${await response.text()}`);
  }
}

async function sendMessageWithButtons(telegramApi, chatId, text, buttons) {
  const url = `${telegramApi}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: buttons },
    }),
  });
  if (!response.ok) {
    console.error(`Failed to send message with buttons: ${response.status}, ${await response.text()}`);
    await sendMessage(telegramApi, chatId, text);
  }
}

async function sendPhotoWithCaption(telegramApi, chatId, photoUrl, caption, buttons) {
  const url = `${telegramApi}/sendPhoto`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
    }),
  });
  if (!response.ok) {
    console.error(`Failed to send photo: ${response.status}, ${await response.text()}`);
    const errorMessage = `${caption}\n⚠️ مشکلی در بارگذاری پوستر وجود داشت. لطفاً بعداً دوباره تلاش کنید.`;
    await sendMessage(telegramApi, chatId, errorMessage);
  }
}

async function answerInlineQuery(telegramApi, inlineQueryId, results) {
  const url = `${telegramApi}/answerInlineQuery`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inline_query_id: inlineQueryId,
      results: results,
      cache_time: 300,
    }),
  });
  if (!response.ok) {
    console.error('Failed to answer inline query:', response.status, await response.text());
  }
  return response;
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});