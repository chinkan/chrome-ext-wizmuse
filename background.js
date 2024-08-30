import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';
import PromptFactory from './prompt-providers/prompt-factory.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    if (request.action === 'summarize') {
        chrome.storage.sync.get(
            ['llmConfigs', 'selectedLLMIndex', 'language'],
            async (result) => {
                try {
                    if (
                        !result.llmConfigs ||
                        !result.selectedLLMIndex ||
                        !result.language
                    ) {
                        throw new Error(
                            'You have not set up your LLM provider and API key. Please go to the options page to set up your LLM provider and API key.'
                        );
                    }
                    const defaultConfig =
                        result.llmConfigs[result.selectedLLMIndex];
                    const provider = LLMProviderFactory.getProvider(
                        defaultConfig.provider,
                        defaultConfig
                    );
                    const prompts = PromptFactory.getPrompt(
                        'summarize',
                        request.text,
                        result.language
                    );
                    const summary = await provider.summarize(
                        prompts.userPrompt,
                        prompts.systemPrompt
                    );
                    if (summary && typeof summary.summary === 'string') {
                        handleResponse(summary, sendResponse);
                    } else {
                        throw new Error(
                            'Invalid summary format received from provider'
                        );
                    }
                } catch (error) {
                    console.error('Error in background script:', error);
                    handleError(error, sendResponse);
                }
            }
        );
        return true; // Indicates that the response is sent asynchronously
    }
});

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        chrome.runtime.openOptionsPage();
    }
});

function handleResponse(summary, sendResponse) {
    sendResponse({ summary: summary.summary });
}

function handleError(error, sendResponse) {
    console.error('Error in background script:', error);
    sendResponse({
        error: error.message || 'An unknown error occurred',
    });
}
