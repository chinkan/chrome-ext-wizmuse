document.addEventListener('DOMContentLoaded', function () {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const summaryContainer = document.getElementById('summary-container');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentUrl = tabs[0].url;
        const currentTitle = tabs[0].title;
        chrome.storage.local.get([currentUrl], function (result) {
            if (result[currentUrl]) {
                displaySummary(result[currentUrl]);
            } else {
                generateSummary(currentUrl, currentTitle);
            }
        });
    });

    function generateSummary(url, title) {
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        summaryContainer.style.display = 'none';

        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getPageContent' },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            handleError(chrome.runtime.lastError.message);
                            return;
                        }
                        if (response && response.content) {
                            chrome.runtime.sendMessage(
                                { action: 'summarize', text: response.content },
                                function (response) {
                                    if (chrome.runtime.lastError) {
                                        handleError(
                                            chrome.runtime.lastError.message
                                        );
                                    } else if (response && response.error) {
                                        handleError(response.error);
                                    } else if (response && response.summary) {
                                        chrome.storage.local.set(
                                            {
                                                [url]: {
                                                    summary: response.summary,
                                                    title: title,
                                                    timestamp: Date.now(),
                                                },
                                            },
                                            function () {
                                                displaySummary(
                                                    response.summary
                                                );
                                            }
                                        );
                                    } else {
                                        handleError(
                                            'Invalid summarization response'
                                        );
                                    }
                                }
                            );
                        } else {
                            handleError('Invalid response');
                        }
                    }
                );
            }
        );
    }

    function displaySummary(summary) {
        const markdownHtml = markdown(summary);
        document.getElementById('summary').innerHTML = markdownHtml;
        summaryContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    function handleError(message) {
        console.error('Error:', message);
        errorMessage.textContent = 'Error: ' + message;
        errorMessage.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    document
        .getElementById('copy-summary')
        .addEventListener('click', copySummary);

    function copySummary() {
        const summaryContent = document.getElementById('summary').innerText;
        navigator.clipboard.writeText(summaryContent).then(
            function () {
                console.log('摘要已成功複製到剪貼板');
                showTooltip('已複製到剪貼板');
            },
            function (err) {
                console.error('無法複製摘要: ', err);
                showTooltip('複製失敗');
            }
        );
    }

    function showTooltip(message) {
        const tooltip = document.createElement('div');
        tooltip.textContent = message;
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);

        // 強制瀏覽器重新計算樣式
        tooltip.offsetHeight;

        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 500);
        }, 2000);
    }

    document
        .getElementById('refresh-summary')
        .addEventListener('click', refreshSummary);

    function refreshSummary() {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                const currentUrl = tabs[0].url;
                generateSummary(currentUrl);
            }
        );
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

    function showModelSelector(callback) {
        chrome.storage.sync.get(['llmConfigs'], function (result) {
            const modelSelector = document.createElement('select');
            modelSelector.id = 'model-selector';
            result.llmConfigs.forEach((config, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${config.provider} - ${config.model}`;
                modelSelector.appendChild(option);
            });
            const regenerateContainer = document.getElementById(
                'regenerate-container'
            );
            regenerateContainer.innerHTML = '';
            regenerateContainer.appendChild(modelSelector);

            const confirmButton = document.createElement('button');
            confirmButton.textContent = '確認';
            confirmButton.addEventListener('click', () =>
                callback(modelSelector.value)
            );
            regenerateContainer.appendChild(confirmButton);
        });
    }

    document
        .getElementById('regenerate-summary')
        .addEventListener('click', function () {
            showModelSelector(function (selectedModelIndex) {
                chrome.tabs.query(
                    { active: true, currentWindow: true },
                    function (tabs) {
                        chrome.tabs.sendMessage(
                            tabs[0].id,
                            { action: 'getPageContent' },
                            function (response) {
                                if (response && response.content) {
                                    chrome.storage.sync.get(
                                        ['llmConfigs'],
                                        function (result) {
                                            const selectedConfig =
                                                result.llmConfigs[
                                                    selectedModelIndex
                                                ];
                                            chrome.runtime.sendMessage(
                                                {
                                                    action: 'summarize',
                                                    text: response.content,
                                                    config: selectedConfig,
                                                },
                                                function (response) {
                                                    if (
                                                        response &&
                                                        response.summary
                                                    ) {
                                                        displaySummary(
                                                            response.summary
                                                        );
                                                    } else if (
                                                        response &&
                                                        response.error
                                                    ) {
                                                        handleError(
                                                            response.error
                                                        );
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }
                            }
                        );
                    }
                );
            });
        });
});
