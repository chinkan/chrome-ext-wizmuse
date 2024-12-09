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

// Export the initialization function
export async function initializeSettingsPage() {
    const elements = {
        exportBtn: document.getElementById('export-settings-btn'),
        importBtn: document.getElementById('import-settings-btn'),
        fileInput: document.getElementById('settings-file-input'),
        connectNotionBtn: document.getElementById('connect-notion'),
        notionStatus: document.getElementById('notion-status'),
        notionSettings: document.getElementById('notion-settings'),
        notionDatabase: document.getElementById('notion-database'),
        autoSync: document.getElementById('auto-sync'),
        notionClientId: document.getElementById('notion-client-id'),
        notionClientSecret: document.getElementById('notion-client-secret'),
        notionToggle: document.getElementById('notion-toggle'),
        notionCredentials: document.getElementById('notion-credentials')
    };

    // Initialize event listeners and load settings
    await setupEventListeners(elements);
    await loadInitialSettings(elements);
    
    // Initialize Notion form state
    const data = await chrome.storage.sync.get(['notionSettings']);
    const isConnected = data.notionSettings?.connected || false;
    updateNotionFormState(elements, !isConnected);
}

async function setupEventListeners(elements) {
    elements.exportBtn?.addEventListener('click', handleExport);
    elements.importBtn?.addEventListener('click', () => elements.fileInput.click());
    elements.autoSync?.addEventListener('change', saveNotionSettings);

    elements.fileInput?.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', async (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                await importSettings(settings);
                alert('Settings imported successfully!');
            } catch (error) {
                console.error('Import error:', error);
                alert('Failed to import settings. Please check the file format.');
            }
        });
        reader.readAsText(file);
    });

    elements.connectNotionBtn?.addEventListener('click', handleNotionConnect);

    elements.notionToggle?.addEventListener('click', () => {
        const isExpanded = elements.notionCredentials.classList.contains('expanded');
        updateNotionFormState(elements, !isExpanded);
    });
}

async function loadInitialSettings(elements) {
    try {
        // Load saved credentials
        const data = await chrome.storage.sync.get(['notionClientId', 'notionClientSecret']);
        const notionClientId = data.notionClientId;
        const notionClientSecret = data.notionClientSecret;
        if (notionClientId) {
            elements.notionClientId.value = notionClientId;
        }
        if (notionClientSecret) {
            elements.notionClientSecret.value = notionClientSecret;
        }

        // Load other settings
        await loadNotionSettings();
    } catch (error) {
        console.error('Failed to load initial settings:', error);
    }
}

async function connectToNotion(elements, clientId, clientSecret) {
    try {
        // Save credentials
        await chrome.storage.sync.set({
            notionClientId: clientId,
            notionClientSecret: clientSecret
        });

        const state = generateRandomString();
        const authUrl = `${NOTION_CONFIG.AUTH_URL}?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(NOTION_CONFIG.REDIRECT_URI)}&state=${state}`;
        
        const result = await chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        });
        
        const url = new URL(result);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        
        if (state !== returnedState) {
            throw new Error('State mismatch in OAuth flow');
        }
        
        if (code) {
            const tokenData = await exchangeCodeForToken(code);
            
            const notionSettings = {
                connected: true,
                accessToken: tokenData.access_token,
                workspaceId: tokenData.workspace_id,
                workspaceName: tokenData.workspace_name,
                workspaceIcon: tokenData.workspace_icon,
                botId: tokenData.bot_id,
                autoSync: false
            };
            
            await chrome.storage.sync.set({ notionSettings: notionSettings });
            
            const savedData = await chrome.storage.sync.get(['notionSettings']);
            if (!savedData.notionSettings?.accessToken) {
                throw new Error('Failed to save access token');
            }
            
            updateNotionConnectionStatus(true);
            await loadNotionDatabases();
        }
    } catch (error) {
        console.error('Error in connectToNotion:', error);
        elements.notionStatus.textContent = 'Connection failed: ' + error.message;
        elements.notionStatus.classList.add('error');
        throw error;
    }
}

async function loadNotionDatabases() {
    try {
        const data = await chrome.storage.sync.get(['notionSettings']);
        const settings = data.notionSettings;
        
        if (!settings?.accessToken) {
            console.error('No access token found');
            return;
        }

        const elements = {
            notionStatus: document.getElementById('notion-status'),
            notionSettings: document.getElementById('notion-settings'),
            notionDatabase: document.getElementById('notion-database')
        };

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
                    property: 'object',
                    value: 'database'
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch databases');
        }

        const responseData = await response.json();

        if (responseData.results && responseData.results.length > 0) {
            elements.notionDatabase.innerHTML = '<option value="">Select a database</option>';
            
            responseData.results.forEach(db => {
                const title = db.title[0]?.plain_text || 'Untitled';
                const option = document.createElement('option');
                option.value = db.id;
                option.textContent = title;
                elements.notionDatabase.appendChild(option);
            });

            elements.notionSettings.style.display = 'block';

            if (!settings.selectedDatabaseId) {
                settings.selectedDatabaseId = responseData.results[0].id;
                await chrome.storage.sync.set({ notionSettings: settings });
            }

            if (settings.selectedDatabaseId) {
                elements.notionDatabase.value = settings.selectedDatabaseId;
            }

            elements.notionStatus.textContent = `Connected to ${settings.workspaceName || 'Notion'}`;
            elements.notionStatus.classList.remove('error');
        } else {
            elements.notionStatus.textContent = 'No databases found';
            elements.notionDatabase.innerHTML = '<option value="">No databases available</option>';
        }
    } catch (error) {
        console.error('Error loading Notion databases:', error);
        const elements = {
            notionStatus: document.getElementById('notion-status')
        };
        elements.notionStatus.textContent = 'Failed to load databases: ' + error.message;
        elements.notionStatus.classList.add('error');
        throw error;
    }
}

async function saveNotionToken(tokenData) {
    try {
        const settings = await chrome.storage.sync.get(['notionSettings']);
        const updatedSettings = {
            ...settings.notionSettings,
            connected: true,
            accessToken: tokenData.access_token,
            workspaceId: tokenData.workspace_id,
            workspaceName: tokenData.workspace_name,
            workspaceIcon: tokenData.workspace_icon,
            botId: tokenData.bot_id
        };
        
        await chrome.storage.sync.set({ notionSettings: updatedSettings });
        
        // Verify the save
        const verifySettings = await chrome.storage.sync.get(['notionSettings']);
        if (!verifySettings.notionSettings?.accessToken) {
            throw new Error('Failed to verify saved token');
        }
    } catch (error) {
        console.error('Error saving Notion token:', error);
        throw error;
    }
}

async function loadNotionSettings() {
    const data = await chrome.storage.sync.get(['notionSettings']);
    const settings = data.notionSettings || {
        connected: false,
        autoSync: false
    };
    await updateNotionUI(settings);
}

async function updateNotionUI(settings) {
    const elements = {
        notionStatus: document.getElementById('notion-status'),
        notionSettings: document.getElementById('notion-settings'),
        autoSync: document.getElementById('auto-sync')
    };

    elements.notionStatus.textContent = settings.connected ? 'Connected' : 'Not Connected';
    elements.notionStatus.className = `connection-status ${settings.connected ? 'connected' : ''}`;
    elements.notionSettings.style.display = settings.connected ? 'block' : 'none';
    elements.autoSync.checked = settings.autoSync;

    if(settings.connected) {
        await loadNotionDatabases();
    }
}

async function handleNotionConnect() {
    try {
        const clientId = document.getElementById('notion-client-id').value.trim();
        const clientSecret = document.getElementById('notion-client-secret').value.trim();

        if (!clientId || !clientSecret) {
            alert('Please enter both Client ID and Client Secret');
            return;
        }

        // Save credentials
        await chrome.storage.sync.set({
            notionClientId: clientId,
            notionClientSecret: clientSecret
        });

        const state = generateRandomString();
        const redirectUri = NOTION_CONFIG.REDIRECT_URI;
        
        const authUrl = `${NOTION_CONFIG.AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&owner=user&state=${state}`;

        const responseUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        });

        if (!responseUrl) {
            throw new Error('No response URL received');
        }

        const url = new URL(responseUrl);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (state !== returnedState) {
            throw new Error('State mismatch');
        }

        const tokenData = await exchangeCodeForToken(code);
        await saveNotionToken(tokenData);

        // Load pages for selection
        await loadNotionPages(tokenData.access_token);
        
        // Add event listener for database selection
        const notionDatabase = document.getElementById('notion-database');
        notionDatabase.addEventListener('change', async (event) => {
            if (event.target.value) {
                try {
                    const databaseId = await createNotionDatabase(tokenData.access_token, event.target.value);
                    // Save database ID
                    await chrome.storage.sync.set({
                        notionDatabaseId: databaseId
                    });
                    alert('Successfully created database in Notion!');
                } catch (error) {
                    console.error('Error creating database:', error);
                    alert('Failed to create database. Please try again.');
                }
            }
        });

        updateNotionConnectionStatus(true);
        alert('Successfully connected to Notion! Please select a page to create your database.');
        
    } catch (error) {
        console.error('Error connecting to Notion:', error);
        alert('Failed to connect to Notion. Please try again.');
        updateNotionConnectionStatus(false);
    }
}

async function loadNotionPages(token) {
    try {
        const response = await fetch(`${NOTION_CONFIG.API_URL}/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Notion-Version': NOTION_CONFIG.API_VERSION
            },
            body: JSON.stringify({
                filter: {
                    property: 'object',
                    value: 'page'
                },
                sort: {
                    direction: 'descending',
                    timestamp: 'last_edited_time'
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to load pages: ${response.statusText}`);
        }

        const responseData = await response.json();
        const notionDatabase = document.getElementById('notion-database');
        
        if (responseData.results && responseData.results.length > 0) {
            notionDatabase.innerHTML = '<option value="">Select a page to create database</option>';
            
            responseData.results.forEach(page => {
                const title = page.properties?.title?.title?.[0]?.plain_text || 
                            page.properties?.Name?.title?.[0]?.plain_text || 
                            'Untitled';
                const option = document.createElement('option');
                option.value = page.id;
                option.textContent = title;
                notionDatabase.appendChild(option);
            });
        } else {
            notionDatabase.innerHTML = '<option value="">No pages found</option>';
        }
    } catch (error) {
        console.error('Error loading Notion pages:', error);
        throw error;
    }
}

async function createNotionDatabase(token, parentId) {
    try {
        const response = await fetch(`${NOTION_CONFIG.API_URL}/databases`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Notion-Version': NOTION_CONFIG.API_VERSION
            },
            body: JSON.stringify({
                parent: {
                    type: "page_id",
                    page_id: parentId
                },
                title: [
                    {
                        type: "text",
                        text: {
                            content: "WizMuse Notes"
                        }
                    }
                ],
                properties: {
                    Title: {
                        title: {}
                    },
                    Content: {
                        rich_text: {}
                    },
                    URL: {
                        url: {}
                    },
                    Tags: {
                        multi_select: {}
                    },
                    CreatedAt: {
                        date: {}
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create database: ${response.statusText}`);
        }

        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error('Error creating Notion database:', error);
        throw error;
    }
}

async function saveNotionSettings() {
    const data = await chrome.storage.sync.get(['notionSettings']);
    const settings = data.notionSettings || {};
    const elements = {
        autoSync: document.getElementById('auto-sync')
    };
    settings.autoSync = elements.autoSync.checked;
    await chrome.storage.sync.set({ notionSettings: settings });
}

function updateNotionConnectionStatus(connected) {
    const elements = {
        notionStatus: document.getElementById('notion-status'),
        notionSettings: document.getElementById('notion-settings'),
        notionToggle: document.getElementById('notion-toggle'),
        notionCredentials: document.getElementById('notion-credentials')
    };

    if (connected) {
        elements.notionStatus.textContent = 'Connected to Notion';
        elements.notionStatus.classList.remove('error');
        elements.notionStatus.classList.add('success');
        updateNotionFormState(elements, false); // Collapse when connected
    } else {
        elements.notionStatus.textContent = 'Not connected to Notion';
        elements.notionStatus.classList.remove('success');
        updateNotionFormState(elements, true); // Expand when not connected
    }
}

function updateNotionFormState(elements, expanded) {
    if (expanded) {
        elements.notionCredentials.classList.remove('collapsed');
        elements.notionCredentials.classList.add('expanded');
        elements.notionToggle.classList.add('expanded');
    } else {
        elements.notionCredentials.classList.remove('expanded');
        elements.notionCredentials.classList.add('collapsed');
        elements.notionToggle.classList.remove('expanded');
    }
}

async function exchangeCodeForToken(code) {
    try {
        const data = await chrome.storage.sync.get(['notionClientId', 'notionClientSecret']);
        const notionClientId = data.notionClientId;
        const notionClientSecret = data.notionClientSecret;
        
        if (!notionClientId || !notionClientSecret) {
            throw new Error('Notion credentials not found');
        }

        const credentials = btoa(`${notionClientId}:${notionClientSecret}`);
        const tokenResponse = await fetch(NOTION_CONFIG.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
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
        ...domains,
        ...prompts,
        options: {
            ...llmConfigs,
        },
        ...selectedLLMIndex,
        ...language,
        ...defaultPromptIndex
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

function generateRandomString() {
    return Math.random().toString(36).substr(2, 10);
}

function handleExport() {
    const elements = {
        exportBtn: document.getElementById('export-settings-btn')
    };

    elements.exportBtn.disabled = true;

    getAllSettings().then(settings => {
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wizmuse-settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        elements.exportBtn.disabled = false;
    }).catch(error => {
        console.error('Error exporting settings:', error);
        alert('Failed to export settings. Please try again.');
        elements.exportBtn.disabled = false;
    });
}

// Add event listener for database selection
document.addEventListener('DOMContentLoaded', () => {
    const notionDatabase = document.getElementById('notion-database');
    if (notionDatabase) {
        notionDatabase.addEventListener('change', async (event) => {
            try {
                const data = await chrome.storage.sync.get(['notionSettings']);
                const settings = data.notionSettings;
                settings.selectedDatabaseId = event.target.value;
                await chrome.storage.sync.set({ notionSettings: settings });
            } catch (error) {
                console.error('Error saving database selection:', error);
            }
        });
    }
});
