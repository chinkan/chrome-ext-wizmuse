import LLMProvider from './llm-provider.js';

class ClaudeProvider extends LLMProvider {
    constructor(config) {
        super(config);
    }

    async summarize(text, systemPrompt) {
        //TODO
    }

    async getModelLists() {
        //TODO
    }
}

export default ClaudeProvider;
