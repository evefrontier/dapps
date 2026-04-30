import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      include: "**/*.svg",
      svgrOptions: {
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    babel({
      babelConfig: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  server: {
    port: parseInt(process.env.VITE_PORT) || 3000,
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    include: ["@evefrontier/dapp-kit"],
  },
  build: {
    target: "es2022",
    minify: true,
    sourcemap: true,
    rollupOptions: {
      onLog(level, log: any, handler) {
        if (
          log.cause &&
          log.cause.message === `Can't resolve original location of error.`
        ) {
          return;
        }
        handler(level, log);
      },
    },
  },
  base: "./",
  publicDir: path.resolve(__dirname, "public"),
  resolve: {
    alias: {
      "@eveworld/ui-components": path.resolve(
        __dirname,
        "../../libs/ui-components",
      ),
      "@evefrontier/dapp-kit": path.resolve(__dirname, "../../libs/dapp-kit"),
      "@mysten/dapp-kit-react": path.resolve(
        __dirname,
        "./node_modules/@mysten/dapp-kit-react",
      ),
    },
    dedupe: [
      "@evefrontier/dapp-kit",
      "@eveworld/ui-components",
      "@mysten/dapp-kit-react",
    ],
  },
});
