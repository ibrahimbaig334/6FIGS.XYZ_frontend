/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // WalletConnect/AppKit pull optional Node-only deps into the browser
    // bundle; mark them external instead of polyfilling.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // The wagmi connector bundle statically imports Base Account's optional
    // x402 signer, which is not installed. It is never used (Coinbase
    // embedded is disabled), so resolve it to an empty module.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402": false,
    };
    return config;
  },
  images: {
    // Token logos come from CoinGecko's CDNs (see TokenCard).
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
    ],
  },
};

export default nextConfig;