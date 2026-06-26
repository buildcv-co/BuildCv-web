import type { NextConfig } from "next";

const rawOrigins = process.env.ALLOWED_DEV_ORIGINS;
const allowedDevOrigins = rawOrigins
  ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean)
  : ["127.0.0.1"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
