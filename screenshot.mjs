import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function takeScreenshot() {
  const args = process.argv.slice(2);
  const url = args[0] || 'http://localhost:3000';
  const label = args[1] || '';

  if (!url) {
    console.error('Usage: node screenshot.mjs <url> [label]');
    process.exit(1);
  }

  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(__dirname, 'temporary screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Find next screenshot number
  let screenshotNum = 1;
  const files = fs.readdirSync(screenshotsDir);
  const numbers = files
    .map(f => {
      const match = f.match(/^screenshot-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  if (numbers.length > 0) {
    screenshotNum = Math.max(...numbers) + 1;
  }

  const filename = label
    ? `screenshot-${screenshotNum}-${label}.png`
    : `screenshot-${screenshotNum}.png`;
  const filepath = path.join(screenshotsDir, filename);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set viewport to common desktop size
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Take screenshot
    await page.screenshot({ path: filepath, fullPage: true });

    console.log(`Screenshot saved to: ${filepath}`);
    console.log(`URL: ${url}`);
  } catch (error) {
    console.error('Error taking screenshot:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeScreenshot();
