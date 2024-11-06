import ContentExtractor from './utils/content-extractor.js';

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'getPageContent') {
        const url = window.location.href;
        const siteType = ContentExtractor.getSiteType(url);

        switch (siteType) {
            case ContentExtractor.SITE_TYPES.YOUTUBE:
                const videoId = ContentExtractor.getYoutubeVideoId(url);
                sendResponse({
                    siteType: siteType,
                    videoId: videoId,
                });
                break;

            // 未來可以在這裡添加更多網站的處理邏輯
            // case ContentExtractor.SITE_TYPES.MEDIUM:
            //     // 處理 Medium 的特殊邏輯
            //     break;

            default:
                const content = ContentExtractor.cleanTextContent(
                    document.body.innerText
                );
                sendResponse({
                    siteType: ContentExtractor.SITE_TYPES.NORMAL,
                    content: content,
                });
        }
    }
});
