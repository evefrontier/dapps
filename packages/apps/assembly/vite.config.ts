import react from '@vitejs/plugin-react-swc'
import { readFileSync } from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

// The release tag must match this version (see .github/workflows/image.yaml)
const { version } = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
) as { version: string }

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    babel({
      babelConfig: {
        plugins: ['babel-plugin-react-compiler'],
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
    exclude: ['@evefrontier/dapp-kit'],
  },
  build: {
    target: 'es2022',
    minify: true,
    sourcemap: true,
    rollupOptions: {
      onLog(level, log: any, handler) {
        if (
          log.cause &&
          log.cause.message === `Can't resolve original location of error.`
        ) {
          return
        }
        handler(level, log)
      },
    },
  },
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@eveworld/ui-components': path.resolve(
        __dirname,
        '../../libs/ui-components',
      ),
      '@evefrontier/dapp-kit': path.resolve(
        __dirname,
        '../../libs/dapp-kit/index.ts',
      ),
    },
    dedupe: [
      'react',
      'react-dom',
      '@evefrontier/dapp-kit',
      '@eveworld/ui-components',
      '@mysten/dapp-kit-react',
    ],
  },
})
