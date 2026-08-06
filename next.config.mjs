/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', '@prisma/client', 'bcryptjs']
  }
};

export default nextConfig;
