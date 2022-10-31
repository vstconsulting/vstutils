if (process.env.APP_ENV === 'prod') {
    module.exports = {
        presets: [
            [
                '@babel/preset-env',
                {
                    useBuiltIns: 'usage',
                    corejs: { version: '3.20.3', proposals: true },
                },
            ],
        ],
        plugins: [
            [
                '@babel/plugin-transform-runtime',
                {
                    'corejs': false,
                    'regenerator': false,
                    'version': '^7.16.8'
                }
            ],
        ],
    }
} else {
    module.exports = {
        presets: [
            [
                '@babel/preset-env',
                {
                    useBuiltIns: 'usage',
                    corejs: { version: '3.20.3', proposals: true },
                    targets: 'last 1 Chrome versions',
                },
            ],
        ],
    }
}

