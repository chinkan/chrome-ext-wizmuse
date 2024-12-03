// Settings Page
import { getStorageData, setStorageData } from '../utils/storage.js';
import { NOTION_CONFIG } from '../config/notion.js';

export async function settings() {
    try {
        const response = await fetch('pages/settings.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const settingsHtml = await response.text();
        return settingsHtml;
    } catch (error) {
        console.error('Error loading settings.html:', error);
        return '<p>Error loading settings page</p>';
    }
}

export function initializeSettingsPage() {
    // Constants
    const elements = {
        exportSettingsBtn: document.getElementById('export-settings-btn'),
        importSettingsBtn: document.getElementById('import-settings-btn'),
        settingsFileInput: document.getElementById('settings-file-input'),
        connectNotionBtn: document.getElementById('connect-notion'),
        notionStatus: document.getElementById('notion-status'),
        notionSettings: document.getElementById('notion-settings'),
        notionDatabase: document.getElementById('notion-database'),
        autoSync: document.getElementById('auto-sync')
    };

    // Check if elements exist
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing elements:', missingElements);
        return;
    }

    // Initialize
    loadNotionSettings();

    // Event listeners
    elements.exportSettingsBtn.addEventListener('click', async () => {
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

    elements.importSettingsBtn.addEventListener('click', () => {
        elements.settingsFileInput.click();
    });

    elements.settingsFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                await importSettings(settings);
                alert('Settings imported successfully!');
                location.reload();
            } catch (error) {
                console.error('Error importing settings:', error);
                alert('Failed to import settings. Please check the file format and try again.');
            }
        };
        reader.readAsText(file);
    });

    elements.connectNotionBtn?.addEventListener('click', handleNotionConnect);
    elements.autoSync?.addEventListener('change', saveNotionSettings);

    // Notion integration handlers
    async function loadNotionSettings() {
        const settings = await getStorageData('notionSettings') || {
            connected: false,
            autoSync: false
        };
        updateNotionUI(settings);
    }

    function updateNotionUI(settings) {
        elements.notionStatus.textContent = settings.connected ? 'Connected' : 'Not Connected';
        elements.notionStatus.className = `connection-status ${settings.connected ? 'connected' : ''}`;
        elements.notionSettings.style.display = settings.connected ? 'block' : 'none';
        elements.autoSync.checked = settings.autoSync;
    }

    async function handleNotionConnect() {
        try {
            elements.notionStatus.textContent = 'Connecting to Notion...';

            // Construct the authorization URL
            const authUrl = new URL(NOTION_CONFIG.AUTH_URL);
            authUrl.searchParams.set('client_id', NOTION_CONFIG.CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', NOTION_CONFIG.REDIRECT_URI);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('owner', 'user');

            console.log('Starting OAuth flow with URL:', authUrl.toString());

            const result = await chrome.identity.launchWebAuthFlow({
                url: authUrl.toString(),
                interactive: true
            });

            if (!result) {
                throw new Error('No response from auth flow');
            }

            console.log('OAuth flow completed with result:', result);

            const resultUrl = new URL(result);
            const code = resultUrl.searchParams.get('code');

            if (!code) {
                throw new Error('No authorization code received');
            }

            elements.notionStatus.textContent = 'Authenticating...';
            const tokenResponse = await exchangeCodeForToken(code);

            if (!tokenResponse.access_token) {
                throw new Error('No access token received');
            }

            // Store the token and workspace information
            const settings = {
                connected: true,
                autoSync: false,
                accessToken: tokenResponse.access_token,
                workspaceId: tokenResponse.workspace_id,
                botId: tokenResponse.bot_id,
                workspaceName: tokenResponse.workspace_name,
                workspaceIcon: tokenResponse.workspace_icon,
            };

            await setStorageData('notionSettings', settings);

            elements.notionStatus.textContent = 'Successfully connected!';
            elements.notionStatus.classList.remove('error');
            updateNotionUI(settings);
            await loadNotionDatabases();

        } catch (error) {
            console.error('Error connecting to Notion:', error);
            elements.notionStatus.textContent = 'Connection failed: ' + error.message;
            elements.notionStatus.classList.add('error');
        }
    }

    async function exchangeCodeForToken(code) {
        try {
            const tokenResponse = await fetch(NOTION_CONFIG.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Notion-Version': NOTION_CONFIG.API_VERSION
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: NOTION_CONFIG.REDIRECT_URI
                })
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                throw new Error(errorData.error_description || 'Failed to exchange code for token');
            }

            return tokenResponse.json();
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }

    async function loadNotionDatabases() {
        try {
            const settings = await getStorageData('notionSettings');
            if (!settings?.connected || !settings?.accessToken) {
                return;
            }

            elements.notionStatus.textContent = 'Loading databases...';

            const response = await fetch(`${NOTION_CONFIG.API_URL}/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.accessToken}`,
                    'Notion-Version': NOTION_CONFIG.API_VERSION,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filter: {
                        value: 'database',
                        property: 'object'
                    },
                    sort: {
                        direction: 'ascending',
                        timestamp: 'last_edited_time'
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch databases');
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                elements.notionDatabase.innerHTML = data.results
                    .map(db => {
                        const title = db.title[0]?.plain_text || 'Untitled';
                        return `<option value="${db.id}">${title}</option>`;
                    })
                    .join('');

                // Save the selected database ID if none is selected
                if (!settings.selectedDatabaseId) {
                    await setStorageData('notionSettings', {
                        ...settings,
                        selectedDatabaseId: data.results[0].id
                    });
                } else {
                    // Set the previously selected database
                    elements.notionDatabase.value = settings.selectedDatabaseId;
                }

                elements.notionStatus.textContent = `Connected to ${settings.workspaceName || 'Notion'}`;
                elements.notionStatus.classList.remove('error');
                elements.notionSettings.style.display = 'block';
            } else {
                elements.notionStatus.textContent = 'No databases found';
                elements.notionDatabase.innerHTML = '<option value="">No databases available</option>';
            }
        } catch (error) {
            console.error('Error loading Notion databases:', error);
            elements.notionStatus.textContent = 'Failed to load databases: ' + error.message;
            elements.notionStatus.classList.add('error');
        }
    }

    elements.notionDatabase?.addEventListener('change', async (event) => {
        try {
            const settings = await getStorageData('notionSettings');
            await setStorageData('notionSettings', {
                ...settings,
                selectedDatabaseId: event.target.value
            });
        } catch (error) {
            console.error('Error saving database selection:', error);
        }
    });

    async function saveNotionSettings() {
        const settings = await getStorageData('notionSettings') || {};
        settings.autoSync = elements.autoSync.checked;
        await setStorageData('notionSettings', settings);
    }

    // Helper functions
    async function getAllSettings() {
        const [domains, prompts, llmConfigs, selectedLLMIndex, language, defaultPromptIndex] = await Promise.all([
            getStorageData('domains'),
            getStorageData('prompts'),
            getStorageData('llmConfigs'),
            getStorageData('selectedLLMIndex'),
            getStorageData('language'),
            getStorageData('defaultPromptIndex')
        ]);

        return {
            domains,
            prompts,
            options: {
                llmConfigs
            },
            selectedLLMIndex,
            language,
            defaultPromptIndex
        };
    }

    async function importSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            throw new Error('Invalid settings format');
        }

        // Import each settings category separately to maintain data structure
        if (settings.domains) {
            await setStorageData({ domains: settings.domains });
        }
        if (settings.prompts) {
            await setStorageData({ prompts: settings.prompts });
        }
        if (settings.options) {
            // Handle LLM configs separately to maintain array structure
            if (settings.options.llmConfigs) {
                await setStorageData({ 
                    llmConfigs: settings.options.llmConfigs,
                    selectedLLMIndex: settings.selectedLLMIndex || "0"
                });
            }
            // Handle other options
            await setStorageData({ 
                language: settings.language || 'en',
                defaultPromptIndex: settings.defaultPromptIndex || 0
            });
        }
        
        // Notify other parts of the extension about the settings update
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    }
}
