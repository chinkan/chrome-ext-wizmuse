# WizMuse

## Project Overview

WizMuse is a browser extension that allows users to summarize web pages using various large language model (LLM) providers. The extension provides a user-friendly interface to extract key points and generate concise summaries of the content on any webpage.

## Installation

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

## Contribute

We welcome contributions! To contribute to the project:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push to your branch and create a pull request.

## TODO

-   [x] Implement the summarization functionality for the OpenAI provider.
-   [x] Implement the summarization functionality for the Anthropic provider.
-   [x] Implement the summarization functionality for the Groq provider.
-   [x] Implement the summarization functionality for the Ollama provider.
-   [ ] Implement the share to society functionality
-   [ ] Implement the Add to Notion functionality
-   [ ] Improve error handling and user feedback.
-   [ ] Enhance the UI for better user experience.
-   And more...

## License

This project is licensed under the GNU General Public License (GPL). You can freely use, modify, and distribute this software as long as you adhere to the terms of the GPL.

## Copyright

Copyright (c) 2024 chinkan.ai
