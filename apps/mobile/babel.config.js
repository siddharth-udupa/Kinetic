module.exports = (api) => {
  api.cache(true)
  return {
    // Nativewind v5 injects className through its Metro plugin, not a babel
    // preset, so only babel-preset-expo is needed here.
    presets: ["babel-preset-expo"],
  }
}