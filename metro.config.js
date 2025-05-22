//import 'react-native-get-random-values';

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Adicione ou modifique a configuração do resolver aqui
/* config.resolver = {
    ...config.resolver,
    // Garante que config.resolver.extraNodeModules existe, preservando o que já lá estiver
    extraNodeModules: {
        ...(config.resolver.extraNodeModules || {}), // Preserva outros extraNodeModules se existirem
        
        // Polyfills para módulos Node.js standard library
        stream: require.resolve('readable-stream'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        url: require.resolve('react-native-url-polyfill'),
        buffer: require.resolve('buffer/'),
        vm: require.resolve('vm-browserify'),
        crypto: require.resolve('react-native-crypto'),
        zlib: require.resolve('browserify-zlib'),
        path: require.resolve('path-browserify'),
        assert: require.resolve('assert/'),
    },
}; */

// Add the unstable_conditionNames configuration
config.resolver.unstable_enablePackageExports = false;

module.exports = config;