// Notion API configuration
export const NOTION_CONFIG = {
    CLIENT_ID: '151d872b-594c-80b5-9599-0037a4e95c8d',
    CLIENT_SECRET: '<Secret>', // Replace with your client secret
    get REDIRECT_URI() {
        return `https://${chrome.runtime.id}.chromiumapp.org/oauth2`;
    },
    AUTH_URL: 'https://api.notion.com/v1/oauth/authorize',
    TOKEN_URL: 'https://api.notion.com/v1/oauth/token',
    API_URL: 'https://api.notion.com/v1',
    API_VERSION: '2022-06-28'
};
