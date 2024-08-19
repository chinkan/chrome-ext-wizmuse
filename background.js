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
                    sendResponse({ summary });
                } catch (error) {
                    console.error('Error in background script:', error);
                    sendResponse({ error: error.message });
                }
            }
        );
        return true; // Indicates that the response is sent asynchronously
    }
});
