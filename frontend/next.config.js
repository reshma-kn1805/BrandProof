const isExport = process.env.NEXT_EXPORT === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isExport ? "export" : undefined,
  basePath: isExport ? "/BrandProof" : "",
  assetPrefix: isExport ? "/BrandProof/" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(isExport
    ? {}
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://127.0.0.1:8000/api/:path*",
            },
          ];
        },
      }),
};

module.exports = nextConfig;
