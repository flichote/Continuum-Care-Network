import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 生产 Docker 部署：输出最小 standalone 产物（见 frontend/Dockerfile）
  output: "standalone",
};

export default nextConfig;
