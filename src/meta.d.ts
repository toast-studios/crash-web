interface ImportMetaEnv {
  MODE: string;
  // Add other environment variables here if needed
  // For example:
  // VITE_API_URL: string;
  // VITE_DEBUG: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
