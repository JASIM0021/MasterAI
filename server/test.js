import puppeteer from 'puppeteer';

async function scrapeNSEData() {
  try {
    console.log('Launching browser...');
    // Launch the browser and open a new blank page

    const browser = await puppeteer.launch({
      executablePath:
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: false, // Use visible browser to avoid some detection mechanisms
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
      ],
    });

    // Create a new page with a custom user agent
    const page = await browser.newPage();

    // Set a user agent that looks like a regular browser
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    );

    // Set a reasonable timeout
    page.setDefaultTimeout(30000);

    // Set screen size
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to NSE India website...');
    // Navigate to the NSE India website
    await page.goto('https://www.nseindia.com/market-data/live-equity-market', {
      waitUntil: 'networkidle2',
    });

    // Give the page some time to load dynamic content
    // await page.waitForTimeout(5000);

    console.log('Looking for the table column to click...');
    // Find and click the column header until it has the class 'toggleIcon desc'
    let currentClass = '';
    while (currentClass !== 'toggleIcon desc') {
      // Click on the column header
      await page.waitForSelector('#equityStockTablecol5', { visible: true });
      await page.click('#equityStockTablecol5');

      // Wait for the sort to apply
      await page.waitForTimeout(1000);

      // Check the current class
      currentClass = await page.$eval(
        '#equityStockTablecol5 .sorting-icons',
        el => el.className,
      );
      console.log('Current class:', currentClass);
    }

    console.log('Column sorted in descending order. Extracting data...');
    // Extract table headers
    const headers = await page.$$eval('#equityStockTable thead th', ths =>
      ths.map(th => th.textContent.trim()),
    );

    // Extract table data
    const rows = await page.$$eval(
      '#equityStockTable tbody tr',
      (trs, headers) => {
        return trs.map(tr => {
          const cells = Array.from(tr.querySelectorAll('td'));
          const rowData = {};

          cells.forEach((cell, index) => {
            if (index < headers.length) {
              rowData[headers[index]] = cell.textContent.trim();
            }
          });

          return rowData;
        });
      },
      headers,
    );

    console.log('Data extraction complete!');
    // Output the data as JSON
    console.log(JSON.stringify(rows, null, 2));

    // Close the browser
    await browser.close();

    return rows;
  } catch (error) {
    console.error('An error occurred during scraping:', error);
    process.exit(1);
  }
}

// Run the scraper
scrapeNSEData()
  .then(data => {
    console.log(`Successfully scraped data for ${data.length} stocks`);
  })
  .catch(error => {
    console.error('Script failed:', error);
  });
