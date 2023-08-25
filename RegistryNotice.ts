import { z } from "zod";

const RegistryNotice = z.object({
  rawTitle: z.string(), // title of notice
  rawBody: z.string(), // the whole text body of the notice
  noticeUrl: z.string(), // the url of the individual notice
  noticeId: z.string().uuid(), // the uuid at the end of the url
  acns: z.array(
    z
      .string()
      .transform((v) => v.replaceAll(" ", ""))
      .pipe(z.string().length(9))
  ), // all the ACNs listed in the notice
  publishedAt: z.string(), // the date of publication listed in notice
  seenAt: z.string(), // the current timestamp at extraction
});

export { RegistryNotice };
