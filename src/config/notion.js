// Notion API configuration
export const NOTION_CONFIG = {
    get REDIRECT_URI() {
        return chrome.identity.getRedirectURL();
    },
    AUTH_URL: 'https://api.notion.com/v1/oauth/authorize',
    TOKEN_URL: 'https://api.notion.com/v1/oauth/token',
    API_URL: 'https://api.notion.com/v1',
    API_VERSION: '2022-06-28'
};
