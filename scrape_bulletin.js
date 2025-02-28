const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const BULLETIN_URL = 'https://bulletin.du.edu/undergraduate/coursedescriptions/comp/';

async function scrapeBulletin() {
  try {
    const { data } = await axios.get(BULLETIN_URL);
    const $ = cheerio.load(data);
    const courses = [];

    // Use the parent container that holds all course blocks
    $('.sc_sccoursedescs .courseblock').each((i, element) => {
      const titleText = $(element).find('.courseblocktitle strong').text().trim();
      if (!titleText) return;
      const parts = titleText.split(/\s+/);
      const dept = parts[0]; // e.g. "COMP"
      const number = parts[1]; // e.g. "1101"
      const courseNum = parseInt(number, 10);
      // Only select upper-division courses (3000 level or higher)
      if (isNaN(courseNum) || courseNum < 3000) return;

      // Check if the course description contains any prerequisites
      const descText = $(element).find('.courseblockdesc').text();
      if (/Prerequisite/i.test(descText)) return;

      // Remove the dept and course number and the credits text to get the title
      let courseTitle = titleText
        .replace(`${dept} ${number}`, '')
        .replace(/\(\d+\s+Credits\)/i, '')
        .trim();
      const courseCode = `${dept}-${number}`;

      courses.push({
        course: courseCode,
        title: courseTitle
      });
    });

    await fs.ensureDir(path.join(__dirname, 'results'));
    await fs.writeJson(path.join(__dirname, 'results', 'bulletin.json'), { courses }, { spaces: 2 });
    console.log('Bulletin courses scraped successfully.');
  } catch (error) {
    console.error('Error scraping bulletin:', error);
  }
}

scrapeBulletin();
