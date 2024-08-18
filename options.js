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

    providerSelect.addEventListener('change', function () {
        const selectedProvider = this.value;
        ollamaNotification.style.display =
            selectedProvider === 'ollama' ? 'block' : 'none';
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
                    option.value = model.value; // Assuming model has an 'id' property
                    option.textContent = model.name; // Adjust as necessary for display
                    modelSelect.appendChild(option);
                });
            })
            .catch((error) => {
                console.error('Error loading models:', error);
                modelSelect.innerHTML =
                    '<option value="">Error loading models</option>';
            });
    }
});
