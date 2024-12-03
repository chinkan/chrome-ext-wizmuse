// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import postcss from 'rollup-plugin-postcss';
import livereload from 'rollup-plugin-livereload';

const production = !process.env.ROLLUP_WATCH;

// Common plugins used across all bundles
const commonPlugins = [
  resolve({
    browser: true,
    preferBuiltins: false,
  }),
  commonjs(),
  json(),
  production && terser(),
].filter(Boolean);

// Function to convert path to valid JS identifier
const pathToIdentifier = (path) => {
  return path
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/^[0-9]/, '_$&')       // Ensure doesn't start with number
    .replace(/^pages_/, 'page_');    // Make pages prefix shorter
};

// Mapping of HTML files to their corresponding JS files
const pages = [
  { html: 'popup', js: 'popup', css: 'popup' },
  { html: 'options', js: 'options', css: 'options' },
  { html: 'pages/about-us', js: 'pages/about-us', css: 'pages/about-us' },
  { html: 'pages/domains', js: 'pages/domains', css: 'pages/domains' },
  { html: 'pages/history', js: 'pages/history', css: 'pages/history' },
  { html: 'pages/options', js: 'pages/options', css: 'pages/options' },
  { html: 'pages/prompts', js: 'pages/prompts', css: 'pages/prompts' },
  { html: 'pages/settings', js: 'pages/settings', css: 'pages/settings' },
  { html: 'sidepanel', js: 'sidepanel', css: 'sidepanel' },
];

// Create configurations for all pages
const createPageConfig = ({ html, js, css }) => ({
  input: `src/${js}.js`,
  output: {
    file: `dist/${js}.js`,
    format: 'iife',
    name: pathToIdentifier(js),
    extend: true,
    sourcemap: !production,
  },
  plugins: [
    ...commonPlugins,
    // Copy HTML file for this page
    postcss({
      include: `src/${css}.css`,
      extract: resolve(`dist/${css}.css`),
      minimize: production,
      sourceMap: !production,
      modules: false,
      inject: false,
    }),
    copy({
      targets: [
        {
          src: `src/${html}.html`,
          dest: `dist/${html.split('/')[0] === 'pages' ? 'pages' : ''}`,
        }
      ],
      hook: 'writeBundle',
    }),
    !production && livereload({
      watch: 'dist',
      verbose: true,
    }),
  ].filter(Boolean),
  watch: {
    clearScreen: false,
    include: ['src/**'],
  },
});

// Create configuration for static assets
const createCopyConfig = () => ({
  input: 'src/background.js',
  output: {
    file: 'dist/background.js',
    sourcemap: !production,
  },
  plugins: [
    ...commonPlugins,
    copy({
      targets: [
        // Copy manifest and images
        { src: 'public/manifest.json', dest: 'dist' },
        { src: 'public/images/*', dest: 'dist/images' },
        { src: 'public/_locales/**/*', dest: 'dist/_locales' },
        // Copy drawdown library
        { src: 'lib/drawdown/**/*', dest: 'dist/lib/drawdown' },
      ],
      hook: 'writeBundle',
    }),
  ],
  watch: {
    clearScreen: false,
    include: ['public/**'],
  },
});

// Configuration for background and content scripts
const scriptConfigs = [
  {
    input: 'src/background.js',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      name: 'background',
      sourcemap: !production,
    },
    plugins: commonPlugins,
    watch: {
      clearScreen: false,
      include: ['src/**'],
    },
  },
  {
    input: 'src/content.js',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      name: 'content',
      sourcemap: !production,
    },
    plugins: commonPlugins,
    watch: {
      clearScreen: false,
      include: ['src/**'],
    },
  },
];

// Combine all configurations
const configs = [
  ...pages.map(createPageConfig),
  ...scriptConfigs,
  createCopyConfig(),
];

export default configs;