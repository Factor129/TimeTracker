import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/index.html'),
          widget: resolve(__dirname, 'src/renderer/widget.html')
        }
      }
    },
    plugins: [react()]
  }
})
