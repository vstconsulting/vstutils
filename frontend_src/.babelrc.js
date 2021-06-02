module.exports = {
    presets: ['@babel/preset-env'],
    plugins: [
        '@babel/plugin-transform-runtime',
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ["@babel/plugin-proposal-private-methods", { loose: true }],
        ['@babel/plugin-proposal-class-properties', { loose: true }],
    ],
};
