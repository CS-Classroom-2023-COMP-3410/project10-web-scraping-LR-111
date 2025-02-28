const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const ATHLETICS_URL = 'https://denverpioneers.com/index.aspx';

async function scrapeAthleticEvents() {
  // Launch Puppeteer to get fully rendered HTML
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(ATHLETICS_URL, { waitUntil: 'networkidle2' });
  
  // Wait for the carousel container to load (adjust selector if needed)
  await page.waitForSelector('.slick-track');

  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const events = [];

  // Iterate over each carousel item
  $('.c-scoreboard__item').each((i, element) => {
    // Get the DU team name from the away section
    const duTeam = $(element)
      .find('.c-scoreboard__team--away .c-scoreboard__sport')
      .text()
      .trim();
    // Get the opponent name from the home section
    const opponent = $(element)
      .find('.c-scoreboard__team--home .c-scoreboard__team-name')
      .text()
      .trim();
    // Get the event date from the aria-label of the hidden button
    const ariaLabel = $(element).find('button.accessible-hide').attr('aria-label');
    let date = '';
    if (ariaLabel) {
      const dateMatch = ariaLabel.match(/on\s+([\d\/]+)\s+at/);
      if (dateMatch && dateMatch[1]) {
        date = dateMatch[1];
      }
    }
    if (duTeam && opponent && date) {
      events.push({ duTeam, opponent, date });
    }
  });

  await fs.ensureDir(path.join(__dirname, 'results'));
  await fs.writeJson(
    path.join(__dirname, 'results', 'athletic_events.json'),
    { events },
    { spaces: 2 }
  );
  console.log('Athletic events scraped successfully.');
}

scrapeAthleticEvents();
