import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';
import {
    getStorageData,
    setStorageData,
    removeStorageData,
} from './utils/storage.js';

document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('#content > div');
    const form = document.getElementById('options-form');
    const table = document
        .getElementById('llm-configs-table')
        .getElementsByTagName('tbody')[0];
    const defaultSelect = document.getElementById('default-llm-config');
    const endpointDisplay = document.getElementById('endpoint-display');
    const endpointInput = document.getElementById('endpoint');
    const apiKey = document.getElementById('api-key');
    const modelSelect = document.getElementById('model');
    const saveDefaultButton = document.getElementById('save-default');
    const addConfigBtn = document.getElementById('add-config-btn');
    const cancelFormBtn = document.getElementById('cancel-form');
    const optionsContainer = document.getElementById('options-container');
    const historyTable = document
        .getElementById('history-table')
        .getElementsByTagName('tbody')[0];
    const llmProviderGrid = document.getElementById('llm-provider-grid');
    const languageSelect = document.getElementById('language');
    const apiKeyContainer = document.getElementById('api-key-container');

    const openaiEndpointContainer = document.getElementById(
        'openai-endpoint-container'
    );
    const openaiEndpointToggle = document.getElementById(
        'openai-endpoint-toggle'
    );

    let isEditing = false;
    let editingIndex = -1;

    function changePage(pageId) {
        menuItems.forEach((i) => i.classList.remove('active'));
        document
            .querySelector(`[data-page="${pageId}"]`)
            .classList.add('active');

        pages.forEach((page) => {
            page.style.display = page.id === pageId + '-page' ? '' : 'none';
        });

        if (pageId === 'history') {
            loadSummaryHistory();
        }
    }

    menuItems.forEach((item) => {
        item.addEventListener('click', function () {
            const pageId = this.getAttribute('data-page');
            changePage(pageId);
        });
    });

    checkFirstInstall(function () {
        loadConfigs();
        loadPrompts();
    });

    function checkFirstInstall(callback) {
        getStorageData(['isFirstInstall', 'lastVersion']).then((result) => {
            const currentVersion = '0.5.0';
            if (result.isFirstInstall === undefined) {
                // 這是首次安裝
                setStorageData({
                    isFirstInstall: false,
                    llmConfigs: [
                        {
                            name: 'OpenAI Example',
                            provider: 'openai',
                            apiKey: 'sk-proj-93345678901234567890', // example api key
                            model: 'gpt-4o',
                            endpoint: 'https://api.openai.com/v1/',
                        },
                    ],
                    selectedLLMIndex: 0,
                    language: 'English',
                })
                    .then(() => {
                        callback();
                    })
                    .catch((error) => {
                        console.error('存儲數據時出錯:', error);
                    });
                // 可以在這裡添加一些歡迎信息或指導
                alert(
                    'Welcome to WizMuse! Please set up your LLM provider and API key.'
                );
                changePage('options');
            } else if (result.lastVersion !== currentVersion) {
                // 更新版本

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
                });

                setStorageData({ lastVersion: currentVersion });
                callback();
            } else {
                callback();
            }
        });
    }

    function loadConfigs() {
        // 載入保存的設置
        getStorageData(['llmConfigs', 'selectedLLMIndex', 'language']).then(
            (result) => {
                if (result.llmConfigs) {
                    result.llmConfigs.forEach((config, index) =>
                        addConfigToTable(config, index)
                    );
                    if (result.selectedLLMIndex !== undefined) {
                        const selectedConfig =
                            result.llmConfigs[result.selectedLLMIndex];
                        defaultSelect.value = result.selectedLLMIndex;
                        if (selectedConfig) {
                            const radioButton = document.querySelector(
                                `input[name="llm-provider"][value="${selectedConfig.provider}"]`
                            );
                            if (radioButton) {
                                radioButton.checked = true;
                            }
                            // 更新端點顯示和輸入
                            const endpointUrl =
                                LLMProviderFactory.getDefaultEndpoint(
                                    selectedConfig.provider
                                );
                            endpointDisplay.textContent = endpointUrl;
                            endpointInput.value =
                                selectedConfig.endpoint || endpointUrl;
                        }
                    }
                    if (result.language !== undefined) {
                        languageSelect.value = result.language;
                    }
                }
                if (result.selectedLLMIndex) {
                    defaultSelect.value = result.selectedLLMIndex;
                }
                if (result.language) {
                    languageSelect.value = result.language;
                }
            }
        );
    }

    // 更新 LLM 提供者選擇邏輯
    llmProviderGrid.addEventListener('change', function (e) {
        if (e.target.type === 'radio') {
            loadModels();
            endpointInput.value = LLMProviderFactory.getDefaultEndpoint(
                e.target.value
            );
            endpointDisplay.textContent = endpointInput.value;
        }
    });
    apiKey.addEventListener('input', function (e) {
        loadModels();
    });
    endpointInput.addEventListener('input', function (e) {
        loadModels();
    });

    // 更新表單提交邏輯
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('config-name').value;
        const provider = document.querySelector(
            'input[name="llm-provider"]:checked'
        ).value;
        const apiKey = document.getElementById('api-key').value;
        const model = modelSelect.value;
        const endpoint = endpointInput.value;
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
            await addConfigToTable(config);
        }

        form.reset();
        optionsContainer.style.display = 'none';
        addConfigBtn.style.display = 'block';
        isEditing = false;
        editingIndex = -1;
        await loadModels();
    });

    // 處理表格點擊事件
    table.addEventListener('click', async function (e) {
        if (e.target.classList.contains('delete-btn')) {
            const row = e.target.closest('tr');
            const index = row.rowIndex - 1;
            row.remove();
            removeFromDefaultSelect(index);
            await removeConfig(index);
        } else if (e.target.tagName === 'TD') {
            const row = e.target.closest('tr');
            const index = row.rowIndex - 1;
            editConfig(index);
        }
    });

    // 新增配置按鈕
    addConfigBtn.addEventListener('click', function () {
        optionsContainer.style.display = 'flex';
        addConfigBtn.style.display = 'none';
        isEditing = false;
        editingIndex = -1;
    });

    // 取消表單按鈕
    cancelFormBtn.addEventListener('click', function () {
        optionsContainer.style.display = 'none';
        addConfigBtn.style.display = 'block';
        form.reset();
        isEditing = false;
        editingIndex = -1;
    });

    // Save Config
    saveDefaultButton.addEventListener('click', async function () {
        const defaultConfig = defaultSelect.value;
        const language = document.getElementById('language').value;
        await setStorageData({
            selectedLLMIndex: defaultConfig,
            language: language,
        });
        alert('Config Saved');
    });

    async function loadModels() {
        const provider = document.querySelector(
            'input[name="llm-provider"]:checked'
        ).value;
        const apiKeyInput = document.getElementById('api-key');
        const endpointUrl = endpointInput.value;

        const providerInstance = LLMProviderFactory.getProvider(provider, {
            apiKey: apiKeyInput.value,
            model: modelSelect.value,
            endpoint: endpointUrl,
        });

        const ollamaWarning = document.getElementById('ollama-warning');

        if (provider.toLowerCase() === 'ollama') {
            endpointInput.style.display = 'block';
            apiKeyInput.style.display = 'none';
            endpointDisplay.style.display = 'none';
            apiKeyInput.removeAttribute('required');
            apiKeyContainer.style.display = 'none';
            ollamaWarning.style.display = 'block'; // 顯示 Ollama 警告
            openaiEndpointContainer.style.display = 'none';
        } else if (provider.toLowerCase() === 'openai') {
            apiKeyInput.style.display = 'block';
            endpointInput.style.display = openaiEndpointToggle.checked
                ? 'block'
                : 'none';
            endpointDisplay.style.display = openaiEndpointToggle.checked
                ? 'none'
                : 'block';
            apiKeyInput.setAttribute('required', '');
            apiKeyContainer.style.display = 'block';
            ollamaWarning.style.display = 'none';
            openaiEndpointContainer.style.display = 'block';
        } else {
            endpointInput.style.display = 'none';
            apiKeyInput.style.display = 'block';
            endpointDisplay.style.display = 'block';
            apiKeyInput.setAttribute('required', '');
            apiKeyContainer.style.display = 'block';
            ollamaWarning.style.display = 'none';
            openaiEndpointContainer.style.display = 'none';
        }

        try {
            const models = await providerInstance.getModelLists();
            // 按名稱對模型進行排序
            models.sort((a, b) => a.name.localeCompare(b.name));
            modelSelect.innerHTML =
                `<option value="">Select Model</option>` +
                models
                    .map(
                        (model) =>
                            `<option value="${model.value}">${model.name}</option>`
                    )
                    .join('');
        } catch (error) {
            console.error('Error loading models:', error);
            modelSelect.innerHTML =
                '<option value="">Error loading models</option>';
        }
    }

    async function addConfigToTable(config, index = null) {
        const row = table.insertRow(index);
        row.innerHTML = `
            <td>${config.name}</td>
            <td>${config.provider}</td>
            <td>${maskApiKey(config.apiKey)}</td>
            <td>${config.model}</td>
            <td>${config.endpoint}</td>
            <td><button class="delete-btn"><i class="material-icons">delete</i></button></td>
        `;

        index = index || table.rows.length - 1;

        addToDefaultSelect(config.name, index);
        await saveConfigs(config, index);
    }

    function updateConfigInTable(config, index) {
        const row = table.rows[index];
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
            const row = table.rows[index];
            const config = result.llmConfigs[index];

            if (config.advancedSettings) {
                setAdvancedSettings(config.advancedSettings);
            }

            document.getElementById('config-name').value = config.name;
            const radioButton = document.querySelector(
                `input[name="llm-provider"][value="${config.provider}"]`
            );
            if (radioButton) {
                radioButton.checked = true;
            }
            document.getElementById('api-key').value = config.apiKey;
            loadModels().then(() => {
                modelSelect.value = config.model;
            });

            optionsContainer.style.display = 'flex';
            addConfigBtn.style.display = 'none';
            isEditing = true;
            editingIndex = index;
        });
    }

    function addToDefaultSelect(name, index) {
        const option = document.createElement('option');
        option.text = name;
        option.value = index;
        defaultSelect.appendChild(option);
    }

    function updateDefaultSelect(name, index) {
        defaultSelect.options[index].text = name;
    }

    function removeFromDefaultSelect(index) {
        defaultSelect.remove(index);
        // Update the remaining options' indices
        for (let i = index; i < defaultSelect.options.length; i++) {
            defaultSelect.options[i].value = i;
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

    function loadSummaryHistory() {
        historyTable.innerHTML = '';
        getStorageData(['histories']).then((items) => {
            for (let key in items.histories) {
                if (key.startsWith('http')) {
                    const data = items.histories[key];
                    const row = historyTable.insertRow();
                    row.innerHTML = `
                        <td><a href="${key}" target="_blank">${key}</a></td>
                        <td>${data.title}</td>
                        <td>${new Date(data.timestamp).toLocaleString()}</td>
                        <td>
                            <div class="summary-container">
                                <span class="summary-text">${
                                    typeof data?.summary === 'string'
                                        ? data?.summary?.substring(0, 100)
                                        : JSON.stringify(data?.summary)
                                }...</span>
                                <button class="copy-btn action-btn" data-url="${key}" title="Copy Summary">
                                    <i class="material-icons">content_copy</i>
                                </button>
                            </div>
                        </td>
                        <td>
                            <button class="delete-btn action-btn" data-url="${key}" title="Delete Summary">
                                <i class="material-icons">delete</i>
                            </button>
                        </td>
                    `;
                }
            }
        });
    }

    historyTable.addEventListener('click', function (e) {
        const row = e.target.closest('tr');
        const url = row.cells[0].textContent;
        if (e.target.tagName === 'TD') {
            getStorageData(['histories']).then((result) => {
                if (result.histories[url]) {
                    alert(result.histories[url].summary);
                }
            });
        } else if (
            (e.target.tagName === 'I' &&
                e.target.parentElement.classList.contains('copy-btn')) ||
            e.target.classList.contains('copy-btn')
        ) {
            getStorageData(['histories']).then((result) => {
                if (result.histories[url]) {
                    setTimeout(() => {
                        navigator.clipboard
                            .writeText(result.histories[url].summary)
                            .then(() => {
                                alert('Summary copied to clipboard');
                            })
                            .catch((err) => {
                                console.error('Copy failed:', err);
                                alert('Copy failed, please copy manually');
                            });
                    }, 100);
                }
            });
        } else if (
            (e.target.tagName === 'I' &&
                e.target.parentElement.classList.contains('delete-btn')) ||
            e.target.classList.contains('delete-btn')
        ) {
            getStorageData(['histories']).then((result) => {
                if (confirm('Are you sure you want to delete this history?')) {
                    delete result.histories[url];
                    setStorageData({ histories: result });
                    row.remove();
                }
            });
        }
    });

    const promptsTable = document
        .getElementById('prompts-table')
        .getElementsByTagName('tbody')[0];
    const defaultPromptSelect = document.getElementById('default-prompt');
    const addPromptBtn = document.getElementById('add-prompt-btn');
    const promptFormContainer = document.getElementById(
        'prompt-form-container'
    );
    const promptForm = document.getElementById('prompt-form');
    const cancelPromptFormBtn = document.getElementById('cancel-prompt-form');

    function loadPrompts() {
        getStorageData(['prompts', 'defaultPromptIndex']).then((result) => {
            if (result.prompts) {
                promptsTable.innerHTML = ''; // 清空表格
                result.prompts.forEach((prompt, index) =>
                    addPromptToTable(prompt, index)
                );

                // 更新默認提示選擇
                updateDefaultPromptSelect(
                    result.prompts,
                    result.defaultPromptIndex
                );
            }
        });
    }

    function addPromptToTable(prompt, index) {
        const row = promptsTable.insertRow();
        row.innerHTML = `
            <td>${prompt.name}</td>
            <td>${truncateText(prompt.systemPrompt, 50)}</td>
            <td>${truncateText(prompt.userPrompt, 50)}</td>
            <td>
                <button class="edit-btn action-btn" data-index="${index}" title="Edit Prompt">
                    <i class="material-icons">edit</i>
                </button>
                <button class="delete-btn action-btn" data-index="${index}" title="Delete Prompt">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;
    }

    function updateDefaultPromptSelect(prompts, defaultIndex) {
        defaultPromptSelect.innerHTML = `
            <option value="-1" ${
                defaultIndex === undefined ? 'selected' : ''
            }>Use Default Prompt</option>
            ${prompts
                .map(
                    (prompt, index) =>
                        `<option value="${index}" ${
                            index === defaultIndex ? 'selected' : ''
                        }>${prompt.name}</option>`
                )
                .join('')}
        `;
    }

    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    // 處理提示表格的點擊事件
    promptsTable.addEventListener('click', function (e) {
        if (e.target.closest('.edit-btn')) {
            const index = e.target.closest('.edit-btn').dataset.index;
            editPrompt(index);
        } else if (e.target.closest('.delete-btn')) {
            const index = e.target.closest('.delete-btn').dataset.index;
            deletePrompt(index);
        }
    });

    function editPrompt(index) {
        getStorageData('prompts').then((result) => {
            const prompts = result.prompts || [];
            if (index >= 0 && index < prompts.length) {
                const prompt = prompts[index];
                document.getElementById('prompt-name').value = prompt.name;
                document.getElementById('system-prompt').value =
                    prompt.systemPrompt;
                document.getElementById('user-prompt').value =
                    prompt.userPrompt;

                promptFormContainer.style.display = 'block';
                addPromptBtn.style.display = 'none';

                isEditing = true;
                editingIndex = index;

                // 更改表單標題
                document.querySelector(
                    '#prompt-form-container h2'
                ).textContent = 'Edit Prompt';
            }
        });
    }

    function deletePrompt(index) {
        if (confirm('Are you sure you want to delete this prompt?')) {
            getStorageData('prompts').then((result) => {
                let prompts = result.prompts || [];
                prompts.splice(index, 1);
                setStorageData({ prompts: prompts }).then(() => {
                    loadPrompts(); // 重新加載提示列表
                });
            });
        }
    }

    // 添加新提示按鈕
    addPromptBtn.addEventListener('click', function () {
        promptFormContainer.style.display = 'block';
        promptForm.reset();
        // 設置表單標題
        document.querySelector('#prompt-form-container h2').textContent =
            'New Prompt';
    });

    // 取消添加提示
    cancelPromptFormBtn.addEventListener('click', function () {
        promptFormContainer.style.display = 'none';
        addPromptBtn.style.display = 'block';
        isEditing = false;
        editingIndex = -1;
        promptForm.reset();
        // 重置表單標題
        document.querySelector('#prompt-form-container h2').textContent =
            'New Prompt';
    });

    // 保存提示表單
    promptForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = document.getElementById('prompt-name').value;
        const systemPrompt = document.getElementById('system-prompt').value;
        const userPrompt = document.getElementById('user-prompt').value;

        getStorageData('prompts').then((result) => {
            let prompts = result.prompts || [];

            if (isEditing) {
                // 更新現有提示
                prompts[editingIndex] = { name, systemPrompt, userPrompt };
            } else {
                // 添加新提示
                prompts.push({ name, systemPrompt, userPrompt });
            }

            setStorageData({ prompts: prompts }).then(() => {
                loadPrompts(); // 重新加載提示列表
                promptFormContainer.style.display = 'none';
                addPromptBtn.style.display = 'block';
                isEditing = false;
                editingIndex = -1;
                promptForm.reset();
            });
        });
    });

    // 保存默認提示
    document
        .getElementById('save-default-prompt')
        .addEventListener('click', function () {
            const defaultPromptIndex = parseInt(defaultPromptSelect.value);
            setStorageData({
                defaultPromptIndex:
                    defaultPromptIndex === -1 ? undefined : defaultPromptIndex,
            }).then(() => {
                alert('Prompt Saved');
            });
        });

    // 添加以下事件監聽器
    openaiEndpointToggle.addEventListener('change', function (e) {
        endpointInput.style.display = e.target.checked ? 'block' : 'none';
        endpointDisplay.style.display = e.target.checked ? 'none' : 'block';
    });

    // 添加這些函數到 options.js

    function toggleAdvancedSettings() {
        const container = document.getElementById(
            'advanced-settings-container'
        );
        const button = document.getElementById('toggle-advanced-settings');
        if (container.style.display === 'none') {
            container.style.display = 'block';
            button.textContent = 'Hide Advanced Settings';
        } else {
            container.style.display = 'none';
            button.textContent = 'Show Advanced Settings';
        }
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

    // 添加事件監聽器
    document
        .getElementById('toggle-advanced-settings')
        .addEventListener('click', toggleAdvancedSettings);
});
