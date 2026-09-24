import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Personal registration links carry a token in the URL: never leak it
        // through the Referer header, never index it.
        source: "/events/:slug/r/:token",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
