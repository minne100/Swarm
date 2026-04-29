import { defineConfig } from "vite"
import desktopPlugin from "./vite.js"

export default defineConfig({
  plugins: [desktopPlugin] as any,
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 6904,
  },
  build: {
    target: "esnext",
    // sourcemap: true,
  },
})
