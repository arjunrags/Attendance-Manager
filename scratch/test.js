const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    // Nginx/Docker is mapping to localhost? Actually inside docker, to access another container we need its IP.
    // Let's use host network
    await page.goto('http://172.17.0.1:3001/reports', {waitUntil: 'networkidle0'});
    console.log('Page loaded');
    
    const html = await page.content();
    console.log('Has generate button:', html.includes('Generate Seating Plan'));
    
    await browser.close();
  } catch(e) { console.error('PUPPETEER ERROR:', e); }
})();
