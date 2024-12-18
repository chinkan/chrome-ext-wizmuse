# WizMuse

[![Pack Chrome Extension](https://github.com/chinkan/chrome-ext-wizmuse/actions/workflows/github-actions-pack.yml/badge.svg?branch=main)](https://github.com/chinkan/chrome-ext-wizmuse/actions/workflows/github-actions-pack.yml)

## Project Overview

WizMuse is a browser extension that allows users to summarize web pages using various large language model (LLM) providers. The extension provides a user-friendly interface to extract key points and generate concise summaries of the content on any webpage.

![WizMuse](/public/images/WizMuse1_s.jpg)

## Features

-   Summarize web pages with various LLM providers.
-   Summarize YouTube video transcripts automatically.
-   Customize the summary process with different models and prompts.
-   Copy the summary to the clipboard.
-   Open the options page to manage models and prompts.

## Installation

### Chrome Extension (Chrome Web Store)

Download the latest version from the [Chrome Web Store](https://chromewebstore.google.com/detail/wizmuse/pkkbpmbapimdajbpfdccdaifnedeknlo?authuser=0&hl=zh-TW).

### Local Development

1. Clone the repository:
    ```bash
    git clone https://github.com/chinkan/chrome-ext-wizmuse.git
    ```
2. Change directory to the project folder:
    ```bash
    cd chrome-ext-wizmuse
    ```
3. Clone the drawdown repository into the `lib` directory:
    ```bash
    git clone https://github.com/adamvleggett/drawdown.git lib/drawdown
    ```
4. Open Chrome and go to `chrome://extensions/`.
5. Enable "Developer mode" in the top right corner.
6. Click on "Load unpacked" and select the project directory.

## Usage

1. Go to any webpage.
2. Click on the WizMuse icon in the Chrome toolbar.
3. The summary will be displayed in the extension popup. Simple as that! 😊

## Contribute

We welcome contributions! To contribute to the project:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push to your branch and create a pull request.

Thanks for your contribution!

## TODO

- [x] Implement the summarization functionality for the OpenAI provider.
- [x] Implement the summarization functionality for the Anthropic provider.
- [x] Implement the summarization functionality for the Groq provider.
- [x] Implement the summarization functionality for the Ollama provider.
- [x] Implement custom prompt
- [x] Implement copy to clipboard
- [x] Add YouTube video transcript summarization support
- [ ] Implement the share to society functionality
- [ ] Implement the Add to Notion functionality
- [ ] Improve error handling and user feedback.
- [ ] Enhance the UI for better user experience.
- [ ] Add support for more LLM providers
- [ ] Implement custom prompt templates
- [ ] Add support for more languages
-   And more...

## License

This project is licensed under the GNU General Public License (GPL). You can freely use, modify, and distribute this software as long as you adhere to the terms of the GPL.

## Build System

This project uses Rollup as its build system. The build process is configured to handle multiple entry points, optimize assets, and prepare the extension for production.

### Build Scripts

```bash
npm run dev    # Start development with watch mode
npm run build  # Build for production
npm run clean  # Clean the dist directory
```

### Key Features

- Multiple entry point bundling for popup, options, sidepanel, and other pages
- CSS processing with PostCSS and autoprefixer
- Code minification in production mode
- Asset copying and management
- Source maps in development mode
- Live reload during development

## Copyright

Copyright (c) 2024 chinkan.ai

## Acknowledgments

- [youtube-transcript](https://github.com/Kakulukian/youtube-transcript) - For providing the YouTube transcript extraction functionality.
- [Adamvleggett](https://github.com/adamvleggett) for his [drawdown](https://github.com/adamvleggett/drawdown) library.
- [Easy Markdown Editor](https://github.com/Ionaru/easy-markdown-editor) - For the markdown editor functionality.
