import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'presentation.html');
const outDir = path.join(__dirname, 'screenshots', 'review');

fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
await page.goto(`file://${htmlPath}?export`, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));

const totalSlides = await page.evaluate(() => {
  return document.querySelectorAll('.slides > section').length;
});

console.log(`Found ${totalSlides} slides`);

for (let i = 0; i < totalSlides; i++) {
  await page.evaluate((idx) => {
    Reveal.slide(idx);
  }, i);
  await new Promise(r => setTimeout(r, 500));
  const filename = path.join(outDir, `slide_${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({ path: filename });
  console.log(`Captured slide ${i + 1}`);
}

await browser.close();
console.log('Done!');
