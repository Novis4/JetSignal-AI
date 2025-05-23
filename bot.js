const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

let accessList = [];
const accessFile = './data/access.json';

let userStatus = {};
const statusFile = './data/status.json';

function getLang(ctx) {
    loadStatus();
    let lang = userStatus[ctx.from.id + '_lang'] || 'ru';
    try {
        const langFile = fs.readFileSync(path.join(__dirname, 'data', lang + '.json'), 'utf8');
        return JSON.parse(langFile);
    } catch (e) {
        const langFile = fs.readFileSync(path.join(__dirname, 'data', 'ru.json'), 'utf8');
        return JSON.parse(langFile);
    }
}

const clickHistory = {};
const CLICK_WINDOW_MS = 3000;
const MAX_CLICKS = 3;

function advancedThrottleMiddleware(ctx, next) {
    const userId = ctx.from.id;
    const now = Date.now();

    if (!clickHistory[userId]) {
        clickHistory[userId] = [];
    }
    clickHistory[userId] = clickHistory[userId].filter(ts => now - ts < CLICK_WINDOW_MS);
    clickHistory[userId].push(now);

    if (clickHistory[userId].length > MAX_CLICKS) {
        const t = getLang(ctx);
        return ctx.answerCbQuery('⏳ Too many clicks! Please wait 3 seconds.', { show_alert: true });
    } else {
        return next();
    }
}

function loadAccess() {
    if (fs.existsSync(accessFile)) {
        accessList = JSON.parse(fs.readFileSync(accessFile));
    } else {
        accessList = [];
    }
}
function saveAccess() {
    fs.writeFileSync(accessFile, JSON.stringify(accessList));
}
function loadStatus() {
    if (fs.existsSync(statusFile)) {
        userStatus = JSON.parse(fs.readFileSync(statusFile));
    } else {
        userStatus = {};
    }
}
function saveStatus() {
    fs.writeFileSync(statusFile, JSON.stringify(userStatus));
}

function getMainMenu(ctx) {
    loadStatus();
    loadAccess();
    const userId = ctx.from.id;
    const status = userStatus[userId] || "none";
    const t = getLang(ctx);
    let buttons = [];

    if (accessList.includes(userId)) {
        buttons.push([Markup.button.callback(t.get_signal, 'GET_SIGNAL')]);
        buttons.push([Markup.button.callback(t.instruction, 'INSTRUCTION')]);
        buttons.push([Markup.button.callback(t.choose_language, 'LANG')]);
    } else if (status === "wait_confirm") {
        buttons.push([Markup.button.url(t.register, 'https://1wmndv.life/v3/2158/1win-mines?p=0ujs')]);
        buttons.push([Markup.button.callback(t.i_registered, 'I_REGISTERED')]);
        buttons.push([Markup.button.callback(t.instruction, 'INSTRUCTION')]);
        buttons.push([Markup.button.callback(t.choose_language, 'LANG')]);
    } else if (status === "registered") {
        buttons.push([Markup.button.callback(t.get_access, 'GET_ACCESS')]);
        buttons.push([Markup.button.callback(t.instruction, 'INSTRUCTION')]);
        buttons.push([Markup.button.callback(t.choose_language, 'LANG')]);
    } else {
        buttons.push([Markup.button.callback(t.register, 'REGISTER')]);
        buttons.push([Markup.button.callback(t.instruction, 'INSTRUCTION')]);
        buttons.push([Markup.button.callback(t.choose_language, 'LANG')]);
    }
    return Markup.inlineKeyboard(buttons);
}

function sendMainMenu(ctx) {
    const t = getLang(ctx);
    const lang = userStatus[ctx.from.id + '_lang'] || 'ru';
    const photoPath = lang === 'en'
        ? './data/glavnoe_menu-en.png'
        : './data/glavnoe_menu.png';

    ctx.replyWithPhoto({ source: photoPath }, {
        caption: t.main_menu,
        ...getMainMenu(ctx)
    });
}

function checkAccess(ctx, next) {
    loadAccess();
    const t = getLang(ctx);
    if (accessList.includes(ctx.from.id)) {
        return next();
    }
    ctx.reply(t.no_access);
}

bot.start((ctx) => {
    sendMainMenu(ctx);
});

bot.action('REGISTER', advancedThrottleMiddleware, (ctx) => {
    loadStatus();
    const t = getLang(ctx);
    userStatus[ctx.from.id] = "wait_confirm";
    saveStatus();
    ctx.reply(
        t['instruction_text_register'] || (
            '🔥 Чтобы получить максимум от использования этого бота, необходимо следовать этим шагам:\n\n' +
            '1. Зарегистрируйте новый аккаунт на сайте 1WIN\n' +
            '2. Введите промокод: PENK1WIN\n' +
            '3. Пополните баланс от 500₽\n\n' +
            'После этого нажмите кнопку ниже 👇'
        ),
        Markup.inlineKeyboard([
            [Markup.button.url(t.register, 'https://1wmndv.life/v3/2158/1win-mines?p=0ujs')]
        ])
    );
    setTimeout(() => {
        sendMainMenu(ctx);
    }, 8000);
});

bot.action('I_REGISTERED', advancedThrottleMiddleware, (ctx) => {
    loadStatus();
    userStatus[ctx.from.id] = "registered";
    saveStatus();
    sendMainMenu(ctx);
});

bot.action('BACK_MAIN', (ctx) => {
    sendMainMenu(ctx);
});

bot.action('GET_ACCESS', advancedThrottleMiddleware, (ctx) => {
    const t = getLang(ctx);
    ctx.reply(t.send_deposit);
});

bot.action('INSTRUCTION', advancedThrottleMiddleware, (ctx) => {
    const t = getLang(ctx);
    ctx.replyWithMarkdown(
        t.instruction_text,
        Markup.inlineKeyboard([
            [Markup.button.callback(t.back_main, 'BACK_MAIN')]
        ])
    );
});

bot.on('photo', async (ctx) => {
    loadAccess();
    loadStatus();
    const t = getLang(ctx);
    if (accessList.includes(ctx.from.id)) {
        return ctx.reply(t.already_have_access);
    }
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);

        ctx.reply('⏳ ' + t.ocr_checking);

        Tesseract.recognize(
            fileLink.href,
            'rus+eng',
            { logger: m => console.log(m) }
        ).then(({ data: { text } }) => {
            const ltext = text.toLowerCase();
            if (
                ltext.includes('1win') ||
                ltext.includes('баланс') ||
                ltext.includes('депозит') ||
                ltext.includes('₽')
            ) {
                accessList.push(ctx.from.id);
                saveAccess();
                userStatus[ctx.from.id] = "access";
                saveStatus();
                ctx.reply(t.ocr_access_granted);
                sendMainMenu(ctx);
            } else {
                ctx.reply(t.ocr_no_deposit);
            }
        }).catch((err) => {
            console.error('OCR error:', err);
            ctx.reply(t.ocr_error);
        });
    } catch (e) {
        console.error(e);
        ctx.reply(t.ocr_error);
    }
});

bot.command('access', (ctx) => {
    const t = getLang(ctx);
    if (ctx.from.id.toString() !== process.env.ADMIN_ID) return;
    const args = ctx.message.text.split(' ');
    const id = Number(args[1]);
    if (!id) return ctx.reply(t.admin_example);
    loadAccess();
    loadStatus();
    if (!accessList.includes(id)) {
        accessList.push(id);
        saveAccess();
        userStatus[id] = "access";
        saveStatus();
        bot.telegram.sendMessage(id, t.admin_access_opened);
        ctx.reply(t.admin_access_granted);
    } else {
        ctx.reply(t.admin_access_exists);
    }
});

bot.action('GET_SIGNAL', advancedThrottleMiddleware, checkAccess, (ctx) => {
    const t = getLang(ctx);
    const lang = userStatus[ctx.from.id + '_lang'] || 'ru';
    ctx.reply(
        t.select_mode,
        Markup.inlineKeyboard([
            [
                Markup.button.webApp(t.mines, `https://new-mines-flax.vercel.app/?lang=${lang}`),
                Markup.button.webApp(t.crystals, `https://new-crystals.vercel.app/?lang=${lang}`),
                Markup.button.webApp(t.aviator, `https://en-aviator-version.vercel.app/?lang=${lang}`)
            ]
        ])
    );
});

bot.action('LANG', advancedThrottleMiddleware, (ctx) => {
    const t = getLang(ctx);
    ctx.reply(
        t.lang_choose,
        Markup.inlineKeyboard([
            [Markup.button.callback(t.lang_ru, 'LANG_RU'), Markup.button.callback(t.lang_en, 'LANG_EN')],
            [Markup.button.callback(t.back_main, 'BACK_MAIN')]
        ])
    );
});

bot.action('LANG_RU', advancedThrottleMiddleware, (ctx) => {
    loadStatus();
    userStatus[ctx.from.id] = userStatus[ctx.from.id] || "none";
    userStatus[ctx.from.id + '_lang'] = 'ru';
    saveStatus();
    const t = getLang(ctx);
    ctx.reply(t.lang_ru_success, getMainMenu(ctx));
});

bot.action('LANG_EN', advancedThrottleMiddleware, (ctx) => {
    loadStatus();
    userStatus[ctx.from.id] = userStatus[ctx.from.id] || "none";
    userStatus[ctx.from.id + '_lang'] = 'en';
    saveStatus();
    const t = getLang(ctx);
    ctx.reply(t.lang_en_success, getMainMenu(ctx));
});

bot.command('mines', advancedThrottleMiddleware, checkAccess, (ctx) => {
    const t = getLang(ctx);
    const lang = userStatus[ctx.from.id + '_lang'] || 'ru';
    ctx.reply(t.open_mines + ':', Markup.inlineKeyboard([
        [Markup.button.webApp(t.open_mines, `https://new-mines-flax.vercel.app/?lang=${lang}`)]
    ]));
});

bot.command('crystals', advancedThrottleMiddleware, checkAccess, (ctx) => {
    const t = getLang(ctx);
    const lang = userStatus[ctx.from.id + '_lang'] || 'ru';
    ctx.reply(t.open_crystals + ':', Markup.inlineKeyboard([
        [Markup.button.webApp(t.open_crystals, `https://new-crystals.vercel.app/?lang=${lang}`)]
    ]));
});

bot.command('aviator', advancedThrottleMiddleware, checkAccess, (ctx) => {
    const t = getLang(ctx);
    const lang = userStatus[ctx.from.id + '_lang'] || 'ru';
    ctx.reply(t.open_aviator + ':', Markup.inlineKeyboard([
        [Markup.button.webApp(t.open_aviator, `https://en-aviator-version.vercel.app/?lang=${lang}`)]
    ]));
});

bot.launch();
console.log('Бот запущен!');
