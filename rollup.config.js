const babel = require('rollup-plugin-babel');
const resolve = require("rollup-plugin-node-resolve");

export default {
  input: 'src/index.js',
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers'],
      externalHelpers: true
    })
  ],
  output: [{
    file: 'dist/index.js',
    name:'SongPackage',
    format: 'umd'
  },{
    file: 'dist/index.es.js',
    format: 'es'
  },{
    file: 'dist/index.amd.js',
    format: 'amd'
  },{
    file: 'dist/index.cjs.js',
    format: 'cjs'
  }]
};
