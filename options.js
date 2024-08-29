import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';

document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('#content > div');
    const form = document.getElementById('options-form');
    const table = document
        .getElementById('llm-configs-table')
        .getElementsByTagName('tbody')[0];
    const defaultSelect = document.getElementById('default-llm-config');
    const endpointDisplay = document.getElementById('endpoint-display');
    const endpointTextarea = document.getElementById('endpoint');
    const modelSelect = document.getElementById('model');
    const saveDefaultButton = document.getElementById('save-default');
    const addConfigBtn = document.getElementById('add-config-btn');
    const cancelFormBtn = document.getElementById('cancel-form');
    const optionsContainer = document.getElementById('options-container');
    const historyTable = document
        .getElementById('history-table')
        .getElementsByTagName('tbody')[0];
    const llmProviderGrid = document.getElementById('llm-provider-grid');

    let isEditing = false;
    let editingIndex = -1;

    menuItems.forEach((item) => {
        item.addEventListener('click', function () {
            const pageId = this.getAttribute('data-page');

            menuItems.forEach((i) => i.classList.remove('active'));
            this.classList.add('active');

            pages.forEach((page) => {
                page.style.display = page.id === pageId + '-page' ? '' : 'none';
            });

            if (pageId === 'history') {
                loadSummaryHistory();
            }
        });
    });

    // 載入保存的設置
    chrome.storage.sync.get(
        ['llmConfigs', 'selectedLLMIndex'],
        function (result) {
            if (result.llmConfigs) {
                result.llmConfigs.forEach((config, index) =>
                    addConfigToTable(config, index)
                );
            }
            if (result.selectedLLMIndex) {
                defaultSelect.value = result.selectedLLMIndex;
            }
        }
    );

    chrome.storage.sync.get(['isFirstInstall'], function (result) {
        if (result.isFirstInstall === undefined) {
            // 這是首次安裝
            chrome.storage.sync.set(
                {
                    isFirstInstall: false,
                    llmConfigs: [
                        {
                            name: 'Default OpenAI',
                            provider: 'openai',
                            apiKey: '',
                            model: 'gpt-3.5-turbo',
                            endpoint:
                                'https://api.openai.com/v1/chat/completions',
                        },
                    ],
                    selectedLLMIndex: 0,
                },
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

    // 更新 LLM 提供者選擇邏輯
    llmProviderGrid.addEventListener('change', function (e) {
        if (e.target.type === 'radio') {
            loadModels();
        }
    });

    // 載入保存的設置時更新單選按鈕
    chrome.storage.sync.get(
        ['llmConfigs', 'selectedLLMIndex'],
        function (result) {
            if (result.llmConfigs && result.selectedLLMIndex !== undefined) {
                const selectedConfig =
                    result.llmConfigs[result.selectedLLMIndex];
                if (selectedConfig) {
                    const radioButton = document.querySelector(
                        `input[name="llm-provider"][value="${selectedConfig.provider}"]`
                    );
                    if (radioButton) {
                        radioButton.checked = true;
                    }
                    // 更新端點顯示和輸入
                    const endpointUrl = LLMProviderFactory.getDefaultEndpoint(
                        selectedConfig.provider
                    );
                    endpointDisplay.textContent = endpointUrl;
                    endpointTextarea.value =
                        selectedConfig.endpoint || endpointUrl;
                }
            }
            // 初始載入模型
            loadModels();
        }
    );

    // 更新表單提交邏輯
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('config-name').value;
        const provider = document.querySelector(
            'input[name="llm-provider"]:checked'
        ).value;
        const apiKey = document.getElementById('api-key').value;
        const model = modelSelect.value;
        const endpoint = endpointTextarea.value;

        const config = { name, provider, apiKey, model, endpoint };

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

    // 保存預設配置
    saveDefaultButton.addEventListener('click', async function () {
        const defaultConfig = defaultSelect.value;
        await chrome.storage.sync.set({ selectedLLMIndex: defaultConfig });
        alert('預設配置已保存');
    });

    async function loadModels() {
        const provider = document.querySelector(
            'input[name="llm-provider"]:checked'
        ).value;
        const apiKeyInput = document.getElementById('api-key');
        const endpointUrl = LLMProviderFactory.getDefaultEndpoint(provider);
        endpointDisplay.textContent = endpointUrl;
        endpointTextarea.value = endpointUrl;

        const providerInstance = LLMProviderFactory.getProvider(provider, {
            apiKey: apiKeyInput.value,
            model: modelSelect.value,
            endpoint: endpointUrl,
        });

        if (provider === 'Ollama') {
            endpointTextarea.style.display = 'block';
            apiKeyInput.style.display = 'none';
            endpointDisplay.style.display = 'none';
            apiKeyInput.removeAttribute('required');
        } else {
            endpointTextarea.style.display = 'none';
            apiKeyInput.style.display = 'block';
            endpointDisplay.style.display = 'block';
            apiKeyInput.setAttribute('required', '');
        }

        try {
            const models = await providerInstance.getModelLists();
            modelSelect.innerHTML = models
                .map(
                    (model) =>
                        `<option value="${model.value}">${model.name}</option>`
                )
                .join('');
        } catch (error) {
            console.error('載入模型時出錯:', error);
            modelSelect.innerHTML = '<option value="">載入模型時出錯</option>';
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
            <td><button class="delete-btn">刪除</button></td>
        `;

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
        const row = table.rows[index];
        const config = {
            name: row.cells[0].textContent,
            provider: row.cells[1].textContent,
            apiKey: row.cells[2].textContent,
            model: row.cells[3].textContent,
        };

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
    }

    function addToDefaultSelect(name, index) {
        const option = document.createElement('option');
        option.text = name;
        option.value = index;
        defaultSelect.add(option);
    }

    function updateDefaultSelect(name, index) {
        defaultSelect.options[index].text = name;
    }

    function removeFromDefaultSelect(index) {
        defaultSelect.remove(index);
        // 更新剩餘選項的索引
        for (let i = index; i < defaultSelect.options.length; i++) {
            defaultSelect.options[i].value = i;
        }
    }

    async function saveConfigs(config, index = null) {
        await chrome.storage.sync.get(['llmConfigs'], async function (result) {
            let configs = result.llmConfigs || [];
            if (index !== null) {
                configs[index] = config;
            } else {
                configs.push(config);
            }
            await chrome.storage.sync.set({ llmConfigs: configs });
        });
    }

    async function removeConfig(index) {
        await chrome.storage.sync.get(['llmConfigs'], async function (result) {
            let configs = result.llmConfigs || [];
            configs.splice(index, 1);
            await chrome.storage.sync.set({ llmConfigs: configs });
        });
    }

    function maskApiKey(apiKey) {
        return (
            apiKey.substring(0, 4) +
            '*'.repeat(apiKey.length - 8) +
            apiKey.substring(apiKey.length - 4)
        );
    }

    function loadSummaryHistory() {
        chrome.storage.local.get(null, function (items) {
            for (let key in items) {
                if (key.startsWith('http')) {
                    const data = items[key];
                    const row = historyTable.insertRow();
                    row.innerHTML = `
                        <td>${key}</td>
                        <td>${data.title}</td>
                        <td>${new Date(data.timestamp).toLocaleString()}</td>
                        <td>${data.summary.substring(0, 100)}...</td>
                    `;
                }
            }
        });
    }

    historyTable.addEventListener('click', function (e) {
        if (e.target.tagName === 'TD') {
            const row = e.target.closest('tr');
            const url = row.cells[0].textContent;
            chrome.storage.local.get(url, function (result) {
                if (result[url]) {
                    alert(result[url].summary);
                }
            });
        }
    });

    loadSummaryHistory();
});
