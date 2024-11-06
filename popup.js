import { getStorageData, setStorageData } from './utils/storage.js';
import { YoutubeTranscript } from 'youtube-transcript';
import ContentExtractor from './utils/content-extractor.js';

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

            // 獲取域名設置
            const result = await getStorageData([
                `domainSettings.${currentDomain}`,
            ]);
            const domainSettings =
                result[`domainSettings.${currentDomain}`] || {};

            if (domainSettings) {
                selectedModelIndex =
                    selectedModelIndex ?? domainSettings.selectedModelIndex;
                selectPromptIndex =
                    selectPromptIndex ?? domainSettings.selectPromptIndex;
            }

            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'getPageContent',
            });

            let content = '';
            switch (response.siteType) {
                case ContentExtractor.SITE_TYPES.YOUTUBE:
                    try {
                        const transcript =
                            await YoutubeTranscript.fetchTranscript(
                                response.videoId
                            );
                        content = transcript
                            .map((entry) => entry.text)
                            .join(' ');
                    } catch (error) {
                        throw new Error(
                            '無法獲取 YouTube 字幕。可能影片沒有字幕或字幕不可用。'
                        );
                    }
                    break;

                // 未來可以在這裡添加更多網站的處理邏輯
                // case ContentExtractor.SITE_TYPES.MEDIUM:
                //     content = await handleMediumContent(response);
                //     break;

                case ContentExtractor.SITE_TYPES.NORMAL:
                    content = response.content;
                    break;

                default:
                    throw new Error('不支援的網站類型');
            }

            if (content) {
                await _summarize(
                    currentUrl,
                    currentTitle,
                    content,
                    selectedModelIndex,
                    selectPromptIndex,
                    isRegenerate
                );
            } else {
                throw new Error('無法獲取內容');
            }
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
                text: content,
                selectedIndex: selectedModelIndex,
                selectPromptIndex: selectPromptIndex,
            });

            if (response && response.error) {
                if (response.error.includes('RateLimitExceeded')) {
                    handleError(
                        new Error(
                            'Content is too large for current model. Please try with a smaller text or a different model.'
                        )
                    );
                } else {
                    handleError(new Error(response.error));
                }
            } else if (response && response.summary) {
                const key = `histories.${url}`;
                await setStorageData({
                    [key]: {
                        summary: response.summary,
                        title: title,
                        timestamp: Date.now(),
                        promptName: response.promptName,
                        providerName: response.providerName,
                    },
                });
                displaySummary(response.summary);
                if (
                    isRegenerate &&
                    selectedModelIndex !== null &&
                    selectPromptIndex !== null
                ) {
                    showDomainSettingTip(selectedModelIndex, selectPromptIndex);
                }
            } else {
                handleError(new Error('Invalid summary response'));
            }
        } catch (error) {
            console.error('Runtime error:', error.message);
            handleError(error);
        }
    }

    function displaySummary(summary) {
        const markdownHtml = markdown(summary);
        document.getElementById('summary').innerHTML = markdownHtml;
        summaryContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';

        // 移除舊嘅提示（如果有）
        const oldTip = document.querySelector('.tip-container');
        if (oldTip) {
            oldTip.remove();
        }
    }

    function handleError(error) {
        let message =
            'Something went wrong. Please refresh the page and try again.';
        if (error instanceof Error) {
            message = error.message || message;
        } else if (typeof error === 'string') {
            message = error;
        }
        errorMessage.textContent = message;
        errorMessage.style.display = 'flex';
        loadingIndicator.style.display = 'none';
        summaryContainer.style.display = 'none';
    }

    document
        .getElementById('copy-summary')
        .addEventListener('click', copySummary);

    async function copySummary() {
        try {
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const currentUrl = tabs[0].url;
            const result = await getStorageData([
                `histories.${currentUrl}`,
                'llmConfigs',
                'prompts',
                'selectedLLMIndex',
            ]);

            if (result && result[`histories.${currentUrl}`]) {
                const summaryData = result[`histories.${currentUrl}`];
                const selectedLLMIndex = result.selectedLLMIndex;
                const selectedLLM = result.llmConfigs[selectedLLMIndex];

                const promptName = summaryData.promptName || 'Default Prompt';
                const providerName = selectedLLM ? selectedLLM.provider : '';

                let poweredByMessage = `\n\nSummarized by WizMuse`;
                if (promptName !== 'Default Prompt') {
                    poweredByMessage += ` using ${promptName}`;
                }
                if (providerName && providerName !== 'Unknown Provider') {
                    poweredByMessage += ` by ${providerName}`;
                }
                poweredByMessage += `.\nUrl: ${currentUrl}`;

                const fullText = summaryData.summary + poweredByMessage;

                try {
                    await navigator.clipboard.writeText(fullText);
                    console.log('Summary copied to clipboard');
                    showTooltip('Copied to clipboard');
                } catch (err) {
                    console.error('Clipboard write failed:', err);
                    fallbackCopy(fullText);
                }
            } else {
                console.error('No summary found for the current URL');
                showTooltip('No summary available');
            }
        } catch (err) {
            console.error('Copy failed: ', err);
            showTooltip('Copy failed');
        }
    }

    function fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            const msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
            showTooltip('Copied to clipboard');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            showTooltip('Copy failed');
        }
        document.body.removeChild(textArea);
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
            handleError(error);
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
                        selectedPromptIndex,
                        true // 標記為重新生成
                    );
                } catch (error) {
                    handleError(error.message);
                }
            });
        });

    // 新增一個函數嚟顯示域名設置提示
    async function showDomainSettingTip(selectedModelIndex, selectPromptIndex) {
        try {
            const result = await getStorageData(['llmConfigs', 'prompts']);
            const selectedModel = result.llmConfigs[selectedModelIndex];
            const selectedPrompt =
                selectPromptIndex !== -1
                    ? result.prompts[selectPromptIndex]
                    : null;

            // 獲取當前頁面的 URL 和基本域名
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const currentUrl = tabs[0].url;
            const currentDomain = getBaseDomain(currentUrl);

            const tipContainer = document.createElement('div');
            tipContainer.className = 'tip-container';

            const tipElement = document.createElement('div');
            tipElement.className = 'tip';
            tipElement.textContent = `Tip: Set "${selectedModel.name}" ${
                selectedPrompt
                    ? `with "${selectedPrompt.name}" prompt`
                    : 'with default prompt'
            } as default for ${currentDomain}.`;
            tipContainer.appendChild(tipElement);

            const setDefaultButton = document.createElement('button');
            setDefaultButton.textContent = 'Set as Default';
            setDefaultButton.className = 'set-default-button';
            setDefaultButton.addEventListener('click', async () => {
                const domainSettingsResult = await getStorageData([
                    `domainSettings.${currentDomain}`,
                ]);
                let domainSettings =
                    domainSettingsResult[`domainSettings.${currentDomain}`] ||
                    {};

                domainSettings = {
                    selectedModelIndex: selectedModelIndex,
                    selectPromptIndex: selectPromptIndex,
                    llmConfigName: selectedModel.name,
                    promptName: selectedPrompt
                        ? selectedPrompt.name
                        : 'Default Prompt',
                };

                await setStorageData({
                    [`domainSettings.${currentDomain}`]: domainSettings,
                });

                showTooltip(`Default set for ${currentDomain}`);
            });
            tipContainer.appendChild(setDefaultButton);

            const summaryContainer =
                document.getElementById('summary-container');
            // 將提示插入到摘要容器的頂部
            summaryContainer.insertBefore(
                tipContainer,
                summaryContainer.firstChild
            );
        } catch (error) {
            console.error('Error showing domain setting tip:', error);
        }
    }

    function getBaseDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            console.error('Invalid URL:', url);
            return url;
        }
    }
});
