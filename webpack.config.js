const path = require('path');
const webpack = require('webpack');
const {VueLoaderPlugin} = require('vue-loader');

require("dotenv").config();
const isProd = process.env.APP_ENV === 'prod';
const showWarnings = process.env.SHOW_WARNINGS === 'true';

const KB = 1024;
const frontendSrc = path.resolve(__dirname, 'frontend_src');

const excludeFromSplitNames= ['app_loader', 'doc', 'base'];

module.exports = {
    mode: isProd ? 'production' : 'development',
    entry: {
        'app_loader': path.resolve(frontendSrc, 'app_loader/index.js'),
        'spa': path.resolve(frontendSrc, 'spa.js'),
        'doc': path.resolve(frontendSrc, 'doc/index.js'),
        'base': path.resolve(frontendSrc, 'base/index.js'),
    },
    output: {
        path: path.resolve(__dirname, 'vstutils/static/bundle'),
        clean: true,
        filename: '[name].js',
        chunkFilename: '[name].chunk.js',
        library: {
            name: 'spa',
            type: 'window',
        },
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        }),
        new webpack.IgnorePlugin({resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/}),
        new VueLoaderPlugin(),
    ],
    resolve: {
        alias: {
            vue$: 'vue/dist/vue.esm.js',
        },
        extensions: ['.tsx', '.ts', '.js', '.vue']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: [/node_modules/]
            },
            {
                test: /\.((css)|(scss))$/i,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            url: {
                                filter: (url) => !url.startsWith('/static/')
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                quietDeps: true
                            }
                        }
                    }
                ]
            },
            {
                test: /.woff2$/,
                type: 'asset',
                parser: {
                    dataUrlCondition: {maxSize: 100 * KB},
                },

            },
            {
                test: /.(png|jpg|jpeg|gif|svg|woff|ttf|eot)$/,
                type: 'asset',
                parser: {
                    dataUrlCondition: {maxSize: 10 * KB},
                },

            },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            }
        ]
    },
    stats: {
        all: false,
        entrypoints: true,
        errors: true,
        warnings: showWarnings,
    },
    optimization: {
        chunkIds: 'deterministic',
        splitChunks: {
            // Do not split app_loader
            chunks: function (chunk) {
                return !excludeFromSplitNames.includes(chunk.name);
            },
            maxInitialRequests: 10,
            // https://webpack.js.org/plugins/split-chunks-plugin/#splitchunkscachegroups
            cacheGroups: {
                // Disable default vendors cache group
                defaultVendors: false,
                // Setup default cache group for everything
                default: {
                    priority: 0
                },
                // Setup cache group 'vstutils' with higher priority then 'default' group so
                // everything under /frontend_src/vstutils/ will go in one 'vstutils.chunk.js' chunk.
                vstutils: {
                    name: 'vstutils',
                    test: /frontend_src\/vstutils\//,
                    priority: 10,
                    enforce: true
                }
            }
        }
    },
};
