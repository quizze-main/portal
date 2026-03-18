import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function getNgrokUrl() {
    try {
        const response = await fetch('http://ngrok:4040/api/tunnels');
        const data = await response.json();
        const httpsTunnel = data.tunnels.find(tunnel => tunnel.proto === 'https');
        
        if (!httpsTunnel) {
            throw new Error('No HTTPS tunnel found');
        }
        
        return httpsTunnel.public_url;
    } catch (error) {
        console.error('Error getting ngrok URL:', error);
        throw error;
    }
}

async function setTelegramWebhook(webhookUrl) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set in .env file');
    }

    const webhookEndpoint = `${webhookUrl}/api/telegram`;
    console.log('Setting webhook URL:', webhookEndpoint);

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: webhookEndpoint,
                allowed_updates: ['message', 'callback_query']
            })
        });

        const data = await response.json();
        if (!data.ok) {
            throw new Error(`Failed to set webhook: ${data.description}`);
        }

        console.log('Webhook set successfully!');
        return data;
    } catch (error) {
        console.error('Error setting webhook:', error);
        throw error;
    }
}

async function main() {
    try {
        // Ждем 5 секунд, чтобы ngrok успел запуститься
        console.log('Waiting for ngrok to start...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const ngrokUrl = await getNgrokUrl();
        console.log('Got ngrok URL:', ngrokUrl);

        await setTelegramWebhook(ngrokUrl);
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

main(); 