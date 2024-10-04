// Options Page
import LLMProviderFactory from '../prompt-providers/llm-provider-factory.js';
import {
    getStorageData,
    setStorageData,
    removeStorageData,
} from '../utils/storage.js';

export async function options() {
    try {
        const response = await fetch('pages/options.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const optionsHtml = await response.text();
        return optionsHtml;
    } catch (error) {
        console.error('加載 options.html 時出錯:', error);
        return '<p>加載選項頁面時出錯</p>';
    }
}

export function initializeOptionsPage() {
    // 常量定義區域
    const elements = {
        form: document.getElementById('options-form'),
        table: document
            .getElementById('llm-configs-table')
            .getElementsByTagName('tbody')[0],
        defaultSelect: document.getElementById('default-llm-config'),
        endpointDisplay: document.getElementById('endpoint-display'),
        endpointInput: document.getElementById('endpoint'),
        apiKeyInput: document.getElementById('api-key'),
        modelSelect: document.getElementById('model'),
        saveDefaultButton: document.getElementById('save-default'),
        addConfigBtn: document.getElementById('add-config-btn'),
        cancelFormBtn: document.getElementById('cancel-form'),
        optionsContainer: document.getElementById('options-container'),
        llmProviderGrid: document.getElementById('llm-provider-grid'),
        languageSelect: document.getElementById('language'),
        apiKeyContainer: document.getElementById('api-key-container'),
        openaiEndpointContainer: document.getElementById(
            'openai-endpoint-container'
        ),
        openaiEndpointToggle: document.getElementById('openai-endpoint-toggle'),
        configName: document.getElementById('config-name'),
        toggleAdvancedSettings: document.getElementById(
            'toggle-advanced-settings'
        ),
        advancedSettingsContainer: document.getElementById(
            'advanced-settings-container'
        ),
    };

    // 檢查元素是否存在
    if (Object.values(elements).some((element) => !element)) {
        console.error('選項頁面中缺少某些元素');
        return;
    }

    // 狀態變量
    let isEditing = false;
    let editingIndex = -1;

    // 初始化
    loadConfigs();

    // 事件處理程序區域
    elements.llmProviderGrid.addEventListener('change', handleProviderChange);
    elements.apiKeyInput.addEventListener('input', loadModels);
    elements.endpointInput.addEventListener('input', loadModels);
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.table.addEventListener('click', handleTableClick);
    elements.addConfigBtn.addEventListener('click', showAddConfigForm);
    elements.cancelFormBtn.addEventListener('click', hideConfigForm);
    elements.saveDefaultButton.addEventListener('click', saveDefaultConfig);
    elements.toggleAdvancedSettings.addEventListener(
        'click',
        toggleAdvancedSettings
    );

    // 私有函數區域
    function loadConfigs() {
        getStorageData(['llmConfigs', 'selectedLLMIndex', 'language']).then(
            (result) => {
                if (result.llmConfigs) {
                    result.llmConfigs.forEach((config, index) =>
                        addConfigToTable(config, index)
                    );
                }
                if (result.selectedLLMIndex) {
                    elements.defaultSelect.value = result.selectedLLMIndex;
                }
                if (result.language) {
                    elements.languageSelect.value = result.language;
                }
            }
        );
    }

    function handleProviderChange(e) {
        if (e.target.type === 'radio') {
            elements.endpointInput.value =
                LLMProviderFactory.getDefaultEndpoint(e.target.value);
            elements.endpointDisplay.textContent = elements.endpointInput.value;
            loadModels();
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const name = elements.configName.value;
        const provider = document.querySelector(
            'input[name="llm-provider"]:checked'
        ).value;
        const apiKey = elements.apiKeyInput.value;
        const model = elements.modelSelect.value;
        const endpoint = elements.endpointInput.value;
        const advancedSettings = getAdvancedSettings();

        const config = {
            name,
            provider,
            apiKey,
            model,
            endpoint,
            advancedSettings,
        };

        if (isEditing) {
            updateConfigInTable(config, editingIndex);
        } else {
            addConfigToTable(config);
        }

        elements.form.reset();
        elements.optionsContainer.style.display = 'none';
        elements.addConfigBtn.style.display = 'block';
        isEditing = false;
        editingIndex = -1;
        await loadModels();
    }

    function handleTableClick(e) {
        const row = e.target.closest('tr');
        if (!row) return;

        const index = row.rowIndex - 1;
        const deleteBtn = e.target.closest('.delete-btn');

        if (deleteBtn) {
            deleteConfig(index);
        } else {
            editConfig(index);
        }
    }

    function showAddConfigForm() {
        elements.optionsContainer.style.display = 'flex';
        elements.addConfigBtn.style.display = 'none';
        isEditing = false;
        editingIndex = -1;
    }

    function hideConfigForm() {
        elements.optionsContainer.style.display = 'none';
        elements.addConfigBtn.style.display = 'block';
        elements.form.reset();
        isEditing = false;
        editingIndex = -1;
    }

    async function saveDefaultConfig() {
        const defaultConfig = elements.defaultSelect.value;
        const language = document.getElementById('language').value;
        await setStorageData({
            selectedLLMIndex: defaultConfig,
            language: language,
        });
        alert('Config Saved');
    }

    async function loadModels() {
        const provider = document.querySelector(
            'input[name="llm-provider"]:checked'
        );
        if (!provider) {
            console.error('No LLM provider selected');
            return;
        }

        const providerValue = provider.value;
        const apiKey = elements.apiKeyInput.value;
        const model = elements.modelSelect.value;
        const endpointUrl = elements.endpointInput.value;
        const providerInstance = LLMProviderFactory.getProvider(providerValue, {
            apiKey: apiKey,
            model: model,
            endpoint: endpointUrl,
        });

        const ollamaWarning = document.getElementById('ollama-warning');

        if (providerValue.toLowerCase() === 'ollama') {
            elements.endpointInput.style.display = 'block';
            elements.apiKeyInput.style.display = 'none';
            elements.endpointDisplay.style.display = 'none';
            elements.apiKeyInput.removeAttribute('required');
            elements.apiKeyContainer.style.display = 'none';
            if (ollamaWarning) ollamaWarning.style.display = 'block';
            elements.openaiEndpointContainer.style.display = 'none';
        } else if (providerValue.toLowerCase() === 'openai') {
            elements.apiKeyInput.style.display = 'block';
            elements.endpointInput.style.display = elements.openaiEndpointToggle
                .checked
                ? 'block'
                : 'none';
            elements.endpointDisplay.style.display = elements
                .openaiEndpointToggle.checked
                ? 'none'
                : 'block';
            elements.apiKeyInput.setAttribute('required', '');
            elements.apiKeyContainer.style.display = 'block';
            if (ollamaWarning) ollamaWarning.style.display = 'none';
            elements.openaiEndpointContainer.style.display = 'block';
        } else {
            elements.endpointInput.style.display = 'none';
            elements.apiKeyInput.style.display = 'block';
            elements.endpointDisplay.style.display = 'block';
            elements.apiKeyInput.setAttribute('required', '');
            elements.apiKeyContainer.style.display = 'block';
            if (ollamaWarning) ollamaWarning.style.display = 'none';
            elements.openaiEndpointContainer.style.display = 'none';
        }

        if (providerValue !== 'ollama' && apiKey === '') {
            elements.modelSelect.innerHTML =
                '<option value="">Please enter your API key first</option>';
            return;
        }

        elements.modelSelect.innerHTML = '<option value="">Loading...</option>';

        try {
            const models = await providerInstance.getModelLists();
            models.sort((a, b) => a.name.localeCompare(b.name));
            elements.modelSelect.innerHTML =
                `<option value="">Select Model</option>` +
                models
                    .map(
                        (model) =>
                            `<option value="${model.value}">${model.name}</option>`
                    )
                    .join('');
        } catch (error) {
            console.error('Error loading models:', error);
            elements.modelSelect.innerHTML =
                '<option value="">Error loading models</option>';
        }
    }

    function addConfigToTable(config, index = null) {
        const row = elements.table.insertRow(index);
        row.innerHTML = `
            <td>${config.name}</td>
            <td>${config.provider}</td>
            <td>${maskApiKey(config.apiKey)}</td>
            <td>${config.model}</td>
            <td>${config.endpoint}</td>
            <td>
                <button class="delete-btn action-btn" data-index="${index}" title="Delete Config">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;

        index = index || elements.table.rows.length - 1;

        addToDefaultSelect(config.name, index);
        saveConfigs(config, index);
    }

    function updateConfigInTable(config, index) {
        const row = elements.table.rows[index];
        row.cells[0].textContent = config.name;
        row.cells[1].textContent = config.provider;
        row.cells[2].textContent = maskApiKey(config.apiKey);
        row.cells[3].textContent = config.model;
        row.cells[4].textContent = config.endpoint;

        updateDefaultSelect(config.name, index);
        saveConfigs(config, index);
    }

    function editConfig(index) {
        getStorageData('llmConfigs').then((result) => {
            const config = result.llmConfigs[index];

            setConfigForm(config);

            elements.optionsContainer.style.display = 'flex';
            elements.addConfigBtn.style.display = 'none';
            isEditing = true;
            editingIndex = index;

            loadModels().then(() => {
                elements.modelSelect.value = config.model;
            });
        });
    }

    function setConfigForm(config) {
        elements.configName.value = config.name;
        elements.apiKeyInput.value = config.apiKey;
        const radioButton = document.querySelector(
            `input[name="llm-provider"][value="${config.provider}"]`
        );
        if (radioButton) {
            radioButton.checked = true;
        }
        elements.endpointInput.value = config.endpoint;
        elements.endpointDisplay.textContent = elements.endpointInput.value;
        elements.modelSelect.value = config.model;
        const defaultEndpoint = LLMProviderFactory.getDefaultEndpoint(
            config.provider
        );
        elements.openaiEndpointToggle.checked =
            config.endpoint !== defaultEndpoint;
        if (config.advancedSettings) {
            setAdvancedSettings(config.advancedSettings);
        }
    }

    function addToDefaultSelect(name, index) {
        const option = document.createElement('option');
        option.text = name;
        option.value = index;
        elements.defaultSelect.appendChild(option);
    }

    function updateDefaultSelect(name, index) {
        elements.defaultSelect.options[index].text = name;
    }

    function removeFromDefaultSelect(index) {
        elements.defaultSelect.remove(index);
        // Update the remaining options' indices
        for (let i = index; i < elements.defaultSelect.options.length; i++) {
            elements.defaultSelect.options[i].value = i;
        }
    }

    function saveConfigs(config, index = null) {
        getStorageData('llmConfigs').then((result) => {
            let configs = result.llmConfigs || [];
            if (index !== null) {
                configs[index] = config;
            } else {
                configs.push(config);
            }
            setStorageData({ llmConfigs: configs });
        });
    }

    async function removeConfig(index) {
        getStorageData('llmConfigs').then((result) => {
            let configs = result.llmConfigs || [];
            configs.splice(index, 1);
            setStorageData({ llmConfigs: configs });
        });
    }

    function maskApiKey(apiKey) {
        return apiKey === ''
            ? ''
            : apiKey.substring(0, 4) +
                  '*'.repeat(apiKey.length - 8) +
                  apiKey.substring(apiKey.length - 4);
    }

    function getAdvancedSettings() {
        return {
            temperature: parseFloat(
                document.getElementById('temperature').value
            ),
            topK: parseInt(document.getElementById('top-k').value),
            topP: parseFloat(document.getElementById('top-p').value),
            maxTokens: parseInt(document.getElementById('max-tokens').value),
        };
    }

    function setAdvancedSettings(settings) {
        document.getElementById('temperature').value = settings.temperature;
        document.getElementById('top-k').value = settings.topK;
        document.getElementById('top-p').value = settings.topP;
        document.getElementById('max-tokens').value = settings.maxTokens;
    }

    function toggleAdvancedSettings() {
        const container = elements.advancedSettingsContainer;
        if (container.style.display === 'none') {
            container.style.display = 'block';
            elements.toggleAdvancedSettings.textContent =
                'Hide Advanced Settings';
        } else {
            container.style.display = 'none';
            elements.toggleAdvancedSettings.textContent =
                'Show Advanced Settings';
        }
    }

    function deleteConfig(index) {
        const row = elements.table.rows[index];
        if (
            confirm(
                `Are you sure you want to delete ${row.cells[0].textContent}?`
            )
        ) {
            row.remove();
            removeFromDefaultSelect(index);
            removeConfig(index);
        }
    }
}
