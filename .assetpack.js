import { pixiPipes } from "@assetpack/core/pixi";
const entryPoint = process.env.ASSET_ENTRY_POINT;
if (!entryPoint) {
  throw new Error("ENTRY_POINT is not set");
}
export default {
  entry: entryPoint,
  output: "./public/assets",
  cache: true,
  pipes: [
    ...pixiPipes({
      texturePacker: {
        texturePacker: {
          removeFileExtension: true,
          resolution: 2,
        },
      },
      compression: {
        jpg: {
          quality: 100,
        },
        png: {
          quality: 100,
        },
        webp: {
          quality: 100,
        },
      },
      manifest: {
        output: "./public/assets/assets-manifest.json",
      },
    }),
  ],
};
