// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import postcss from 'rollup-plugin-postcss';

const production = !process.env.ROLLUP_WATCH;

// Common plugins used across all bundles
const commonPlugins = [
  resolve({
    browser: true,
    preferBuiltins: false,
  }),
  commonjs(),
  json(),
  postcss({
    extract: true,
    minimize: production,
  }),
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
  { html: 'popup', js: 'popup' },
  { html: 'options', js: 'options' },
  { html: 'pages/about-us', js: 'pages/about-us' },
  { html: 'pages/domains', js: 'pages/domains' },
  { html: 'pages/history', js: 'pages/history' },
  { html: 'pages/options', js: 'pages/options' },
  { html: 'pages/prompts', js: 'pages/prompts' },
  { html: 'sidepanel', js: 'sidepanel' },
];

// Create configurations for all pages
const createPageConfig = ({ html, js }) => ({
  input: `src/${js}.js`,
  output: {
    file: `dist/${js}.js`,
    format: 'iife',
    name: pathToIdentifier(js),
    extend: true, // Add this to support more flexible names
  },
  plugins: [
    ...commonPlugins,
    // Copy HTML file for this specific page
    copy({
      targets: [
        {
          src: `src/${html}.html`,
          dest: `dist/${html.split('/')[0] === 'pages' ? 'pages' : ''}`,
        },
      ],
    }),
  ],
});

// Configuration for background and content scripts
const scriptConfigs = [
  {
    input: 'src/background.js',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      name: 'background',
    },
    plugins: commonPlugins,
  },
  {
    input: 'src/content.js',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      name: 'content',
    },
    plugins: commonPlugins,
  },
];

// Create configuration for static assets
const createCopyConfig = () => ({
  input: 'src/background.js',
  output: {
    file: 'dist/background.js',
  },
  plugins: [
    copy({
      targets: [
        // Copy manifest and images
        { src: 'public/manifest.json', dest: 'dist' },
        { src: 'public/images/*', dest: 'dist/images' },
        
        // Copy CSS files
        { src: 'src/*.css', dest: 'dist' },
        
        // Copy lib directory
        { src: 'src/lib/**/*', dest: 'dist/lib' },
      ],
    }),
  ],
});

// Combine all configurations
const configs = [
  ...pages.map(createPageConfig),
  ...scriptConfigs,
  createCopyConfig(),
];

export default configs;