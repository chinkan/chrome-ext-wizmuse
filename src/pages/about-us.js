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

    createBuyMeCoffeeButton();
}

function createBuyMeCoffeeButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'bmc-button-container';

    const link = document.createElement('a');
    link.href = 'https://www.buymeacoffee.com/chinkan.ai';
    link.target = '_blank';
    link.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 7px 10px 7px 10px;
      background-color: #FFDD00;
      border-radius: 5px;
      border: 1px solid transparent;
      box-shadow: 0px 1px 2px rgba(190, 190, 190, 0.5);
      text-decoration: none;
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      letter-spacing: 0.6px;
      color: #000000;
      transition: 0.3s all linear;
    `;

    const coffeeEmoji = document.createTextNode('☕');
    const text = document.createTextNode(' Buy me a coffee');

    link.appendChild(coffeeEmoji);
    link.appendChild(text);
    buttonContainer.appendChild(link);

    const targetDiv = document.getElementById('bmc-button');
    if (targetDiv) {
        targetDiv.appendChild(buttonContainer);
    } else {
        console.error('Could not find element with id "bmc-button"');
    }
}
