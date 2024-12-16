import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';
import PromptFactory from './prompt-providers/prompt-factory.js';
import { getStorageData, setStorageData } from './utils/storage.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        handleSummarize(request, sender, sendResponse);
        return true; // 表示我們會異步發送回應
    } else if (request.action === 'generateTags') {
        handleGenerateTags(request, sender, sendResponse);
        return true;
    }
});

async function handleSummarize(request, sender, sendResponse) {
    try {
        const result = await getStorageData([
            'llmConfigs',
            'selectedLLMIndex',
            'language',
        ]);

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
        const prompts = await PromptFactory.getPrompt(
            request.selectPromptIndex,
            request.text,
            result.language
        );

        const summary = await provider.summarize(prompts.userPrompt, prompts.systemPrompt, defaultConfig.advancedSettings);

        if (!summary || typeof summary.summary !== 'string') {
            throw new Error('Invalid summary response from provider');
        }

        sendResponse({
            summary: summary.summary,
            promptName: prompts.promptName,
            providerName: defaultConfig.name,
        });
    } catch (error) {
        console.error('Error in handleSummarize:', error);
        sendResponse({ error: error.message });
    }
}

async function handleGenerateTags(request, sender, sendResponse) {
    try {
        const result = await getStorageData([
            'llmConfigs',
            'selectedLLMIndex',
            'language',
        ]);

        if (!result.llmConfigs || !result.selectedLLMIndex || !result.language) {
            throw new Error(
                'You have not set up your LLM provider and API key. Please go to the options page to set up your LLM provider and API key.'
            );
        }

        const defaultConfig = result.llmConfigs[request.selectedIndex || result.selectedLLMIndex];
        const provider = LLMProviderFactory.getProvider(
            defaultConfig.provider,
            defaultConfig
        );

        // Custom system prompt for tag generation with user's language
        const systemPrompt = `You are a helpful assistant that generates relevant tags for content. Generate 3-5 concise, relevant tags in ${result.language}. Each tag should be a single word or short phrase. Separate tags with commas. For Example: AI,News,Technology.`;
        const userPrompt = `Generate tags in ${result.language} for this content:\n${request.text}`;

        const response = await provider.summarize(userPrompt, systemPrompt, defaultConfig.advancedSettings);

        if (!response || typeof response.summary !== 'string') {
            throw new Error('Invalid response from provider');
        }

        sendResponse({
            tags: response.summary.split(',').map(tag => tag.trim()).filter(tag => tag),
            providerName: defaultConfig.name,
        });
    } catch (error) {
        console.error('Error in handleGenerateTags:', error);
        sendResponse({ error: error.message });
    }
}

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
    }
    // Check if side panel is supported
    if (chrome.sidePanel) {
        // Side panel is supported, set it up
        chrome.sidePanel.setOptions({
            enabled: true,
            path: 'sidepanel.html'
        });
    }
    if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
        var manifestData = chrome.runtime.getManifest();
        getStorageData(['lastVersion']).then((result) => {
            if (
                result.lastVersion === undefined ||
                result.lastVersion < manifestData.version
            ) {
                // 更新版本

                if (
                    result.lastVersion &&
                    result.lastVersion.localeCompare('0.5.0', undefined, {
                        numeric: true,
                        sensitivity: 'base',
                    }) < 0
                ) {
                    //load all configs and add advanced settings
                    getStorageData(['llmConfigs']).then((result) => {
                        result.llmConfigs.forEach((config) => {
                            config.advancedSettings = {
                                maxTokens: 1024,
                                temperature: 0.7,
                                topP: 0.9,
                                topK: 5,
                            };
                        });
                        setStorageData({ llmConfigs: result.llmConfigs });
                    });
                }

                setStorageData({ lastVersion: manifestData.version });
            }
        });
    }
});

// Handle browser action click
chrome.action.onClicked.addListener((tab) => {
    // If side panel is supported, toggle it
    if (chrome.sidePanel) {
        chrome.sidePanel.toggle();
    }
});
