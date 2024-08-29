import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';
import PromptFactory from './prompt-providers/prompt-factory.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    if (request.action === 'summarize') {
        chrome.storage.sync.get(
            ['llmProvider', 'llmConfig'],
            async (result) => {
                try {
                    const provider = LLMProviderFactory.getProvider(
                        result.llmProvider,
                        result.llmConfig
                    );
                    const prompts = PromptFactory.getPrompt(
                        'summarize',
                        request.text
                    );
                    const summary = await provider.summarize(
                        prompts.userPrompt,
                        prompts.systemPrompt
                    );
                    if (summary && typeof summary.summary === 'string') {
                        sendResponse({ summary });
                    } else {
                        throw new Error(
                            'Invalid summary format received from provider'
                        );
                    }
                } catch (error) {
                    console.error('Error in background script:', error);
                    sendResponse({
                        error: error.message || 'An unknown error occurred',
                    });
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
