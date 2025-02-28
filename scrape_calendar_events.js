const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

// Limit events to 2025 using query parameters.
const CALENDAR_URL = 'https://www.du.edu/calendar?search=&start_date=2025-01-01&end_date=2025-12-31';

async function scrapeEventDetail(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    // Look for the description in the div with class "description" (and itemprop="description")
    let description = $('div.description').text().trim();
    // Fallback selectors if needed.
    if (!description) {
      description = $('div.event-description, div.field--name-field-event-description, article .field--name-body').text().trim();
    }
    return description;
  } catch (error) {
    console.error(`Error scraping event detail at ${url}:`, error);
    return '';
  }
}

async function scrapeCalendarEvents() {
  try {
    const { data } = await axios.get(CALENDAR_URL);
    const $ = cheerio.load(data);
    const eventsArr = [];

    // Each event card is the <a> tag with class "event-card" inside an event listing item.
    const eventCards = $('#events-listing .event-card').toArray();
    for (let element of eventCards) {
      const card = $(element);
      // The first <p> is assumed to contain the event date.
      const dateText = card.find('p').first().text().trim();
      // The <h3> holds the event title.
      const title = card.find('h3').text().trim();

      // Find the <p> element containing a clock icon for the time.
      let time = '';
      card.find('p').each((i, el) => {
        if ($(el).find('span.icon-du-clock').length > 0) {
          time = $(el).clone().children().remove().end().text().trim();
        }
      });

      // URL to the event detail page.
      const eventUrl = card.attr('href');
      let description = '';
      if (eventUrl) {
        description = await scrapeEventDetail(eventUrl);
      }

      if (title && dateText) {
        // Append "2025" if the year is not present.
        const fullDate = dateText.match(/\d{4}/) ? dateText : `${dateText} 2025`;
        const eventObj = { title, date: fullDate };
        if (time) eventObj.time = time;
        if (description) eventObj.description = description;
        eventsArr.push(eventObj);
      }
    }

    await fs.ensureDir(path.join(__dirname, 'results'));
    await fs.writeJson(path.join(__dirname, 'results', 'calendar_events.json'), { events: eventsArr }, { spaces: 2 });
    console.log('Calendar events scraped successfully.');
  } catch (error) {
    console.error('Error scraping calendar events:', error);
  }
}

scrapeCalendarEvents();
