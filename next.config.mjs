/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker build sets NEXT_OUTPUT=standalone to produce a minimal self-contained server
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
