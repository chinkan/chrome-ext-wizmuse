document.addEventListener('DOMContentLoaded', function () {
    const readButton = document.getElementById('read-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const summaryContainer = document.getElementById('summary-container');

    readButton.addEventListener('click', function () {
        console.log('Reading button clicked');
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        summaryContainer.style.display = 'none';

        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getPageContent' },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            console.error('Error:', chrome.runtime.lastError);
                            errorMessage.textContent =
                                'Error: ' + chrome.runtime.lastError.message;
                            errorMessage.style.display = 'block';
                            loadingIndicator.style.display = 'none';
                            return;
                        }
                        if (response && response.content) {
                            chrome.runtime.sendMessage(
                                { action: 'summarize', text: response.content },
                                function (response) {
                                    console.log(
                                        'Summarization response:',
                                        response
                                    );
                                    if (chrome.runtime.lastError) {
                                        console.error(
                                            'Runtime error:',
                                            chrome.runtime.lastError
                                        );
                                        errorMessage.textContent =
                                            'Error: ' +
                                            chrome.runtime.lastError.message;
                                        errorMessage.style.display = 'block';
                                        loadingIndicator.style.display = 'none';
                                    } else if (response && response.error) {
                                        console.error(
                                            'Summarization error:',
                                            response.error
                                        );
                                        errorMessage.textContent =
                                            'Error: ' + response.error;
                                        errorMessage.style.display = 'block';
                                        loadingIndicator.style.display = 'none';
                                    } else if (response && response.summary) {
                                        displaySummary(response.summary);
                                    } else {
                                        errorMessage.textContent =
                                            'Error: Invalid summarization response';
                                        errorMessage.style.display = 'block';
                                        loadingIndicator.style.display = 'none';
                                    }
                                }
                            );
                        } else {
                            console.error('Invalid response:', response);
                            errorMessage.textContent =
                                'Error: Invalid response';
                            errorMessage.style.display = 'block';
                            loadingIndicator.style.display = 'none';
                        }
                    }
                );
            }
        );
    });

    function displaySummary(summary) {
        const markdownHtml = markdown(summary.summary);
        document.getElementById('summary').innerHTML = markdownHtml;
        summaryContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    document
        .getElementById('share-twitter')
        .addEventListener('click', shareTwitter);
    document
        .getElementById('share-facebook')
        .addEventListener('click', shareFacebook);
    document
        .getElementById('share-linkedin')
        .addEventListener('click', shareLinkedIn);
    document
        .getElementById('add-to-notion')
        .addEventListener('click', addToNotion);
});

function shareTwitter() {
    // Implement Twitter sharing
}

function shareFacebook() {
    // Implement Facebook sharing
}

function shareLinkedIn() {
    // Implement LinkedIn sharing
}

function addToNotion() {
    const clientId = '2fcb2da4-2d6d-4272-a657-8680428b1850';
    const redirectUri = chrome.identity.getRedirectURL('notion');
    const scope = 'page:write';

    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&response_type=code&owner=user&scope=${scope}`;

    chrome.tabs.create({ url: authUrl }, function (tab) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (
                tabId === tab.id &&
                info.url &&
                info.url.startsWith(redirectUri)
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
    const clientId = '<Secret>';
    const clientSecret = '<Secret>';
    const redirectUri = chrome.identity.getRedirectURL('notion');

    fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
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
