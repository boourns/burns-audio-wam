const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// default settings for building
let cssLoaders = [ 
  { loader: "css-modules-typescript-loader"},  // to generate a .d.ts module next to the .scss file (also requires a declaration.d.ts with "declare modules '*.scss';" in it to tell TypeScript that "import styles from './styles.scss';" means to load the module "./styles.scss.d.td")
  { loader: "css-loader", options: { modules: true } },  // to convert the resulting CSS to Javascript to be bundled (modules:true to rename CSS classes in output to cryptic identifiers, except if wrapped in a :global(...) pseudo class)
  { loader: "sass-loader" },  // to convert SASS to CSS
  // NOTE: The first build after adding/removing/renaming CSS classes fails, since the newly generated .d.ts typescript module is picked up only later
] 

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
        test: /\.txt$/,
        use: 'raw-loader'
      },
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
        test: /\.module\.(sa|sc|c)ss$/,
        use: cssLoaders,
        exclude: /node_modules/,
      },
      { // for loading the compiled monaco css into shadow dom
        test: /\.main\.css$/,
        use: ['css-modules-typescript-loader', 'css-loader'],
        exclude: /node_modules/,
      },
      { // for monaco building, it includes it's CSS which we drop on the floor
        test: /\.css$/,
        use: ['css-loader'],
        exclude: /src\/plugins\//,
      }
    ],
  },
  mode: "development",
  resolve: {
    extensions: [ '.tsx', '.ts', '.js', ".css", ".scss", ".txt" ],
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
        use: ['css-loader']
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
      import: './src/FunctionSeqProcessor.ts',
      filename: 'FunctionSeqProcessor.js'
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

module.exports = [WAMPlugin, monaco, processor];