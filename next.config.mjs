/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev and prod must never share a dist dir: dev's cache activity deletes
  // the hashed assets prod serves (unstyled pages, 500s on CSS). Production
  // builds and serves from .next; dev compiles into .next-dev.
  // NEXT_DIST_DIR overrides either when set.
  distDir:
    process.env.NEXT_DIST_DIR ??
    (process.env.NODE_ENV === "production" ? ".next" : ".next-dev"),
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
      // React Native only; the MetaMask SDK imports it behind a platform
      // guard that webpack still tries to resolve.
      "@react-native-async-storage/async-storage": false,
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
