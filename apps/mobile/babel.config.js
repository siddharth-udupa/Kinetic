module.exports = (api) => {
  api.cache(true)
  return {
    // The Nativewind preset and the `jsxImportSource` override were v4's way of
    // injecting className support into each JSX element. v5 replaced that with an
    // import rewrite, which the Metro plugin applies — so both are gone here, and
    // babel-preset-expo is left to do what it did before Nativewind existed.
    presets: ["babel-preset-expo"],
  }
}