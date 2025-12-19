const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100  // Slow down by 100ms for better visibility
  });
  const page = await browser.newPage();

  console.log('Opening browser at http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  console.log('Browser opened successfully');
  console.log('Page title:', await page.title());

  // Keep browser open indefinitely - user can close manually
  // This prevents the script from exiting and closing the browser
  await new Promise(() => {}); // Never resolves, keeps process alive
})();
