import { aboutUs, initializeAboutUsPage } from './pages/about-us.js';
import { options, initializeOptionsPage } from './pages/options.js';
import { prompts, initializePromptsPage } from './pages/prompts.js';
import { history, initializeHistoryPage } from './pages/history.js';
import { getStorageData, setStorageData } from './utils/storage.js';

document.addEventListener('DOMContentLoaded', function () {
    const contentDiv = document.getElementById('content');
    const menuItems = document.querySelectorAll('.menu-item');

    checkFirstInstall(function () {
        changePage('options');
    });

    menuItems.forEach((item) => {
        item.addEventListener('click', function () {
            const pageId = this.getAttribute('data-page');
            changePage(pageId);
        });
    });

    async function changePage(pageId) {
        menuItems.forEach((i) => i.classList.remove('active'));
        document
            .querySelector(`[data-page="${pageId}"]`)
            .classList.add('active');

        let pageContent;
        try {
            switch (pageId) {
                case 'about':
                    pageContent = await aboutUs();
                    break;
                case 'options':
                    pageContent = await options();
                    break;
                case 'prompts':
                    pageContent = await prompts();
                    break;
                case 'history':
                    pageContent = await history();
                    break;
                default:
                    pageContent = '<p>頁面不存在</p>';
            }

            contentDiv.innerHTML = pageContent;

            // 使用 setTimeout 來確保 DOM 已經更新
            setTimeout(() => {
                // 為新載入的頁面初始化所需的功能
                if (pageId === 'about') {
                    initializeAboutUsPage();
                } else if (pageId === 'options') {
                    initializeOptionsPage();
                } else if (pageId === 'prompts') {
                    initializePromptsPage();
                } else if (pageId === 'history') {
                    initializeHistoryPage();
                }
            }, 0);
        } catch (error) {
            console.error('加載頁面時出錯:', error);
            contentDiv.innerHTML = '<p>加載頁面時出錯</p>';
        }
    }
});

function checkFirstInstall(callback) {
    getStorageData(['isFirstInstall']).then((result) => {
        if (result.isFirstInstall === undefined) {
            // 這是首次安裝
            setStorageData({
                isFirstInstall: false,
                llmConfigs: [
                    {
                        name: 'OpenAI Example',
                        provider: 'openai',
                        apiKey: 'sk-proj-93345678901234567890', // example api key
                        model: 'gpt-4o',
                        endpoint: 'https://api.openai.com/v1/',
                    },
                ],
                selectedLLMIndex: 0,
                language: 'English',
            })
                .then(() => {
                    callback();
                })
                .catch((error) => {
                    console.error('存儲數據時出錯:', error);
                });
            // 可以在這裡添加一些歡迎信息或指導
            alert(
                'Welcome to WizMuse! Please set up your LLM provider and API key.'
            );
        } else {
            callback();
        }
    });
}
