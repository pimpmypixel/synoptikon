import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    base: env.VITE_BASE_URL ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        "/hello": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/posters": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/posters-files": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
