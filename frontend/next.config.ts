import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/Sytem_one_tryon" : "",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

