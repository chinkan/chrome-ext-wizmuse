// History Page
import { getStorageData, removeStorageData , getAllStorageData } from '../utils/storage.js';

export async function history() {
    try {
        const response = await fetch('pages/history.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const historyHtml = await response.text();
        return historyHtml;
    } catch (error) {
        console.error('Error loading history.html:', error);
        return '<p>Error loading history page</p>';
    }
}

export function initializeHistoryPage() {
    const elements = {
        historyTable: document
            .getElementById('history-table')
            .getElementsByTagName('tbody')[0],
        summaryModal: document.getElementById('summary-modal'),
        summaryContent: document.getElementById('summary-content'),
        closeSummaryModal: document.getElementById('close-summary-modal'),
    };

    loadSummaryHistory();

    function loadSummaryHistory() {
        elements.historyTable.innerHTML = '';
        getAllStorageData().then((items) => {
            for (let key in items) {
                if (key.startsWith('histories.')) {
                    const url = key.replace('histories.', '');
                    const data = items[key];
                    const row = elements.historyTable.insertRow();
                    row.innerHTML = `
                        <td><a href="${url}" target="_blank">${url}</a></td>
                        <td>${data.title}</td>
                        <td>${new Date(data.timestamp).toLocaleString()}</td>
                        <td>
                            <div class="summary-container">
                                <span class="summary-text">${
                                    typeof data?.summary === 'string'
                                        ? data?.summary?.substring(0, 100)
                                        : JSON.stringify(data?.summary)
                                }...</span>
                            </div>
                        </td>
                        <td>
                            <button class="copy-btn action-btn" data-url="${url}" title="Copy Summary">
                                <i class="material-icons">content_copy</i>
                            </button>
                            <button class="delete-btn action-btn" data-url="${url}" title="Delete Summary">
                                <i class="material-icons">delete</i>
                            </button>
                        </td>
                    `;
                }
            }
        });
    }

    elements.historyTable.addEventListener('click', function (e) {
        const row = e.target.closest('tr');
        if (!row) return;
        const url = row.cells[0].textContent;
        const target = e.target.closest('button');
        if (!target) {
            showSummary(url);
        } else if (target.classList.contains('copy-btn')) {
            copySummary(url);
        } else if (target.classList.contains('delete-btn')) {
            deleteHistory(url, row);
        }
    });

    elements.closeSummaryModal.addEventListener('click', function () {
        elements.summaryModal.style.display = 'none';
    });

    function showSummary(url) {
        getStorageData([`histories.${url}`]).then((result) => {
            if (result[`histories.${url}`]) {
                elements.summaryContent.textContent =
                    result[`histories.${url}`].summary;
                elements.summaryModal.style.display = 'block';
            }
        });
    }

    function copySummary(url) {
        getStorageData([`histories.${url}`, 'llmConfigs', 'prompts']).then(
            (result) => {
                if (result[`histories.${url}`]) {
                    const summaryData = result[`histories.${url}`];
                    const promptName =
                        summaryData.promptName || 'Default Prompt';
                    const providerName = summaryData.providerName;

                    let poweredByMessage = `\n\nSummarized by WizMuse`;
                    if (promptName !== 'Default Prompt') {
                        poweredByMessage += ` using ${promptName}`;
                    }
                    if (providerName && providerName !== 'Unknown Provider') {
                        poweredByMessage += ` by ${providerName}`;
                    }
                    poweredByMessage += `.\nUrl: ${url}`;

                    const fullText = summaryData.summary + poweredByMessage;

                    navigator.clipboard
                        .writeText(fullText)
                        .then(() => {
                            alert('Summary copied to clipboard');
                        })
                        .catch((err) => {
                            console.error('Clipboard write failed:', err);
                            fallbackCopy(fullText);
                        });
                }
            }
        );
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
            alert('Summary copied to clipboard');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('Copy failed, please copy manually');
        }
        document.body.removeChild(textArea);
    }

    function deleteHistory(url, row) {
        if (confirm('Are you sure you want to delete this history record?')) {
            removeStorageData([`histories.${url}`]).then(() => {
                row.remove();
            });
        }
    }
}
