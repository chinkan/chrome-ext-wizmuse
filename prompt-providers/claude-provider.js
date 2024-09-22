import LLMProvider from './llm-provider.js';

class ClaudeProvider extends LLMProvider {
    constructor(config) {
        super(config);
    }

    async summarize(text, systemPrompt, advancedSettings) {
        const response = await fetch(`${this.endpoint}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: text,
                    },
                ],
                max_tokens: advancedSettings.maxTokens,
                temperature: advancedSettings.temperature,
                top_p: advancedSettings.topP,
                top_k: advancedSettings.topK,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            summary: data.content[0].text,
        };
    }

    async getModelLists() {
        const response = await fetch(`${this.endpoint}/v1/models`, {
            method: 'GET',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.models.map((model) => ({
            name: model.name,
            value: model.name,
        }));
    }
}

export default ClaudeProvider;
