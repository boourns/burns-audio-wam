const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// default settings for building
let cssLoaders = [ 
  { 
    loader: "style-loader",
    options: {
      injectType: "lazyStyleTag",
      // Do not forget that this code will be used in the browser and
      // not all browsers support latest ECMA features like `let`, `const`, `arrow function expression` and etc,
      // we recommend use only ECMA 5 features,
      // but it is depends what browsers you want to support
      insert: function insertIntoTarget(element, options) {
        var parent = options.target || document.head;

        parent.appendChild(element);
      },
    },
  },  // to inject the result into the DOM as a style block
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
        test: /\.(sa|sc|c)ss$/,
        use: cssLoaders,
        exclude: /node_modules/,
      },
      { // for monaco (with /node_modules/)
        test: /\.(sa|sc|c)ss$/,
        use: ['style-loader', 'css-loader'],
        exclude: /src\/plugins\//
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