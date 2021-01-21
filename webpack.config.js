const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const VueLoaderPlugin = require("vue-loader/lib/plugin");
const CopyPlugin = require("copy-webpack-plugin");

require("dotenv").config();
const ENV = process.env.APP_ENV;
const isProd = ENV === "prod";

const enableAnalyzer = process.env.BUNDLE_ANALYZER === "true";

const KB = 1024;
const entrypoints_dir = __dirname + "/frontend_src";

function setMode() {
  if (isProd) {
    return "production";
  } else {
    return "development";
  }
}

function workboxCopyPattern(moduleName) {
  return {
    from: `node_modules/${moduleName}/build/${moduleName}.prod.js`,
    to: `workbox/${moduleName}.prod.js`
  }
}

const config = {
  mode: setMode(),
  entry: {
    'app_loader': entrypoints_dir + "/app_loader/index.js",
    'spa': entrypoints_dir + "/spa.js",
    'doc': entrypoints_dir + "/doc.js",
    'auth': entrypoints_dir + "/auth.js",
  },
  output: {
    path: __dirname + "/vstutils/static/bundle",
    filename: "[name].js",
    chunkFilename: "[name].chunk.js",
    publicPath: "/static/bundle/",
    library: "[name]",
    libraryTarget: 'window'
  },
  plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery'
      }),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new CleanWebpackPlugin(),
    new VueLoaderPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "node_modules/workbox-sw/build/workbox-sw.js", to: "workbox/workbox-sw.js" },
        workboxCopyPattern("workbox-core"),
        workboxCopyPattern("workbox-precaching"),
        workboxCopyPattern("workbox-routing"),
        workboxCopyPattern("workbox-strategies"),
      ]
    })
  ],
  resolve: {
    alias: {
      vue$: "vue/dist/vue.esm.js",
    },
    extensions: [".tsx", ".ts", ".js", ".vue"]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: [/node_modules/]
      },
      {
        test: /\.((css)|(scss))$/i,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /.woff2$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 100 * KB
          }
        }
      },
      {
        test: /.(png|jpg|jpeg|gif|svg|woff|ttf|eot)$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10 * KB
          }
        }
      },
      {
        test: /\.vue$/,
        loader: "vue-loader"
      }
    ]
  },
  optimization: {
    chunkIds: "natural",
    splitChunks: {
      // Do not split app_loader and tests
      chunks: function(chunk) {
        return !['app_loader', 'tests'].includes(chunk.name);
      },
      maxInitialRequests: 10,
      // https://webpack.js.org/plugins/split-chunks-plugin/#splitchunkscachegroups
      cacheGroups: {
        // Disable default vendors cache group
        defaultVendors: false,
        // Setup default cache group for everything
        default: {
          automaticNamePrefix: "",
          priority: 0
        },
        // Setup cache group 'vstutils' with higher priority then 'default' group so
        // everything under /frontend_src/vstutils/ will go in one 'vstutils.chunk.js' chunk.
        vstutils: {
          name: "vstutils",
          test: /frontend_src\/vstutils\//,
          priority: 10,
          enforce: true
        }
      }
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true
      }),
      new OptimizeCSSAssetsPlugin()
    ]
  }
};

if (enableAnalyzer) {
  config.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = config;
