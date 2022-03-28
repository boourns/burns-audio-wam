const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const WAMPlugin = {
  entry: {
    app: {
      import: './src/index.tsx',
      filename: 'index.js'
    }
  },
  module: {
    rules: [
      {
        test: /\.worklet\.(ts|js)$/,
        use: [{
          loader: 'worklet-loader',
          options: {
            name: '[fullhash].worklet.js'
          }
        }],
        exclude: /node_modules/
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: ['style-loader', 'css-loader'],
      },
      
    ],
  },
  mode: "development",
  resolve: {
    extensions: [ '.tsx', '.ts', '.js', ".css", ".scss" ],
  },
  experiments: {
    outputModule: true
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    libraryTarget: 'module',
    publicPath: 'auto',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: `./src/descriptor.json`, to: './' },
      ]
    }),
  ]
};

const monaco = {
  mode: 'development',
  entry: {
    'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
    'json.worker': 'monaco-editor/esm/vs/language/json/json.worker',
    'css.worker': 'monaco-editor/esm/vs/language/css/css.worker',
    'html.worker': 'monaco-editor/esm/vs/language/html/html.worker',
    'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker'
  },
  output: {
    globalObject: 'self',
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist/monaco')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      }
    ]
  }
};

module.exports = [WAMPlugin, monaco];