/* eslint-disable no-undef */
import { defineConfig } from "vite";
import { ViteEjsPlugin } from "vite-plugin-ejs";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { GAME_ENVIRONMENT, GAME_MODES } from "./src/constants";

export default defineConfig(() => {
  // * log build mode - Only console.log in development mode
  const gameMode = process.env.VITE_GAME_MODE;
  const gameEnvironment = process.env.VITE_GAME_ENVIRONMENT;
  const web_version = process.env.VITE_WEB_VERSION;
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
  const partner_short = process.env.VITE_PARTNER_SHORT;
  const partner_id = process.env.VITE_PARTNER_ID;
  const viewMode = process.env.VITE_VIEW_MODE;

  console.log("Game Mode: " + gameMode);
  console.log("ENVIRONMENT: " + gameEnvironment);
  console.log("Web Version: " + web_version);
  console.log("Partner Short: " + partner_short);
  console.log("Partner ID: " + partner_id);

  if (!web_version || !gameMode || !gameEnvironment) {
    console.error(
      "Web Version is not defined. Please provide a valid web version."
    );
    process.exit(1);
  }

  return {
    base: "./",
    server: {
      host: true,
      port: 8000,
    },
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
      "import.meta.env.VITE_GAME_MODE": JSON.stringify(gameMode),
      "import.meta.env.VITE_GAME_ENVIRONMENT": JSON.stringify(gameEnvironment),
      "import.meta.env.VITE_WEB_VERSION": JSON.stringify(web_version),
      "import.meta.env.VITE_PARTNER_SHORT": JSON.stringify(partner_short),
      "import.meta.env.VITE_PARTNER_ID": JSON.stringify(partner_id),
      "import.meta.env.VITE_VIEW_MODE": JSON.stringify(viewMode),
    },
    assetsInclude: ["**/*.lottie", "**/*.ejs"],
    build: {
      sourcemap: true, // Source map generation must be turned on
    },
    plugins: [
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: "toast-11",
        project: "blackjack-web",
        release: {
          name: `${gameEnvironment}:${web_version}`,
          dist: web_version,
        },
      }),
      ViteEjsPlugin({
        gameMode: gameMode,
        gameEnvironment: gameEnvironment,
        GAME_MODES: GAME_MODES,
        GAME_ENVIRONMENT: GAME_ENVIRONMENT,
      }),
      sentryVitePlugin({
        org: 'toast-11',
        project: 'blackjack-web',

        // Auth tokens can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/
        authToken: sentryAuthToken,
        sourcemaps: {
          assets: "./dist/**",
        },
      }),
    ],
  };
});
