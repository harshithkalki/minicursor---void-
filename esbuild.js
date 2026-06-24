const esbuild = require('esbuild')

async function build() {

await esbuild.build({
  entryPoints: ['webview-ui/main.tsx'],
  bundle: true,
  platform: 'browser',
  target: ['es2020'],
  format:"iife",
  outfile: 'out/webview.js',
  external: ['vscode'],
  loader: { '.tsx': 'tsx' },

})

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format:"cjs",
  outfile: 'out/extension.js',
  external: ['vscode'],
})


}

build()