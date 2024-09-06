import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';
import PromptFactory from './prompt-providers/prompt-factory.js';
import { getStorageData } from './utils/storage.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    if (request.action === 'summarize') {
        handleSummarize(request, sendResponse);
        return true; // 表示我們會異步發送回應
    }
});

async function handleSummarize(request, sendResponse) {
    try {
        const result = await getStorageData([
            'llmConfigs',
            'selectedLLMIndex',
            'language',
        ]);
        console.log('Background script received message:', result);

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
            result.llmConfigs[request.selectedIndex || result.selectedLLMIndex];
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
        console.log('summary', summary);

        if (summary && typeof summary.summary === 'string') {
            sendResponse({ summary: summary.summary });
        } else {
            throw new Error('Invalid summary format received from provider');
        }
    } catch (error) {
        console.error('Error in background script:', error);
        sendResponse({ error: error.message || 'An unknown error occurred' });
    }
}

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        chrome.runtime.openOptionsPage();
    }
});
