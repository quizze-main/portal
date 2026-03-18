import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'screenshots', 'app');
fs.mkdirSync(outDir, { recursive: true });

const APP_URL = 'http://localhost:5176';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--window-size=390,844'],
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

// Dismiss PWA install modal before any page loads
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('hideInstallAppInstruction', '1'); } catch {}
});

async function capture(name, url, delay = 2500) {
  console.log(`Navigating: ${name}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, delay));
  const filename = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: filename });
  console.log(`Captured: ${name}`);
}

try {
  // Landing (before login)
  await capture('01_landing', APP_URL);

  // Demo login
  console.log('Logging in...');
  const loginRes = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pincode: '8008' })
      });
      return { status: res.status, body: await res.json() };
    } catch (e) { return { error: e.message }; }
  });
  console.log('Login:', JSON.stringify(loginRes));

  // Mobile screenshots (390x844)
  await capture('02_dashboard', APP_URL, 3000);
  await capture('03_knowledge', `${APP_URL}/knowledge`);
  await capture('04_tasks', `${APP_URL}/all-tasks`);
  await capture('05_profile', `${APP_URL}/profile`);
  await capture('06_shifts', `${APP_URL}/shift-schedule`);
  await capture('07_reviews', `${APP_URL}/reviews`);
  await capture('08_calculator', `${APP_URL}/calculator`);
  await capture('09_attention_deals', `${APP_URL}/attention-deals`);
  await capture('10_admin', `${APP_URL}/admin`);

  // Desktop screenshots (1280x720)
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await capture('11_dashboard_desktop', APP_URL, 3000);
  await capture('12_knowledge_desktop', `${APP_URL}/knowledge`);
  await capture('13_shifts_desktop', `${APP_URL}/shift-schedule`);
  await capture('14_admin_desktop', `${APP_URL}/admin`);
  await capture('15_calculator_desktop', `${APP_URL}/calculator`);

} catch (err) {
  console.error('Error:', err.message);
}

await browser.close();
console.log('Done! Screenshots in:', outDir);
