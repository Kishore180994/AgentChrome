import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { writeFileSync, copyFileSync, mkdirSync } from "fs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "static-copy",
      writeBundle() {
        // Ensure icons directory exists
        mkdirSync("dist/icons", { recursive: true });

        // Copy manifest to dist
        copyFileSync("manifest.json", "dist/manifest.json");

        // Create placeholder icons if they don't exist
        const sizes = [16, 48, 128];
        sizes.forEach((size) => {
          const iconPath = `public/icons/icon${size}.png`;
          const distIconPath = `dist/icons/icon${size}.png`;
          try {
            copyFileSync(iconPath, distIconPath);
          } catch (e) {
            // Create a simple SVG icon as a placeholder
            const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#4F46E5"/>
              <text x="50%" y="50%" font-family="Arial" font-size="${
                size / 2
              }px" fill="white" text-anchor="middle" dy="${size / 6}">AI</text>
            </svg>`;
            writeFileSync(distIconPath, Buffer.from(svg));
          }
        });
      },
    },
  ],
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
        sidebar: resolve(__dirname, "sidepanel.html"),
        micPermission: resolve(__dirname, "micPermission.html"),
      },
      output: {
        entryFileNames: "[name].js", // This will likely produce micPermissionJs.js
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    outDir: "dist",
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
