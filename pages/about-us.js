// 關於我們頁面
// 從 manifest.json 獲取版本號
// 返回帶有版本號的 about-us.html

export async function aboutUs() {
    try {
        // 使用 fetch 來加載 HTML 內容
        const response = await fetch('pages/about-us.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let aboutUsHtml = await response.text();
        return aboutUsHtml;
    } catch (error) {
        console.error('加載 about-us.html 時出錯:', error);
        return '<p>加載關於頁面時出錯</p>';
    }
}

export function initializeAboutUsPage() {
    // 從 manifest.json 獲取版本號
    const manifestData = chrome.runtime.getManifest();
    const version = manifestData.version;

    document.getElementById(
        'version'
    ).textContent = `Version: ${version} (Beta)`;
}
