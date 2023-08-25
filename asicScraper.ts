import puppeteer from "puppeteer";
import { RegistryNotice } from "./RegistryNotice";
import { prisma } from "@server/db/db";
import { logger } from "@logging/index";
import { z } from "zod";
import dayjs from "@utils/dayjs";

async function scrapeASICNotices() {
  const browser = await puppeteer.launch({ headless: "new" });
  // const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Uncomment for debugging
    //page.on('console', msg => console.log('[PAGE LOG] ', msg.text()));

    await page.goto(
      "https://publishednotices.asic.gov.au/browsesearch-notices/"
    );

    await page.setViewport({ width: 1080, height: 1024 });

    const result = [];

    for (let counter = 0; counter < 10; counter++) {
      const noticeTableSelector = await page.waitForSelector(".NoticeTable");

      const content = await noticeTableSelector?.evaluate((x) => {
        const localResult = [];
        const articleBlocks = x.querySelectorAll(".article-block");
        for (let i = 0; i < articleBlocks.length; i++) {
          const e = articleBlocks[i];

          e?.querySelector(".title-block .published-date span")?.remove();

          const pubDate = e
            ?.querySelector(".title-block .published-date")
            ?.textContent?.trim();

          const rawTitle = e
            ?.querySelector(".title-block h3")
            ?.innerHTML?.replace("<br>", " ")
            ?.trim();

          e?.querySelector(".title-block")?.remove();

          let noticeUrl = e
            ?.querySelector('.notice-buttons a[title="Preview"]')
            ?.getAttribute("href");

          const urlSplit = noticeUrl?.split("/");

          noticeUrl = location.protocol + "//" + location.hostname + noticeUrl;

          let noticeId = "";
          if (urlSplit) {
            noticeId = urlSplit[urlSplit.length - 1]?.trim() || "";
          }

          const seenAt = new Date().toISOString();

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const dls = e.querySelectorAll("dl");
          const acns = [];

          for (let j = 0; j < dls.length; j++) {
            const acn = dls[j]?.querySelectorAll("dd")[0]?.textContent?.trim();
            acns.push(acn);
          }

          e?.querySelector(".notice-buttons")?.remove();

          const rawBody = e?.textContent?.trim();

          localResult.push({
            rawTitle: rawTitle,
            rawBody: rawBody,
            noticeUrl: noticeUrl,
            noticeId: noticeId,
            acns: acns,
            publishedAt: pubDate,
            seenAt: seenAt,
          });
        }

        return localResult;
      });

      if (content != undefined) {
        for (let i = 0; i < content.length; i++) {
          result.push(RegistryNotice.parse(content[i]));
        }
      }

      if (counter >= 9) break;

      const clickSelector =
        '.NoticeTablePager a[href*="Page$' + (counter + 2) + '"]';

      await Promise.all([page.waitForNavigation(), page.click(clickSelector)]);
    }

    await browser.close();

    return result;
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

// async function doInsolvencyRegisterScrape() {
//   const scan = await prisma.asicInvsolvencyNoticesScan.create({
//     data: {
//       status: "STARTED",
//       startedAt: new Date(),
//     },
//   });
//   try {
//     const notices = await scrapeASICNotices();
//     const parsedData = z.array(RegistryNotice).parse(notices);
//
//     // write notices to notices table
//     await prisma.asicInsolvencyNotice.createMany({
//       data: parsedData.map((v) => {
//         return {
//           seenById: scan.id,
//           firstSeenDate: new Date(),
//           // nico todo -  make this australian timezone because we are going to get a bit of timeshift happening
//           publishedDate: dayjs(v.publishedAt, "DD/MM/YYYY").toDate(),
//           acns: v.acns,
//           noticeUrl: v.noticeUrl,
//           rawHeading: v.rawTitle,
//           rawNoticeText: v.rawBody,
//         };
//       }),
//       skipDuplicates: true,
//     });
//
//     // update scan for success
//     await prisma.asicInvsolvencyNoticesScan.update({
//       where: { id: scan.id },
//       data: { status: "COMPLETE", completedAt: new Date() },
//     });
//   } catch (error) {
//     // set scan to error
//     console.log(error);
//     logger.error(error);
//     await prisma.asicInvsolvencyNoticesScan.update({
//       where: { id: scan.id },
//       data: { status: "ERROR" },
//     });
//   }
// }

// doInsolvencyRegisterScrape()
//   .then((notices) => {
//     console.log(JSON.stringify(notices, null, 2));
//   })
//   .catch((error) => {
//     console.error("Error:", error);
//   });

scrapeASICNotices()
  .then((notices) => {
    console.log(JSON.stringify(notices, null, 2));
  })
  .catch((error) => {
    console.error("Error:", error);
  });
