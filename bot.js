const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');

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
        // Connect to Browserless
        console.log('🔄 Connecting to Browserless...');
        const BROWSER_WS_ENDPOINT = 'wss://production-sfo.browserless.io?token=2UCixdbOOb1QMwZe6923432f3a04287ee70ff28a0014822c8';
        browser = await puppeteer.connect({
            browserWSEndpoint: BROWSER_WS_ENDPOINT,
        });
        console.log('✅ Browser connected!');
        
        const page = await browser.newPage();
        
        // Go to Aternos
        await page.goto('https://aternos.org/', { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Page loaded:', await page.title());
        
        // Handle Cloudflare
        if (await page.title() === 'Just a moment...') {
            console.log('⚠️ Cloudflare challenge detected. Waiting...');
            await page.waitForFunction(
                () => !document.title.includes('Just a moment'),
                { timeout: 60000 }
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
        
        // Select server
        const serverName = process.env.ATERNOS_SERVER;
        await page.waitForSelector(`a:contains("${serverName}")`, { timeout: 30000 });
        await page.click(`a:contains("${serverName}")`);
        
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
