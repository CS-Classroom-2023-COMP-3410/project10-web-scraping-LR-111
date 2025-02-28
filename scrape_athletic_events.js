const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const ATHLETICS_URL = 'https://denverpioneers.com/index.aspx';

async function scrapeAthleticEvents() {
  try {
    const { data } = await axios.get(ATHLETICS_URL);
    const $ = cheerio.load(data);

    // Locate the script tag that holds the JSON data
    const scriptContent = $('section[aria-labelledby="h2_scoreboard"] script').html();
    if (!scriptContent) {
      console.error('Unable to locate the JSON script on the athletics page.');
      return;
    }
    // Extract the JSON object using a regex
    const jsonMatch = scriptContent.match(/var\s+obj\s*=\s*(\{.*\});/);
    if (!jsonMatch) {
      console.error('JSON data not found in the script tag.');
      return;
    }
    const jsonData = JSON.parse(jsonMatch[1]);

    // Map the data to extract the DU team, opponent, and date.
    const eventsData = jsonData.data.map(item => ({
      duTeam: item.sport?.title || 'Unknown DU Team',
      opponent: item.opponent?.title || 'Unknown Opponent',
      date: item.date || 'Unknown Date'
    }));

    await fs.ensureDir(path.join(__dirname, 'results'));
    await fs.writeJson(path.join(__dirname, 'results', 'athletic_events.json'), { events: eventsData }, { spaces: 2 });
    console.log('Athletic events successfully saved to results/athletic_events.json');
  } catch (error) {
    console.error('Error fetching or processing athletic events:', error);
  }
}

scrapeAthleticEvents();
