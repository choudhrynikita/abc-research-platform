/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdfkit", "exceljs"],
};

export default nextConfig;