chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'getPageContent') {
        // 清理內容
        let content = document.body.innerText;
        content = content.replace(/\s+/g, ' ').trim(); // 移除多餘空白
        content = content.replace(/<[^>]*>/g, ''); // 移除 HTML 標籤
        sendResponse({ content: content });
    }
});
