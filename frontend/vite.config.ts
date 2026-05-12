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
    // Allow common dev + prod hosts (helps when testing via localhost/IP/LAN).
    allowedHosts: ["mindgrasp.jaydesk.in", "ai-powered-study-assistant-hazel.vercel.app", "localhost", "127.0.0.1"],
    // Google OAuth (GIS) uses popups + postMessage; a strict COOP can break that flow.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
})

