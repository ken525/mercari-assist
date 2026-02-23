const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    target: 'web',
    entry: {
      'content/content': './src/content/content.ts',
      'background/background': './src/background/background.ts',
      popup: './src/popup/Popup.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    devtool: isProduction ? false : 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                // content.cssは常に分離して出力
                emit: true,
              },
            },
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer'),
                  ],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'icons/[name][ext]',
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup/popup.html',
        chunks: ['popup'],
        inject: 'body',
      }),
      new MiniCssExtractPlugin({
        filename: (pathData) => {
          const chunkName = pathData.chunk?.name || '';
          // content.cssはcontentディレクトリに出力
          if (chunkName === 'content/content') {
            return 'content/content.css';
          }
          // popupのCSSはpopupディレクトリに出力
          if (chunkName === 'popup') {
            return 'popup/popup.css';
          }
          return isProduction ? '[name].[contenthash].css' : '[name].css';
        },
        chunkFilename: isProduction ? '[id].[contenthash].css' : '[id].css',
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { 
            from: 'public/icons/icons', 
            to: 'icons', 
            noErrorOnMissing: true,
            globOptions: {
              ignore: ['**/ICONS_README.md', '**/.gitkeep'],
            },
          },
        ],
      }),
    ],
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // ReactとReactDOMを分離
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          // その他のnode_modules
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
  };
};
