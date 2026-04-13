import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
    
  ],
  server: {
    host: "0.0.0.0", // Listen on all network interfaces
    port: 5173, // Your Vite port
    strictPort: true, // Ensures the same port is used
    cors: true, // Enable CORS (optional)
    allowedHosts: ["mindgrasp.jaydesk.in"],
  },
})


