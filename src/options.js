import './options.css';
import { aboutUs, initializeAboutUsPage } from './pages/about-us.js';
import { options, initializeOptionsPage } from './pages/options.js';
import { prompts, initializePromptsPage } from './pages/prompts.js';
import { history, initializeHistoryPage } from './pages/history.js';
import { domains, initializeDomainsPage } from './pages/domains.js';
import { settings, initializeSettingsPage } from './pages/settings.js';
import { getStorageData, setStorageData, getAllStorageData, removeStorageData } from './utils/storage.js';

document.addEventListener('DOMContentLoaded', async function () {
    const contentDiv = document.getElementById('content');
    const menuItems = document.querySelectorAll('.menu-item');

    checkFirstInstall(function () {
        changePage('about');
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
                case 'domains':
                    pageContent = await domains();
                    break;
                case 'history':
                    pageContent = await history();
                    break;
                case 'settings':
                    pageContent = await settings();;
                    break;
                default:
                    pageContent = '<p>Page not found</p>';
            }

            contentDiv.innerHTML = pageContent;

            // Initialize page specific functionality
            switch (pageId) {
                case 'about':
                    initializeAboutUsPage();
                    break;
                case 'options':
                    initializeOptionsPage();
                    break;
                case 'prompts':
                    initializePromptsPage();
                    break;
                case 'domains':
                    initializeDomainsPage();
                    break;
                case 'history':
                    initializeHistoryPage();
                    break;
                case 'settings':
                    initializeSettingsPage();
                    break;
                }
            } catch (error) {
            console.error('加載頁面時出錯:', error);
            contentDiv.innerHTML = '<p>加載頁面時出錯</p>';
        }
    }

    async function loadPage(pageName) {
        try {
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const content = await response.text();
            return content;

            // Load and execute the page's JavaScript if it exists
            const script = document.createElement('script');
            script.type = 'module';
            script.src = `pages/${pageName}.js`;
            document.body.appendChild(script);
        } catch (error) {
            console.error('Error loading page:', error);
            contentDiv.innerHTML = '<p>Error loading page</p>';
        }
    }

    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Remove active class from all menu items
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');

            // Load the corresponding page
            const pageName = item.getAttribute('data-page');
            await changePage(pageName);
        });
    });

    // Load default page (about)
    const defaultPage = 'about';
    await changePage(defaultPage);
    document.querySelector(`[data-page="${defaultPage}"]`).classList.add('active');
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

async function getAllSettings() {
    const allData = await getAllStorageData();
    
    // Extract domain settings
    const domains = {};
    for (let key in allData) {
        if (key.startsWith('domainSettings.')) {
            const domain = key.split('domainSettings.')[1];
            domains[domain] = allData[key];
        }
    }

    return {
        domains,
        prompts: allData.prompts || [],
        options: {
            llmConfigs: allData.llmConfigs || [],
            language: allData.language
        },
        defaultPromptIndex: allData.defaultPromptIndex,
        selectedLLMIndex: allData.selectedLLMIndex,
        language: allData.language || {}
    };
}

async function importSettings(settings) {
    // First clear existing domain settings
    const allData = await getAllStorageData();
    const domainKeys = Object.keys(allData).filter(key => key.startsWith('domainSettings.'));
    await Promise.all(domainKeys.map(key => removeStorageData(key)));

    // Import domain settings
    const domainTasks = Object.entries(settings.domains).map(([domain, settings]) => 
        setStorageData({ [`domainSettings.${domain}`]: settings })
    );

    // Import other settings
    const tasks = [
        ...domainTasks,
        setStorageData({ prompts: settings.prompts }),
        setStorageData({ llmConfigs: settings.options.llmConfigs }),
        setStorageData({ defaultPromptIndex: settings.defaultPromptIndex }),
        setStorageData({ selectedLLMIndex: settings.selectedLLMIndex }),
        setStorageData({ language: settings.language })
    ];

    await Promise.all(tasks);
}
