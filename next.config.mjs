/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Token logos come from CoinGecko's CDN (see TokenCard).
    remotePatterns: [{ protocol: "https", hostname: "assets.coingecko.com" }],
  },
};

export default nextConfig;
