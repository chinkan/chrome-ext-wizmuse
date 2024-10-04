// History Page
import { getStorageData, setStorageData } from '../utils/storage.js';

export async function history() {
    try {
        const response = await fetch('pages/history.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const historyHtml = await response.text();
        return historyHtml;
    } catch (error) {
        console.error('加載 history.html 時出錯:', error);
        return '<p>加載歷史頁面時出錯</p>';
    }
}

export function initializeHistoryPage() {
    const historyTable = document
        .getElementById('history-table')
        .getElementsByTagName('tbody')[0];

    loadSummaryHistory();

    function loadSummaryHistory() {
        historyTable.innerHTML = '';
        getStorageData(['histories']).then((items) => {
            for (let key in items.histories) {
                if (key.startsWith('http')) {
                    const data = items.histories[key];
                    const row = historyTable.insertRow();
                    row.innerHTML = `
                        <td><a href="${key}" target="_blank">${key}</a></td>
                        <td>${data.title}</td>
                        <td>${new Date(data.timestamp).toLocaleString()}</td>
                        <td>
                            <div class="summary-container">
                                <span class="summary-text">${
                                    typeof data?.summary === 'string'
                                        ? data?.summary?.substring(0, 100)
                                        : JSON.stringify(data?.summary)
                                }...</span>
                                <button class="copy-btn action-btn" data-url="${key}" title="複製摘要">
                                    <i class="material-icons">content_copy</i>
                                </button>
                            </div>
                        </td>
                        <td>
                            <button class="delete-btn action-btn" data-url="${key}" title="刪除摘要">
                                <i class="material-icons">delete</i>
                            </button>
                        </td>
                    `;
                }
            }
        });
    }

    historyTable.addEventListener('click', function (e) {
        const row = e.target.closest('tr');
        const url = row.cells[0].textContent;
        if (e.target.tagName === 'TD') {
            getStorageData(['histories']).then((result) => {
                if (result.histories[url]) {
                    alert(result.histories[url].summary);
                }
            });
        } else if (
            (e.target.tagName === 'I' &&
                e.target.parentElement.classList.contains('copy-btn')) ||
            e.target.classList.contains('copy-btn')
        ) {
            getStorageData(['histories']).then((result) => {
                if (result.histories[url]) {
                    setTimeout(() => {
                        navigator.clipboard
                            .writeText(result.histories[url].summary)
                            .then(() => {
                                alert('摘要已複製到剪貼板');
                            })
                            .catch((err) => {
                                console.error('複製失敗:', err);
                                alert('複製失敗，請手動複製');
                            });
                    }, 100);
                }
            });
        } else if (
            (e.target.tagName === 'I' &&
                e.target.parentElement.classList.contains('delete-btn')) ||
            e.target.classList.contains('delete-btn')
        ) {
            getStorageData(['histories']).then((result) => {
                if (confirm('您確定要刪除這條歷史記錄嗎？')) {
                    delete result.histories[url];
                    setStorageData({ histories: result.histories }).then(() => {
                        row.remove();
                    });
                }
            });
        }
    });
}
