const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Na web, o módulo nativo react-native-fs (usado pelo tfjs-react-native) é substituído por um shim vazio.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-fs' && platform === 'web') {
    return { filePath: path.resolve(__dirname, 'shims/react-native-fs.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
