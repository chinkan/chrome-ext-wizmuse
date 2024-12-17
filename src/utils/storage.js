// Chrome存儲管理工具

const CONTENT_PREVIEW_LENGTH = 500; // Length of content preview to store in sync
const NOTE_LOCAL_KEY = 'notes_content'; // Key for local note content storage

// 設置數據到Chrome同步存儲
export const setStorageData = (patch) => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, (result) => {
            const newData = { ...result, ...patch };
            chrome.storage.sync.set(newData, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error setting storage data:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    });
};

// 從Chrome同步存儲獲取數據
export const getStorageData = (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, (result) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting storage data:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(result || {});
            }
        });
    });
};

// 從Chrome同步存儲獲取所有數據
export const getAllStorageData = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, (result) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting all storage data:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(result || {});
            }
        });
    });
};

// 從Chrome同步存儲刪除數據
export const removeStorageData = (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(key, () => {
            if (chrome.runtime.lastError) {
                console.error('Error removing storage data:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
};

// Helper function to create a preview of the content
const createContentPreview = (content) => {
    if (!content) return '';
    const preview = content.substring(0, CONTENT_PREVIEW_LENGTH);
    return preview + (content.length > CONTENT_PREVIEW_LENGTH ? '...' : '');
};