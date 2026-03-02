const { withAppBuildGradle } = require("expo/config-plugins");

/** Expo config plugin that strips non-arm64 native libs from the APK. */
module.exports = function withAbiFilter(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Add exclusions to the existing packagingOptions block
    const needle = "packagingOptions {";
    const idx = contents.indexOf(needle);
    if (idx !== -1 && !contents.includes("**/x86/")) {
      const insertPos = contents.indexOf("\n", idx) + 1;
      const indent = "        ";
      const excludeBlock = [
        `${indent}jniLibs.excludes += "lib/x86/**"`,
        `${indent}jniLibs.excludes += "lib/x86_64/**"`,
        `${indent}jniLibs.excludes += "lib/armeabi-v7a/**"`,
        "",
      ].join("\n");
      config.modResults.contents =
        contents.slice(0, insertPos) + excludeBlock + contents.slice(insertPos);
    }

    return config;
  });
};
