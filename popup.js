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

    async function generateSummary(selectedIndex = null) {
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
                    selectedIndex
                );
            } else {
                throw new Error('Invalid response');
            }
        } catch (error) {
            handleError(error.message);
        }
    }

    async function _summarize(url, title, content, selectedIndex) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'summarize',
                text: content,
                selectedIndex: selectedIndex,
            });

            console.log('response2', response);

            if (response && response.error) {
                handleError(response.error);
            } else if (response && response.summary) {
                await setStorageData({
                    [url]: {
                        summary: response.summary,
                        title: title,
                        timestamp: Date.now(),
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
        console.log('displaySummary', summary);
        const markdownHtml = markdown(summary);
        document.getElementById('summary').innerHTML = markdownHtml;
        summaryContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    function handleError(message) {
        console.error('Error:', message);
        errorMessage.textContent = message;
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
            const result = await getStorageData('llmConfigs');
            console.log('showModelSelector result', result);

            const regenerateContainer = document.getElementById(
                'regenerate-container'
            );
            regenerateContainer.innerHTML = '';

            // 創建自定義下拉選單
            const customSelect = document.createElement('div');
            customSelect.className = 'custom-select';

            const selectedOption = document.createElement('div');
            selectedOption.className = 'selected-option';
            selectedOption.textContent = 'Select a model';
            customSelect.appendChild(selectedOption);

            const optionsList = document.createElement('div');
            optionsList.className = 'options-list';
            optionsList.style.display = 'none';

            result.llmConfigs.forEach((config, index) => {
                const option = document.createElement('div');
                option.className = 'option';
                option.dataset.value = index;
                option.textContent = `${config.name} (${config.provider} - ${config.model})`;
                option.addEventListener('click', () => {
                    optionsList
                        .querySelectorAll('.option')
                        .forEach((opt) => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedOption.textContent = option.textContent;
                    optionsList.style.display = 'none';
                    confirmButton.disabled = false;
                });
                optionsList.appendChild(option);
            });

            customSelect.appendChild(optionsList);
            regenerateContainer.appendChild(customSelect);

            selectedOption.addEventListener('click', () => {
                optionsList.style.display =
                    optionsList.style.display === 'none' ? 'block' : 'none';
            });

            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Confirm';
            confirmButton.disabled = true;
            confirmButton.addEventListener('click', async () => {
                const selectedOption =
                    optionsList.querySelector('.option.selected');
                if (selectedOption) {
                    const selectedIndex = selectedOption.dataset.value;
                    await callback(selectedIndex);
                    regenerateContainer.style.display = 'none';
                }
            });
            regenerateContainer.appendChild(confirmButton);

            regenerateContainer.style.display = 'block';
        } catch (error) {
            handleError(error.message);
        }
    }

    document
        .getElementById('regenerate-summary')
        .addEventListener('click', async function () {
            showModelSelector(async function (selectedModelIndex) {
                loadingIndicator.style.display = 'flex';
                errorMessage.style.display = 'none';
                summaryContainer.style.display = 'none';
                try {
                    await generateSummary(selectedModelIndex);
                } catch (error) {
                    handleError(error.message);
                }
            });
        });
});
