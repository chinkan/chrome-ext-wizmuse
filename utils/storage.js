// Chrome存儲管理工具

// 設置數據到Chrome同步存儲
export const setStorageData = (patch) => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, (result) => {
            console.log('現有數據', result);
            const newData = { ...result, ...patch };
            console.log('新數據', newData);
            chrome.storage.sync.set(newData, () => {
                console.log('新數據已存儲', newData);
                if (chrome.runtime.lastError) {
                    console.log('錯誤', chrome.runtime.lastError);
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
    console.log('獲取鍵', key);
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, (result) => {
            console.log('獲取結果', result);
            if (chrome.runtime.lastError) {
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
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
};
