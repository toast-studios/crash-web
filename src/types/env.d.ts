/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAME_ENVIRONMENT: string;
  readonly VITE_WEB_VERSION: string;
  readonly VITE_GAME_MODE: string;
  readonly VITE_PARTNER_SHORT: string;
  readonly VITE_PARTNER_ID: string;
  readonly VITE_VIEW_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VITE_GAME_MODE: string;
    VITE_GAME_ENVIRONMENT: string;
    VITE_WEB_VERSION: string;
    VITE_PARTNER_SHORT: string;
    VITE_PARTNER_ID: string;
    VITE_VIEW_MODE: string;
  }
}

declare module "*.ejs" {
  const content: string;
  export default content;
}
