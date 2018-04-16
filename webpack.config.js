const path = require('path');

module.exports = {
  watch: true,
  entry: './index.js',
  mode: 'development',
  devtool: 'cheap-module-eval-source-map',
  output: {
    path: path.resolve(__dirname),
    filename: 'bundle.js'
  },
  watchOptions: {
    ignored: /node_modules/
  }
};