import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';
import path from 'path';

// Parse tsconfig to get path aliases
const tsConfigPath = path.resolve('./tsconfig.json');
const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf8'));
const pathsFromTsConfig = tsConfig.compilerOptions.paths || {};

// Convert TypeScript paths to Rollup aliases
const createAliases = () => {
  const aliases = [];
  const baseUrl = path.resolve(tsConfig.compilerOptions.baseUrl || './src');

  for (const [alias, paths] of Object.entries(pathsFromTsConfig)) {
    // Skip if no paths defined for this alias
    if (!paths || !paths.length) continue;

    // Handle both "~/*" and "~/" formats
    const aliasKey = alias.replace(/\/\*$/, '');
    const targetPath = paths[0].replace(/\/\*$/, '');
    
    aliases.push({
      find: new RegExp(`^${aliasKey}`),
      replacement: path.resolve(baseUrl, targetPath)
    });
  }
  
  return aliases;
};

// Configuration for external dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  '@mrgnlabs/mrgn-common',  // Ensure workspace dependencies are external
];

export default defineConfig([
  // JavaScript bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: pkg.module || 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      alias({
        entries: createAliases(),
      }),
      json(),
      resolve({ 
        extensions: ['.ts', '.js', '.json'],
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: tsConfigPath,
        sourceMap: true,
        declaration: false, // We'll generate declaration files separately
      }),
    ],
  },
  // TypeScript declaration files bundle
  {
    input: 'src/index.ts',
    output: {
      file: pkg.types,
      format: 'es',
    },
    external,
    plugins: [
      alias({
        entries: createAliases(),
      }),
      dts(),
    ],
  },
]);
