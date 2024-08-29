import LLMProviderFactory from './prompt-providers/llm-provider-factory.js';

document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('#content > div');
    const form = document.getElementById('options-form');
    const table = document
        .getElementById('llm-configs-table')
        .getElementsByTagName('tbody')[0];
    const defaultSelect = document.getElementById('default-llm-config');
    const providerSelect = document.getElementById('llm-provider');
    const endpointDisplay = document.getElementById('endpoint-display');
    const endpointTextarea = document.getElementById('endpoint');
    const modelSelect = document.getElementById('model');
    const saveDefaultButton = document.getElementById('save-default');
    const addConfigBtn = document.getElementById('add-config-btn');
    const cancelFormBtn = document.getElementById('cancel-form');

    let isEditing = false;
    let editingIndex = -1;

    menuItems.forEach((item) => {
        item.addEventListener('click', function () {
            const pageId = this.getAttribute('data-page');

            menuItems.forEach((i) => i.classList.remove('active'));
            this.classList.add('active');

            pages.forEach((page) => {
                page.style.display =
                    page.id === pageId + '-page' ? 'block' : 'none';
            });
        });
    });

    // 載入保存的設置
    chrome.storage.sync.get(
        ['llmConfigs', 'defaultLLMConfig'],
        function (result) {
            if (result.llmConfigs) {
                result.llmConfigs.forEach((config, index) =>
                    addConfigToTable(config, index)
                );
            }
            if (result.defaultLLMConfig) {
                defaultSelect.value = result.defaultLLMConfig;
            }
        }
    );

    // 處理表單提交
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('config-name').value;
        const provider = providerSelect.value;
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
        form.style.display = 'none';
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
            await saveConfigs();
        } else if (e.target.tagName === 'TD') {
            const row = e.target.closest('tr');
            const index = row.rowIndex - 1;
            editConfig(index);
        }
    });

    // 新增配置按鈕
    addConfigBtn.addEventListener('click', function () {
        form.style.display = 'block';
        addConfigBtn.style.display = 'none';
        isEditing = false;
        editingIndex = -1;
    });

    // 取消表單按鈕
    cancelFormBtn.addEventListener('click', function () {
        form.style.display = 'none';
        addConfigBtn.style.display = 'block';
        form.reset();
        isEditing = false;
        editingIndex = -1;
    });

    // 保存預設配置
    saveDefaultButton.addEventListener('click', async function () {
        const defaultConfig = defaultSelect.value;
        await chrome.storage.sync.set({ defaultLLMConfig: defaultConfig });
        alert('預設配置已保存');
    });

    // 當 Provider 改變時載入對應的模型
    providerSelect.addEventListener('change', loadModels);

    async function loadModels() {
        const provider = providerSelect.value;
        const apiKey = document.getElementById('api-key').value;
        const endpointUrl = LLMProviderFactory.getDefaultEndpoint(provider);
        endpointDisplay.textContent = endpointUrl;
        endpointTextarea.value = endpointUrl;

        const providerInstance = LLMProviderFactory.getProvider(provider, {
            apiKey,
            model: modelSelect.value,
            endpoint: endpointUrl,
        });

        if (provider === 'Ollama') {
            endpointTextarea.style.display = 'block';
        } else {
            endpointTextarea.style.display = 'none';
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

    async function addConfigToTable(config, index) {
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
        await saveConfigs();
    }

    function updateConfigInTable(config, index) {
        const row = table.rows[index];
        row.cells[0].textContent = config.name;
        row.cells[1].textContent = config.provider;
        row.cells[2].textContent = maskApiKey(config.apiKey);
        row.cells[3].textContent = config.model;
        row.cells[4].textContent = config.endpoint;

        updateDefaultSelect(config.name, index);
        saveConfigs();
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
        providerSelect.value = config.provider;
        document.getElementById('api-key').value = config.apiKey;
        loadModels().then(() => {
            modelSelect.value = config.model;
        });

        form.style.display = 'block';
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

    async function saveConfigs() {
        const configs = Array.from(table.rows).map((row) => ({
            name: row.cells[0].textContent,
            provider: row.cells[1].textContent,
            apiKey: row.cells[2].textContent,
            model: row.cells[3].textContent,
            endpoint: row.cells[4].textContent, // 添加 endpoint
        }));

        await chrome.storage.sync.set({ llmConfigs: configs });
    }

    function maskApiKey(apiKey) {
        return (
            apiKey.substring(0, 4) +
            '*'.repeat(apiKey.length - 8) +
            apiKey.substring(apiKey.length - 4)
        );
    }

    // 初始載入模型
    loadModels();
});
