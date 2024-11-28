// Prompts Page
import { getStorageData, setStorageData } from '../utils/storage.js';

export async function prompts() {
    try {
        const response = await fetch('pages/prompts.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const promptsHtml = await response.text();
        return promptsHtml;
    } catch (error) {
        console.error('Error loading prompts.html:', error);
        return '<p>Error loading prompts page</p>';
    }
}

export function initializePromptsPage() {
    // 常量定義區域
    const elements = {
        promptsTable: document
            .getElementById('prompts-table')
            .getElementsByTagName('tbody')[0],
        defaultPromptSelect: document.getElementById('default-prompt'),
        addPromptBtn: document.getElementById('add-prompt-btn'),
        promptFormContainer: document.getElementById('prompt-form-container'),
        promptForm: document.getElementById('prompt-form'),
        cancelPromptFormBtn: document.getElementById('cancel-prompt-form'),
        promptName: document.getElementById('prompt-name'),
        systemPrompt: document.getElementById('system-prompt'),
        userPrompt: document.getElementById('user-prompt'),
        saveDefaultPromptBtn: document.getElementById('save-default-prompt'),
    };

    // 檢查元素是否存在
    if (Object.values(elements).some((element) => !element)) {
        console.error('Some elements are missing in the prompts page');
        return;
    }

    // 狀態變量
    let isEditing = false;
    let editingIndex = -1;

    // 初始化
    loadPrompts();

    // 事件監聽器
    elements.promptsTable.addEventListener('click', handleTableClick);
    elements.addPromptBtn.addEventListener('click', showAddPromptForm);
    elements.cancelPromptFormBtn.addEventListener('click', hidePromptForm);
    elements.promptForm.addEventListener('submit', handlePromptFormSubmit);
    elements.saveDefaultPromptBtn.addEventListener('click', saveDefaultPrompt);

    // 私有函數
    function loadPrompts() {
        getStorageData(['prompts', 'defaultPromptIndex']).then((result) => {
            if (result.prompts) {
                elements.promptsTable.innerHTML = '';
                result.prompts.forEach((prompt, index) =>
                    addPromptToTable(prompt, index)
                );
                updateDefaultPromptSelect(
                    result.prompts,
                    result.defaultPromptIndex
                );
            }
        });
    }

    function addPromptToTable(prompt, index) {
        const row = elements.promptsTable.insertRow();
        row.innerHTML = `
            <td>${prompt.name}</td>
            <td>${truncateText(prompt.systemPrompt, 50)}</td>
            <td>${truncateText(prompt.userPrompt, 50)}</td>
            <td>
                <button class="delete-btn action-btn" data-index="${index}" title="Delete Prompt">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;
    }

    function updateDefaultPromptSelect(prompts, defaultIndex) {
        elements.defaultPromptSelect.innerHTML = `
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
        return text.length <= maxLength
            ? text
            : text.substr(0, maxLength) + '...';
    }

    function handleTableClick(e) {
        const row = e.target.closest('tr');
        if (!row) return;

        const index = row.rowIndex - 1;
        const deleteBtn = e.target.closest('.delete-btn');

        if (deleteBtn) {
            deletePrompt(index);
        } else {
            editPrompt(index);
        }
    }

    function editPrompt(index) {
        getStorageData('prompts').then((result) => {
            const prompts = result.prompts || [];
            if (index >= 0 && index < prompts.length) {
                const prompt = prompts[index];
                elements.promptName.value = prompt.name;
                elements.systemPrompt.value = prompt.systemPrompt;
                elements.userPrompt.value = prompt.userPrompt;

                elements.promptFormContainer.style.display = 'block';
                elements.addPromptBtn.style.display = 'none';

                isEditing = true;
                editingIndex = index;

                document.querySelector(
                    '#prompt-form-container h2'
                ).textContent = 'Edit Prompt';
            }
        });
    }

    function deletePrompt(index) {
        const row = elements.promptsTable.rows[index];
        if (
            confirm(
                `Are you sure you want to delete ${row.cells[0].textContent}?`
            )
        ) {
            row.remove();
            getStorageData('prompts').then((result) => {
                let prompts = result.prompts || [];
                prompts.splice(index, 1);
                setStorageData({ prompts: prompts }).then(() => {
                    loadPrompts();
                });
            });
        }
    }

    function showAddPromptForm() {
        elements.promptFormContainer.style.display = 'block';
        elements.promptForm.reset();
        elements.addPromptBtn.style.display = 'none';
        isEditing = false;
        editingIndex = -1;
        document.querySelector('#prompt-form-container h2').textContent =
            'Add New Prompt';
    }

    function hidePromptForm() {
        elements.promptFormContainer.style.display = 'none';
        elements.addPromptBtn.style.display = 'block';
        isEditing = false;
        editingIndex = -1;
        elements.promptForm.reset();
        document.querySelector('#prompt-form-container h2').textContent =
            'Add New Prompt';
    }

    function handlePromptFormSubmit(e) {
        e.preventDefault();
        const name = elements.promptName.value;
        const systemPrompt = elements.systemPrompt.value;
        const userPrompt = elements.userPrompt.value;

        getStorageData('prompts').then((result) => {
            let prompts = result.prompts || [];

            if (isEditing) {
                prompts[editingIndex] = { name, systemPrompt, userPrompt };
            } else {
                prompts.push({ name, systemPrompt, userPrompt });
            }

            setStorageData({ prompts: prompts }).then(() => {
                loadPrompts();
                hidePromptForm();
            });
        });
    }

    function saveDefaultPrompt() {
        console.log('Saving default prompt...', elements.defaultPromptSelect.value);
        const defaultPromptIndex = parseInt(elements.defaultPromptSelect.value);
        setStorageData({
            defaultPromptIndex: defaultPromptIndex,
        }).then(() => {
            alert('Prompt saved');
        });
    }
}
