import {
    NOTION_CLIENT_ID,
    NOTION_CLIENT_SECRET,
    NOTION_REDIRECT_URI,
} from './constants.js';

export function addToNotion() {
    const scope = 'page:write';

    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        NOTION_REDIRECT_URI
    )}&response_type=code&owner=user&scope=${scope}`;

    chrome.tabs.create({ url: authUrl }, function (tab) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (
                tabId === tab.id &&
                info.url &&
                info.url.startsWith(NOTION_REDIRECT_URI)
            ) {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.tabs.remove(tab.id);

                const url = new URL(info.url);
                const code = url.searchParams.get('code');

                if (code) {
                    exchangeCodeForToken(code);
                }
            }
        });
    });
}

function exchangeCodeForToken(code) {
    fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${btoa(
                `${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`
            )}`,
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: NOTION_REDIRECT_URI,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            const accessToken = data.access_token;
            const workspaceId = data.workspace_id;
            chooseNotionPage(accessToken, workspaceId);
        })
        .catch((error) => console.error('Error:', error));
}

function chooseNotionPage(accessToken, workspaceId) {
    // 獲取用戶的 Notion 頁面列表
    fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
            filter: {
                property: 'object',
                value: 'page',
            },
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            const pageList = data.results.map((page) => ({
                id: page.id,
                title: page.properties.title.title[0]?.plain_text || 'Untitled',
            }));

            const dialog = document.createElement('dialog');
            const template = document.querySelector('#notion-page-dialog');
            dialog.appendChild(template.content.cloneNode(true));

            const pageSelector = dialog.querySelector('#page-selector');
            pageList.forEach((page) => {
                const option = document.createElement('option');
                option.value = page.id;
                option.textContent = page.title;
                pageSelector.appendChild(option);
            });

            document.body.appendChild(dialog);
            dialog.showModal();

            dialog.addEventListener('close', () => {
                const selectedPageId = pageSelector.value;
                if (selectedPageId) {
                    // 獲取摘要內容
                    const summary =
                        document.getElementById('summary').innerText;
                    createNotionPage(accessToken, selectedPageId, summary);
                }
                document.body.removeChild(dialog);
            });
        })
        .catch((error) => {
            console.error('Error fetching Notion pages:', error);
            alert('無法獲取 Notion 頁面列表');
        });
}

function createNotionPage(accessToken, parentPageId, content) {
    fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
            parent: { page_id: parentPageId },
            properties: {
                title: [
                    {
                        text: {
                            content: 'Website Summary',
                        },
                    },
                ],
            },
            children: [
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: content,
                                },
                            },
                        ],
                    },
                },
            ],
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log('Success:', data);
            alert('Summary added to Notion successfully!');
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Failed to add summary to Notion');
        });
}
