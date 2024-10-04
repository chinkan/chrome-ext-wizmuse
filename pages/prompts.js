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
        console.error('加載 prompts.html 時出錯:', error);
        return '<p>加載提示頁面時出錯</p>';
    }
}

export function initializePromptsPage() {
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

    let isEditing = false;
    let editingIndex = -1;

    loadPrompts();

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
                ).textContent = '編輯提示';
            }
        });
    }

    function deletePrompt(index) {
        if (confirm('您確定要刪除這個提示嗎？')) {
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
            '新增提示';
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
            '新增提示';
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
                alert('提示已保存');
            });
        });
}
