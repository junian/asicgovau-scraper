import puppeteer from 'puppeteer';
import { RegisteryNotice } from './RegisteryNotice';

async function scrapeASICNotices() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    // Uncomment for debugging
    //page.on('console', msg => console.log('[PAGE LOG] ', msg.text()));

    await page.goto('https://publishednotices.asic.gov.au/browsesearch-notices/');

    await page.setViewport({ width: 1080, height: 1024 });

    const result = [];

    for (let counter = 0; counter < 10; counter++) {

      const noticeTableSelector = await page.waitForSelector('.NoticeTable');

      const content = await noticeTableSelector?.evaluate(x => {
        const localResult = [];
        let articleBlocks = x.querySelectorAll('.article-block');
        for (let i = 0; i < articleBlocks.length; i++) {
          let e = articleBlocks[i];

          e?.querySelector('.title-block .published-date span')?.remove();

          let pubDate = e
            ?.querySelector('.title-block .published-date')
            ?.textContent
            ?.trim();

          let rawTitle = e
            ?.querySelector('.title-block h3')
            ?.innerHTML
            ?.replace("<br>", " ")
            ?.trim();

          e?.querySelector('.title-block')?.remove();

          let noticeUrl = e
            ?.querySelector('.notice-buttons a[title="Preview"]')
            ?.getAttribute('href');

          let urlSplit = noticeUrl?.split('/');

          noticeUrl = location.protocol + "//" + location.hostname + noticeUrl;

          let noticeId = "";
          if (urlSplit != undefined) {
            noticeId = urlSplit[urlSplit.length - 1].trim();
          }

          let seenAt = new Date().toISOString();

          let dls = e.querySelectorAll('dl');
          let acns = [];

          for (let j = 0; j < dls.length; j++) {
            let acn = dls[j]?.querySelectorAll('dd')[0]?.textContent?.trim();
            acns.push(acn);
          }

          e?.querySelector('.notice-buttons')?.remove();

          let rawBody = e?.textContent?.trim();

          localResult.push(
            {
              rawTitle: rawTitle,
              rawBody: rawBody,
              noticeUrl: noticeUrl,
              noticeId: noticeId,
              acns: acns,
              publishedAt: pubDate,
              seenAt: seenAt
            });
        }

        return localResult;
      });

      if (content != undefined) {
        for (let i = 0; i < content.length; i++) {
          result.push(RegisteryNotice.parse(content[i]));
        }
      }

      if(counter >= 9)
        break;

      const clickSelector = '.NoticeTablePager a[href*="Page$' + (counter + 2) + '"]';

      await Promise.all([
        page.waitForNavigation(),
        page.click(clickSelector),
      ]);
    }

    await browser.close();

    return result;

  } catch (error) {
    console.error('An error occurred:', error);
    return [];
  }
}

scrapeASICNotices()
  .then((notices) => {
    console.log(JSON.stringify(notices, null, 2));
  })
  .catch((error) => {
    console.error('Error:', error);
  });
