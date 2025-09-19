const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot, {
  isCSSEnabled: true,
});

// 1. Enable CSS support.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// 2. Add NativeWind support
const nativeWindConfig = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
  projectRoot, // Pass the project root
});

// 3. Add custom resolver for native-only modules
const originalResolveRequest = nativeWindConfig.resolver.resolveRequest;
nativeWindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native/Libraries/Utilities/codegenNativeCommands') {
    return {
      filePath: path.resolve(projectRoot, 'metro-empty-module.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle react-native-maps for web platform
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(projectRoot, 'metro-empty-module.js'),
      type: 'sourceFile',
    };
  }
  
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  
  // Fallback to default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = nativeWindConfig;
