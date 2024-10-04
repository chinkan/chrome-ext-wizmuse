import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';
import PromptFactory from './prompt-providers/prompt-factory.js';
import { getStorageData, setStorageData } from './utils/storage.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

        const summary = await provider.summarize(
            prompts.userPrompt,
            prompts.systemPrompt,
            defaultConfig.advancedSettings // 傳遞高級設置
        );

        if (summary && typeof summary.summary === 'string') {
            sendResponse({
                summary: summary.summary,
                promptName: prompts.promptName,
                providerName: defaultConfig.name,
            });
        } else {
            throw new Error('Invalid summary format received from provider');
        }
    } catch (error) {
        console.error('Error in background script:', error);
        sendResponse({ error: error.message || 'An unknown error occurred' });
    }
}

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
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
