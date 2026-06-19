/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // imapflow is a server-only dependency; keep it out of the client bundle.
  experimental: {
    serverComponentsExternalPackages: ["imapflow"],
  },
};

export default nextConfig;
