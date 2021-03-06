module.exports = {
  entry: {
    build: './src/snakeParser.js',
  },
  output: {
    path: __dirname + "/dist",
    filename: "snakeParser.js",
    library: 'snakeparser',
    libraryTarget: 'commonjs2',
  },
  optimization: {
    minimize: false,
  },
  module: {
  },
};
