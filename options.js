import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('options-form');
    const providerSelect = document.getElementById('llm-provider');
    const apiKeyInput = document.getElementById('api-key');
    const endpointInput = document.getElementById('endpoint');
    const modelSelect = document.getElementById('model');
    const ollamaNotification = document.getElementById('ollama-notification');

    // Load saved settings
    chrome.storage.sync.get(['llmProvider', 'llmConfig'], function (result) {
        if (result.llmProvider) {
            providerSelect.value = result.llmProvider;
            apiKeyInput.value = result.llmConfig.apiKey || '';
            endpointInput.value = result.llmConfig.endpoint || '';
            loadModels(result.llmProvider, result.llmConfig);
        }
    });

    chrome.storage.sync.get(['isFirstInstall'], function (result) {
        if (result.isFirstInstall === undefined) {
            // 這是首次安裝
            chrome.storage.sync.set(
                { isFirstInstall: false, llmProvider: 'openai', llmConfig: {} },
                function () {
                    console.log('已設置首次安裝標誌和默認值');
                }
            );
            // 可以在這裡添加一些歡迎信息或指導
            alert(
                '歡迎使用 Website Summarizer！請先設置您的 LLM 提供商和 API 密鑰。'
            );
        }
    });

    providerSelect.addEventListener('change', function () {
        const selectedProvider = this.value;
        ollamaNotification.style.display =
            selectedProvider === 'ollama' ? 'block' : 'none';

        // Get the instance of the selected provider
        const config = {
            apiKey: apiKeyInput.value,
            endpoint: endpointInput.value,
            model: modelSelect.value,
        };
        const providerInstance = LLMProviderFactory.getProvider(
            selectedProvider,
            config
        );

        // Update the endpoint to the default endpoint
        endpointInput.value = providerInstance.getDefaultEndpoint();

        loadModels(selectedProvider);
    });

    apiKeyInput.addEventListener('input', function () {
        loadModels(providerSelect.value);
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const provider = providerSelect.value;
        const config = {
            apiKey: apiKeyInput.value,
            endpoint: endpointInput.value,
            model: modelSelect.value,
        };
        chrome.storage.sync.set(
            { llmProvider: provider, llmConfig: config },
            function () {
                alert('Settings saved');
            }
        );
    });

    function loadModels(provider, savedConfig = {}) {
        const config = {
            apiKey: apiKeyInput.value,
            endpoint: endpointInput.value,
            model: savedConfig.model || '',
        };

        const providerInstance = LLMProviderFactory.getProvider(
            provider,
            config
        );
        providerInstance
            .getModelLists()
            .then((models) => {
                modelSelect.innerHTML = '';
                models.forEach((model) => {
                    const option = document.createElement('option');
                    option.value = model.value;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });

                // 設置之前選擇的模型
                if (savedConfig.model) {
                    modelSelect.value = savedConfig.model;
                }
            })
            .catch((error) => {
                console.error('Error loading models:', error);
                modelSelect.innerHTML =
                    '<option value="">Error loading models</option>';
            });
    }
});
