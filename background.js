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

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log('chrome onUpdated', tabId, changeInfo, tab);
    if (changeInfo.status === 'complete' && tab.url) {
        chrome.sidePanel.setOptions({
            tabId,
            path: 'sidepanel.html',
            enabled: true,
        });
    } else {
        chrome.sidePanel.setOptions({
            tabId,
            path: 'sidepanel.html',
            enabled: false,
        });
    }
});
