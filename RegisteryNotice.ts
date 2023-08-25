import { z } from 'zod';

const RegisteryNotice = z.object({
  rawTitle: z.string(), // title of notice
  rawBody: z.string(), // the whole text body of the notice
  noticeUrl: z.string(), // the url of the individual notice
  noticeId: z.string(), // the uuid at the end of the url
  acns: z.array(z.string()), // all the ACNs listed in the notice
  publishedAt: z.string(), // the date of publication listed in notice
  seenAt: z.string(), // the current timestamp at extraction
});

export {RegisteryNotice};
