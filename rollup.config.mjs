import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

const copyPlugin = copy({
    targets: [
        {
            src: 'manifest.json',
            dest: 'dist',
        },
        {
            src: [
                'popup.html',
                'popup.css',
                'options.html',
                'options.css',
                'pages/*.html',
            ],
            dest: 'dist',
        },
        {
            src: 'images/*',
            dest: 'dist/images',
        },
        {
            src: 'lib/**/*',
            dest: 'dist/lib',
        },
    ],
});

const commonPlugins = [
    nodeResolve({
        browser: true,
    }),
    commonjs(),
];

export default [
    {
        input: 'content.js',
        output: {
            file: 'dist/content.js',
            format: 'iife',
            name: 'content',
        },
        plugins: commonPlugins,
    },
    {
        input: 'popup.js',
        output: {
            file: 'dist/popup.js',
            format: 'iife',
            name: 'popup',
        },
        plugins: commonPlugins,
    },
    {
        input: 'background.js',
        output: {
            file: 'dist/background.js',
            format: 'iife',
            name: 'background',
        },
        plugins: commonPlugins,
    },
    {
        input: 'options.js',
        output: {
            file: 'dist/options.js',
            format: 'iife',
            name: 'options',
        },
        plugins: commonPlugins,
    },
    {
        input: 'utils/content-extractor.js',
        output: {
            dir: 'dist/utils',
            format: 'iife',
            name: 'contentExtractor',
        },
        plugins: [...commonPlugins, copyPlugin],
    },
    {
        input: 'pages/about-us.js',
        output: {
            dir: 'dist/pages',
            format: 'iife',
            name: 'aboutUs',
        },
        plugins: commonPlugins,
    },
    {
        input: 'pages/domains.js',
        output: {
            dir: 'dist/pages',
            format: 'iife',
            name: 'domains',
        },
        plugins: commonPlugins,
    },
    {
        input: 'pages/history.js',
        output: {
            dir: 'dist/pages',
            format: 'iife',
            name: 'history',
        },
        plugins: commonPlugins,
    },
    {
        input: 'pages/options.js',
        output: {
            dir: 'dist/pages',
            format: 'iife',
            name: 'optionsPage',
        },
        plugins: commonPlugins,
    },
    {
        input: 'pages/prompts.js',
        output: {
            dir: 'dist/pages',
            format: 'iife',
            name: 'prompts',
        },
        plugins: commonPlugins,
    },
];
