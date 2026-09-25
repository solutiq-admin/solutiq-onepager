import type { Metadata } from "next";
import config from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";

import { importMap } from "../importMap";

// Server actions run under this page, including the bulk-send batches
// (10 emails, paced for Resend's rate limit, ~6-10 s each).
export const maxDuration = 60;

type Args = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
};

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  const meta = await generatePageMetadata({ config, params, searchParams });
  // The admin panel is internal-only; never let it get indexed.
  return { ...meta, robots: { index: false, follow: false } };
};

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, importMap, params, searchParams });

export default Page;
