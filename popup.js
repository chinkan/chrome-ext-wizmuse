import { getStorageData, setStorageData } from './utils/storage.js';

document.addEventListener('DOMContentLoaded', async function () {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const summaryContainer = document.getElementById('summary-container');

    try {
        const tabs = await new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        const currentUrl = tabs[0].url;
        const result = await getStorageData(currentUrl);
        if (result[currentUrl]) {
            displaySummary(result[currentUrl].summary);
        } else {
            await generateSummary();
        }
    } catch (error) {
        handleError(error.message);
    }

    async function generateSummary(
        selectedModelIndex = null,
        selectPromptIndex = null
    ) {
        loadingIndicator.style.display = 'flex';
        errorMessage.style.display = 'none';
        summaryContainer.style.display = 'none';

        try {
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query(
                    { active: true, currentWindow: true },
                    resolve
                );
            });

            const currentTab = tabs[0];
            const currentUrl = currentTab.url;
            const currentTitle = currentTab.title;

            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(
                    currentTab.id,
                    { action: 'getPageContent' },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (response && response.content) {
                await _summarize(
                    currentUrl,
                    currentTitle,
                    response.content,
                    selectedModelIndex,
                    selectPromptIndex
                );
            } else {
                throw new Error('Invalid response');
            }
        } catch (error) {
            handleError(error.message);
        }
    }

    async function _summarize(
        url,
        title,
        content,
        selectedModelIndex,
        selectPromptIndex
    ) {
        try {
            console.error(
                'selectPromptIndex before send message',
                selectPromptIndex
            );
            const response = await chrome.runtime.sendMessage({
                action: 'summarize',
                text: content,
                selectedIndex: selectedModelIndex,
                selectPromptIndex: selectPromptIndex,
            });

            if (response && response.error) {
                handleError(response.error);
            } else if (response && response.summary) {
                await setStorageData({
                    histories: {
                        [url]: {
                            summary: response.summary,
                            title: title,
                            timestamp: Date.now(),
                        },
                    },
                });
                displaySummary(response.summary);
            } else {
                handleError('Invalid summarization response');
            }
        } catch (error) {
            console.error('Runtime error:', error);
            handleError(error.message || 'An unknown error occurred');
        }
    }

    function displaySummary(summary) {
        const markdownHtml = markdown(summary);
        document.getElementById('summary').innerHTML = markdownHtml;
        summaryContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    function handleError(message) {
        console.error('Error:', message);
        errorMessage.textContent =
            'Something went wrong. Please refresh the page and try again.';
        errorMessage.style.display = 'flex';
        loadingIndicator.style.display = 'none';
    }

    document
        .getElementById('copy-summary')
        .addEventListener('click', copySummary);

    function copySummary() {
        const summaryContent = document.getElementById('summary').innerText;
        navigator.clipboard.writeText(summaryContent).then(
            function () {
                console.log('Summary copied to clipboard');
                showTooltip('Copied to clipboard');
            },
            function (err) {
                console.error('Copy failed: ', err);
                showTooltip('Copy failed');
            }
        );
    }

    function showTooltip(message) {
        const tooltip = document.createElement('div');
        tooltip.textContent = message;
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);

        // Force browser to recalculate styles
        tooltip.offsetHeight;

        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 500);
        }, 2000);
    }

    document
        .getElementById('open-options')
        .addEventListener('click', function () {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        });

    async function showModelSelector(callback) {
        try {
            const result = await getStorageData([
                'llmConfigs',
                'prompts',
                'defaultPromptIndex',
            ]);
            console.log('showModelSelector result', result);

            const regenerateContainer = document.getElementById(
                'regenerate-container'
            );
            regenerateContainer.innerHTML = '';

            // 創建模型選擇下拉選單
            const modelSelect = createCustomSelect(
                'Select a model',
                result.llmConfigs,
                (config, index) =>
                    `${config.name} (${config.provider} - ${config.model})`,
                false // 指示這是 modelSelect
            );
            regenerateContainer.appendChild(modelSelect);

            // 創建提示選擇下拉選單
            let promptSelect;
            let selectedPromptIndex = -1;
            if (result.prompts && result.prompts.length > 0) {
                const promptOptions = [
                    { name: 'Use Default Prompt' },
                    ...result.prompts,
                ];
                promptSelect = createCustomSelect(
                    'Select a prompt',
                    promptOptions,
                    (prompt, index) => prompt.name,
                    true // 指示這是 promptSelect
                );
                regenerateContainer.appendChild(promptSelect);
            }

            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Confirm';
            confirmButton.disabled = true;
            confirmButton.addEventListener('click', async () => {
                const selectedModelIndex =
                    modelSelect.querySelector('.option.selected')?.dataset
                        .value;
                const selectedPromptIndex = promptSelect
                    ? promptSelect.querySelector('.option.selected')?.dataset
                          .value || -1
                    : -1;
                if (selectedModelIndex !== undefined) {
                    await callback(selectedModelIndex, selectedPromptIndex);
                    regenerateContainer.style.display = 'none';
                }
            });
            regenerateContainer.appendChild(confirmButton);

            regenerateContainer.style.display = 'block';

            // 啟用確認按鈕的函數
            function enableConfirmButton() {
                confirmButton.disabled = !(
                    modelSelect.querySelector('.option.selected') &&
                    (promptSelect
                        ? promptSelect.querySelector('.option.selected')
                        : true)
                );
            }

            // 為兩個選擇器添加事件監聽器
            [modelSelect, promptSelect].filter(Boolean).forEach((select) => {
                select
                    .querySelector('.selected-option')
                    .addEventListener('click', () => {
                        select.querySelector('.options-list').style.display =
                            select.querySelector('.options-list').style
                                .display === 'none'
                                ? 'block'
                                : 'none';
                    });

                select.querySelectorAll('.option').forEach((option) => {
                    option.addEventListener('click', () => {
                        select
                            .querySelectorAll('.option')
                            .forEach((opt) => opt.classList.remove('selected'));
                        option.classList.add('selected');
                        select.querySelector('.selected-option').textContent =
                            option.textContent;
                        select.querySelector('.options-list').style.display =
                            'none';
                        enableConfirmButton();
                    });
                });
            });
        } catch (error) {
            handleError(error.message);
        }
    }

    // 創建自定義下拉選單的輔助函數
    function createCustomSelect(
        defaultText,
        options,
        labelFunction,
        isPromptSelect = false
    ) {
        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select';

        const selectedOption = document.createElement('div');
        selectedOption.className = 'selected-option';
        selectedOption.textContent = defaultText;
        customSelect.appendChild(selectedOption);

        const optionsList = document.createElement('div');
        optionsList.className = 'options-list';
        optionsList.style.display = 'none';

        options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            if (isPromptSelect) {
                optionElement.dataset.value = index === 0 ? -1 : index - 1;
            } else {
                optionElement.dataset.value = index;
            }
            optionElement.textContent = labelFunction(option, index);
            optionsList.appendChild(optionElement);
        });

        customSelect.appendChild(optionsList);
        return customSelect;
    }

    document
        .getElementById('regenerate-summary')
        .addEventListener('click', async function () {
            showModelSelector(async function (
                selectedModelIndex,
                selectedPromptIndex
            ) {
                loadingIndicator.style.display = 'flex';
                errorMessage.style.display = 'none';
                summaryContainer.style.display = 'none';
                try {
                    await generateSummary(
                        selectedModelIndex,
                        selectedPromptIndex
                    );
                } catch (error) {
                    handleError(error.message);
                }
            });
        });
});
