import './options.css';
import { aboutUs, initializeAboutUsPage } from './pages/about-us.js';
import { options, initializeOptionsPage } from './pages/options.js';
import { prompts, initializePromptsPage } from './pages/prompts.js';
import { history, initializeHistoryPage } from './pages/history.js';
import { domains, initializeDomainsPage } from './pages/domains.js';
import { getStorageData, setStorageData, getAllStorageData, removeStorageData } from './utils/storage.js';

document.addEventListener('DOMContentLoaded', function () {
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
                default:
                    pageContent = '<p>頁面不存在</p>';
            }

            contentDiv.innerHTML = pageContent;

            // Initialize page specific functionality
            switch (pageId) {
                case 'about':
                    initializeAboutUsPage();
                    break;
                case 'options':
                    initializeOptionsPage();
                    initializeSettingsIO();
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
            }
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

async function initializeSettingsIO() {
    const exportBtn = document.getElementById('export-settings');
    const importBtn = document.getElementById('import-settings');
    const importFile = document.getElementById('settings-file-input');
    const settingsHeader = document.getElementById('settings-header');
    const settingsContent = document.getElementById('settings-content');
    const toggleButton = document.getElementById('toggle-settings');

    if (!exportBtn || !importBtn || !importFile || !settingsHeader || !settingsContent || !toggleButton) return;

    exportBtn.addEventListener('click', async () => {
        try {
            const settings = await getAllSettings();
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wizmuse-settings.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting settings:', error);
            alert('Failed to export settings. Please try again.');
        }
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                await importSettings(settings);
                alert('Settings imported successfully! The page will now reload.');
                location.reload();
            } catch (error) {
                console.error('Error importing settings:', error);
                alert('Failed to import settings. Please check the file format.');
            }
        };
        reader.readAsText(file);
    });

    settingsHeader.addEventListener('click', () => {
        const isExpanded = settingsContent.style.display === 'block';
        settingsContent.style.display = isExpanded ? 'none' : 'block';
        toggleButton.classList.toggle('expanded', !isExpanded);
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
