import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
    input: './src/gis.js',
    output: [
      {
        format: 'esm',
        file: './bundle/gis.js'
      },
    ],
    plugins: [
      nodeResolve(),
    ]
  },
  {
    input: './src/viewer.js',
    output: [
      {
        format: 'esm',
        file: './bundle/viewer.js'
      },
    ],
    plugins: [
      nodeResolve(),
    ]
  }
];