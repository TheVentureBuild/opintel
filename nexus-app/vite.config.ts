import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Opportunity Intelligence is served under /opintel/ on the Nexus domain (the main site's Amplify app proxies
// /opintel/* here), so every asset URL starts with /opintel/ and the build goes to dist/opintel/.
export default defineConfig({
  base: "/opintel/",
  server: { port: 8080 },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: { outDir: "dist/opintel", emptyOutDir: true },
});
