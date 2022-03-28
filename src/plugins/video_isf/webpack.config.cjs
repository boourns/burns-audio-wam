const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const wamNode = {
  entry: {
    app: {
      import: './src/index.tsx',
      filename: 'index.js'
    },
  },
  module: {
    rules: [
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
      publicPath: 'auto',
      libraryTarget: 'module',
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

const processor = {
  entry: {
    processor: {
      import: './src/ISFVideoProcessor.ts',
      filename: 'ISFVideoProcessor.js'
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  mode: "development",
  devtool: false,
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: 'auto',
  }
};

module.exports = [wamNode, monaco, processor]