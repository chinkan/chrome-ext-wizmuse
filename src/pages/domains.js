import {
    getAllStorageData,
    getStorageData,
    setStorageData,
    removeStorageData,
} from '../utils/storage.js';

export async function domains() {
    try {
        const response = await fetch('pages/domains.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const domainsHtml = await response.text();
        return domainsHtml;
    } catch (error) {
        console.error('加載 domains.html 時出錯:', error);
        return '<p>加載域名設置頁面時出錯</p>';
    }
}

export function initializeDomainsPage() {
    const elements = {
        domainsTable: document
            .getElementById('domains-table')
            .getElementsByTagName('tbody')[0],
        addDomainBtn: document.getElementById('add-domain-btn'),
        domainFormContainer: document.getElementById('domain-form-container'),
        domainForm: document.getElementById('domain-form'),
        cancelDomainFormBtn: document.getElementById('cancel-domain-form'),
        domainName: document.getElementById('domain-name'),
        domainLLMConfig: document.getElementById('domain-llm-config'),
        domainPrompt: document.getElementById('domain-prompt'),
    };

    let isEditing = false;
    let editingDomain = '';

    loadDomainSettings();
    loadLLMConfigs();
    loadPrompts();

    elements.domainsTable.addEventListener('click', handleTableClick);
    elements.addDomainBtn.addEventListener('click', showAddDomainForm);
    elements.cancelDomainFormBtn.addEventListener('click', hideDomainForm);
    elements.domainForm.addEventListener('submit', handleDomainFormSubmit);

    function loadDomainSettings() {
        getAllStorageData().then((items) => {
            elements.domainsTable.innerHTML = '';
            for (let key in items) {
                if (key.startsWith('domainSettings.')) {
                    const domain = key.split('domainSettings.')[1];
                    const settings = items[key];
                    addDomainToTable(domain, settings, items.llmConfigs);
                }
            }
        });
    }

    function loadLLMConfigs() {
        getAllStorageData().then((items) => {
            const llmConfigs = items.llmConfigs || [];
            elements.domainLLMConfig.innerHTML = llmConfigs
                .map(
                    (config, index) =>
                        `<option value="${index}">${config.name}</option>`
                )
                .join('');
        });
    }

    function loadPrompts() {
        getAllStorageData().then((items) => {
            const prompts = items.prompts || [];
            elements.domainPrompt.innerHTML = `
                <option value="-1">Use Default Prompt</option>
                ${prompts
                    .map(
                        (prompt, index) =>
                            `<option value="${index}">${prompt.name}</option>`
                    )
                    .join('')}
            `;
        });
    }

    function addDomainToTable(domain, settings, llmConfigs) {
        const row = elements.domainsTable.insertRow();
        const llmConfigName =
            llmConfigs && llmConfigs[settings.selectedModelIndex]
                ? llmConfigs[settings.selectedModelIndex].name
                : 'Unknown';
        row.innerHTML = `
            <td>${domain}</td>
            <td>${llmConfigName}</td>
            <td>${settings.promptName || 'Default Prompt'}</td>
            <td>
                <button class="edit-btn action-btn" data-domain="${domain}" title="Edit Setting">
                    <i class="material-icons">edit</i>
                </button>
                <button class="delete-btn action-btn" data-domain="${domain}" title="Delete Setting">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;
    }

    function handleTableClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const domain = button.dataset.domain;
        if (!domain) return;

        if (button.classList.contains('edit-btn')) {
            editDomainSetting(domain);
        } else if (button.classList.contains('delete-btn')) {
            deleteDomainSetting(domain);
        }
    }

    function showAddDomainForm() {
        elements.domainFormContainer.style.display = 'flex';
        elements.domainForm.reset();
        elements.addDomainBtn.style.display = 'none';
        isEditing = false;
        editingDomain = '';
    }

    function hideDomainForm() {
        elements.domainFormContainer.style.display = 'none';
        elements.addDomainBtn.style.display = 'flex';
        isEditing = false;
        editingDomain = '';
        elements.domainForm.reset();
    }

    function handleDomainFormSubmit(e) {
        e.preventDefault();
        const domain = elements.domainName.value;
        const llmConfigIndex = elements.domainLLMConfig.value;
        const promptIndex = elements.domainPrompt.value;

        getAllStorageData().then((items) => {
            const llmConfigs = items.llmConfigs || [];
            const prompts = items.prompts || [];

            const domainSettings = {
                selectedModelIndex: parseInt(llmConfigIndex),
                selectPromptIndex: parseInt(promptIndex),
                llmConfigName: llmConfigs[llmConfigIndex].name,
                promptName:
                    promptIndex === '-1'
                        ? 'Default Prompt'
                        : prompts[promptIndex].name,
            };

            const key = `domainSettings.${domain}`;
            setStorageData({ [key]: domainSettings }).then(() => {
                loadDomainSettings();
                hideDomainForm();
            });
        });
    }

    function editDomainSetting(domain) {
        console.log('Editing domain:', domain);
        getAllStorageData().then((items) => {
            console.log('All items:', items);
            const settings = items[`domainSettings.${domain}`];
            console.log('Settings for domain:', settings);
            if (settings) {
                elements.domainName.value = domain;
                elements.domainLLMConfig.value = settings.selectedModelIndex;
                elements.domainPrompt.value = settings.selectPromptIndex;

                elements.domainFormContainer.style.display = 'flex';
                elements.addDomainBtn.style.display = 'none';
                isEditing = true;
                editingDomain = domain;
            } else {
                console.error('No settings found for domain:', domain);
            }
        });
    }

    function deleteDomainSetting(domain) {
        if (
            confirm(
                `Are you sure you want to delete the setting for ${domain}?`
            )
        ) {
            removeStorageData(`domainSettings.${domain}`).then(() => {
                loadDomainSettings();
            });
        }
    }
}
