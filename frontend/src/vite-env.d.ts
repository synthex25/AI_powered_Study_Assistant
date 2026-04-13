/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NODE_APP: string;
  readonly VITE_FAST_API: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
