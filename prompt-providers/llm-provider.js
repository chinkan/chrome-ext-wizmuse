class LLMProvider {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.model = config.model;
        this.endpoint = config.endpoint;
    }

    async summarize(text, systemPrompt) {}

    async getModelLists() {}
}

export default LLMProvider;
