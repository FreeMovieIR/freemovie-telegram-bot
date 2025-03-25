addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`; // توکن از متغیر محیطی میاد
  const WEBHOOK_URL = 'https://telegram-bot.yourname.workers.dev'; // این رو با URL خودت عوض کن

  if (request.method === 'POST') {
    const update = await request.json();
    const chatId = update.message.chat.id;
    const text = update.message.text;

    // پاسخ ساده به پیام کاربر
    if (text === '/start') {
      await sendMessage(chatId, 'سلام! رباتت با موفقیت کار کرد!');
    } else {
      await sendMessage(chatId, 'چیزی گفتی؟ من فقط /start رو می‌فهمم!');
    }

    return new Response('OK', { status: 200 });
  }

  return new Response('Hello from Cloudflare!', { status: 200 });
}

async function sendMessage(chatId, text) {
  const url = `${TELEGRAM_API}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}