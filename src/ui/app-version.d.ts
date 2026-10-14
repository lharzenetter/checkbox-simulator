// Vite replaces this at build time from package.json, so the footer always shows the released
// version without a runtime fetch.
interface ImportMetaEnv {
  readonly APP_VERSION: string;
}
