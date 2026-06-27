const { withProjectBuildGradle } = require('@expo/config-plugins');
module.exports = function withLocationDowngrade(config) {
  return withProjectBuildGradle(config, async (config) => {
    if (!config.modResults.contents.includes('force "com.google.android.gms:play-services-location')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects \{/,
        `allprojects {\n    configurations.all {\n        resolutionStrategy {\n            force "com.google.android.gms:play-services-location:21.2.0"\n        }\n    }`
      );
    }
    return config;
  });
};
