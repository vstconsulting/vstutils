const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const BabelMinifyPlugin = require("babel-minify-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

require("dotenv").config();
const ENV = process.env.APP_ENV;
const isProd = ENV === "prod";

const enableAnalyzer = process.env.BUNDLE_ANALYZER === "true";

const KB = 1024;

function setMode() {
  if (isProd) {
    return "production";
  } else {
    return "development";
  }
}

const config = {
  mode: setMode(),
  devtool: isProd ? "source-map": undefined,
  entry: {
    app: __dirname + "/frontend_src/app.js",
    loginPage: __dirname + "/frontend_src/loginPage.js"
  },
  output: {
    path: __dirname + "/vstutils/static/bundle",
    filename: "[name].js",
    publicPath: "/static/bundle/",
    library: "vstutilsLibs",
    libraryTarget: "var"
  },
  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new CleanWebpackPlugin()
  ],
  resolve: {
    alias: {
      vue$: "vue/dist/vue.esm.js",
      jquery: require.resolve("jquery")
    },
    extensions: [".tsx", ".ts", ".js", ".vue"]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
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
      }
    ]
  },
  optimization: {
    splitChunks: {
      chunks: "all"
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true
      }),
      new BabelMinifyPlugin(),
      new OptimizeCSSAssetsPlugin()
    ]
  }
};

if (enableAnalyzer) {
  config.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = config;
