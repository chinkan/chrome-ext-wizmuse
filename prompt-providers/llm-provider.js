class LLMProvider {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.model = config.model;
        this.endpoint = config.endpoint;
    }

    async summarize(text, systemPrompt) {}

    async getModelLists() {}

    getDefaultEndpoint() {
        return '';
    }
}

export default LLMProvider;
