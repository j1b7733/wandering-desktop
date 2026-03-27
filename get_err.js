const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
       console.log('BROWSER EXCEPTION:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  // First visit
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' }).catch(e => console.error(e));
  
  // Create a fake outing in IndexedDB directly using the app's storage helper if possible, 
  // or window.indexedDB.
  await page.evaluate(async () => {
     return new Promise((resolve, reject) => {
        const req = window.indexedDB.open('wandering-db', 2);
        req.onsuccess = (e) => {
           const db = e.target.result;
           const tx = db.transaction('outings', 'readwrite');
           const store = tx.objectStore('outings');
           store.put({
              id: 'test-outing',
              title: 'Crash Test Outing',
              date: new Date().toISOString(),
              startTime: new Date().toISOString(),
              tracks: [{lat: 1, lng: 1}],
              photos: []
           });
           tx.oncomplete = () => resolve();
           tx.onerror = () => reject();
        };
        req.onerror = () => reject();
     });
  });

  // Reload to pick up the data
  await page.reload({ waitUntil: 'networkidle2' });

  try {
     await page.waitForSelector('.outing-card', { timeout: 3000 });
     console.log('Found outing card, clicking...');
     await page.click('.outing-card');
     await new Promise(r => setTimeout(r, 1000));
  } catch(err) {
     console.log('Could not click outing:', err.message);
  }
  
  await browser.close();
})();
