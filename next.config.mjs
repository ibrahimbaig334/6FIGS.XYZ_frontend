/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Token logos come from CoinGecko's CDNs (see TokenCard).
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
    ],
  },
};

export default nextConfig;
