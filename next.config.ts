import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';
const githubPagesBasePath = '/DynamicBudget';

const nextConfig: NextConfig = {
  // Output as a fully static site (no Node server required).
  // `npm run build` produces an `out/` directory that can be hosted on
  // GitHub Pages, Netlify, S3, or opened directly in a browser — the same
  // self-hosted static pattern used by the FirstTimeFitness app.
  output: "export",
  basePath: isProduction ? githubPagesBasePath : undefined,
  assetPrefix: isProduction ? `${githubPagesBasePath}/` : undefined,
};

export default nextConfig;
