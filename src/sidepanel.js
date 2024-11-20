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
        const key = `histories.${currentUrl}`;
        const result = await getStorageData([key]);
        if (result && result[key]) {
            displaySummary(result[key].summary);
        } else {
            await generateSummary();
        }
    } catch (error) {
        handleError(error);
    }

    async function generateSummary(
        selectedModelIndex = null,
        selectPromptIndex = null,
        isRegenerate = false
    ) {
        loadingIndicator.style.display = 'flex';
        errorMessage.style.display = 'none';
        summaryContainer.style.display = 'none';

        try {
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const currentTab = tabs[0];
            const currentUrl = currentTab.url;
            const currentTitle = currentTab.title;
            const currentDomain = getBaseDomain(currentUrl);

            // Get domain settings
            const result = await getStorageData([`domainSettings.${currentDomain}`]);
            const domainSettings = result[`domainSettings.${currentDomain}`] || {};

            if (domainSettings) {
                selectedModelIndex =
                    selectedModelIndex ??
                    domainSettings.selectedModelIndex;
                selectPromptIndex =
                    selectPromptIndex ??
                    domainSettings.selectPromptIndex;
            }

            // Get page content
            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'getContent',
            });

            if (!response || !response.content) {
                throw new Error('Failed to get page content');
            }

            const summary = await _summarize(
                currentUrl,
                currentTitle,
                response.content,
                selectedModelIndex,
                selectPromptIndex,
                isRegenerate
            );

            displaySummary(summary);
            
            // Save to history
            const historyData = {
                summary,
                title: currentTitle,
                url: currentUrl,
                timestamp: Date.now(),
            };
            await setStorageData({ [`histories.${currentUrl}`]: historyData });
        } catch (error) {
            handleError(error);
        }
    }

    async function _summarize(
        url,
        title,
        content,
        selectedModelIndex,
        selectPromptIndex,
        isRegenerate
    ) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'summarize',
                url,
                title,
                text: content,
                selectedIndex: selectedModelIndex,
                selectPromptIndex,
                isRegenerate,
            });

            if (!response || !response.summary) {
                throw new Error('Failed to generate summary');
            }

            return response.summary;
        } catch (error) {
            throw error;
        }
    }

    function displaySummary(summary) {
        const summaryElement = document.getElementById('summary');
        summaryElement.innerHTML = window.drawdown(summary);
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'none';
        summaryContainer.style.display = 'block';
    }

    function handleError(error) {
        console.error('Error:', error);
        loadingIndicator.style.display = 'none';
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
        summaryContainer.style.display = 'none';
    }

    document
        .getElementById('copy-summary')
        .addEventListener('click', copySummary);

    async function copySummary() {
        const summaryElement = document.getElementById('summary');
        const text = summaryElement.innerText;

        try {
            await navigator.clipboard.writeText(text);
            showTooltip('Summary copied to clipboard!');
        } catch (err) {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showTooltip('Summary copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text:', err);
            showTooltip('Failed to copy text');
        }
        document.body.removeChild(textArea);
    }

    function showTooltip(message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;
        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.classList.add('show');
            setTimeout(() => {
                tooltip.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(tooltip);
                }, 300);
            }, 2000);
        }, 1);
    }

    document
        .getElementById('open-options')
        .addEventListener('click', function () {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            }
        });

    document
        .getElementById('regenerate-summary')
        .addEventListener('click', async function () {
            showModelSelector(async function (selectedModelIndex, selectPromptIndex) {
                await generateSummary(selectedModelIndex, selectPromptIndex, true);
            });
        });

    function showModelSelector(callback) {
        const regenerateContainer = document.getElementById('regenerate-container');
        regenerateContainer.style.display = 'block';
        regenerateContainer.innerHTML = '';

        getStorageData(['llmConfigs', 'selectedLLMIndex', 'prompts', 'selectedPromptIndex'])
            .then((result) => {
                if (!result.llmConfigs || !result.selectedLLMIndex) {
                    throw new Error(
                        'You have not set up your LLM provider and API key. Please go to the options page to set up your LLM provider and API key.'
                    );
                }

                const modelSelect = createCustomSelect(
                    'Select Model',
                    result.llmConfigs,
                    (config) => config.name,
                    false
                );
                const promptSelect = createCustomSelect(
                    'Select Prompt',
                    result.prompts,
                    (prompt) => prompt.name,
                    true
                );

                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';

                const confirmButton = document.createElement('button');
                confirmButton.textContent = 'Confirm';
                confirmButton.className = 'primary-button';
                confirmButton.onclick = () => {
                    regenerateContainer.style.display = 'none';
                    callback(
                        parseInt(modelSelect.value),
                        parseInt(promptSelect.value)
                    );
                    showDomainSettingTip(
                        parseInt(modelSelect.value),
                        parseInt(promptSelect.value)
                    );
                };

                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Cancel';
                cancelButton.className = 'secondary-button';
                cancelButton.onclick = () => {
                    regenerateContainer.style.display = 'none';
                };

                buttonContainer.appendChild(confirmButton);
                buttonContainer.appendChild(cancelButton);

                regenerateContainer.appendChild(modelSelect);
                regenerateContainer.appendChild(promptSelect);
                regenerateContainer.appendChild(buttonContainer);

                modelSelect.value = result.selectedLLMIndex;
                promptSelect.value =
                    result.selectedPromptIndex !== undefined
                        ? result.selectedPromptIndex
                        : '0';
            })
            .catch((error) => {
                handleError(error);
            });
    }

    function createCustomSelect(
        defaultText,
        options,
        labelFunction,
        isPromptSelect = false
    ) {
        const select = document.createElement('select');
        select.className = 'model-select';

        options.forEach((option, index) => {
            const optElement = document.createElement('option');
            optElement.value = index;
            optElement.textContent = labelFunction(option);
            select.appendChild(optElement);
        });

        return select;
    }

    async function showDomainSettingTip(selectedModelIndex, selectPromptIndex) {
        try {
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const currentUrl = tabs[0].url;
            const currentDomain = getBaseDomain(currentUrl);

            const tipContainer = document.createElement('div');
            tipContainer.className = 'tip';
            tipContainer.textContent =
                'Tip: You can set this as the default model for ' +
                currentDomain +
                ' in the domain settings.';

            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save as Default';
            saveButton.className = 'secondary-button';
            saveButton.onclick = async () => {
                try {
                    await setStorageData({
                        [`domainSettings.${currentDomain}`]: {
                            selectedModelIndex,
                            selectPromptIndex,
                        },
                    });
                    tipContainer.textContent = 'Settings saved for ' + currentDomain;
                    setTimeout(() => {
                        tipContainer.remove();
                    }, 2000);
                } catch (error) {
                    console.error('Error saving domain settings:', error);
                }
            };

            tipContainer.appendChild(saveButton);
            document.getElementById('summary-container').appendChild(tipContainer);
        } catch (error) {
            console.error('Error showing domain setting tip:', error);
        }
    }

    function getBaseDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            console.error('Error parsing URL:', e);
            return url;
        }
    }
});
