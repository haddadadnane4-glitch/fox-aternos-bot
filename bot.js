const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer-core');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let browser = null;

async function startAternosServer(message) {
    const statusMessage = await message.reply('⏳ Starting your Aternos server...');
    
    try {
        console.log('🔄 Connecting to Browserless...');
        
        // Connect to Browserless
        browser = await puppeteer.connect({
            browserWSEndpoint: 'wss://chrome.browserless.io',
            defaultViewport: null,
        });
        
        console.log('✅ Browser connected!');
        
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Go to Aternos
        await page.goto('https://aternos.org/', { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Page loaded:', await page.title());
        
        // Handle Cloudflare
        if (await page.title() === 'Just a moment...') {
            console.log('⚠️ Cloudflare challenge detected. Waiting...');
            await page.waitForFunction(
                () => !document.title.includes('Just a moment'),
                { timeout: 90000 }
            );
            console.log('✅ Cloudflare passed!');
        }
        
        // Login
        await page.waitForSelector('input#user', { timeout: 30000 });
        await page.type('input#user', process.env.ATERNOS_USER);
        await page.type('input#password', process.env.ATERNOS_PASS);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        
        // Go to servers page
        await page.goto('https://aternos.org/servers/', { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Click on your server
        await page.waitForSelector('.server-list-item', { timeout: 30000 });
        await page.click(`.server-list-item:has-text("${process.env.ATERNOS_SERVER}")`);
        
        // Click start button
        await page.waitForSelector('#start', { timeout: 30000 });
        await page.click('#start');
        
        console.log('✅ Server start command sent!');
        await statusMessage.edit('✅ Server started successfully!');
        
        await page.close();
        
    } catch (error) {
        console.error('❌ Error:', error);
        await statusMessage.edit('❌ Failed to start server. Check logs.');
    } finally {
        if (browser) {
            await browser.close();
            browser = null;
        }
    }
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() === '!start') {
        await startAternosServer(message);
    }
});

client.login(process.env.DISCORD_TOKEN);
