import LLMProvider from './llm-provider.js';

class OllamaProvider extends LLMProvider {
    constructor(config) {
        super(config);
    }

    async summarize(text, systemPrompt, advancedSettings) {
        const response = await fetch(`${this.endpoint}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                prompt: text,
                system: systemPrompt,
                stream: false,
                options: {
                    temperature: advancedSettings.temperature,
                    top_k: advancedSettings.topK,
                    top_p: advancedSettings.topP,
                    num_predict: advancedSettings.maxTokens,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `HTTP error! status: ${response.status}, message: ${errorText}, url: ${this.endpoint}, model: ${this.model}`
            );
        }

        const data = await response.json();

        // Ensure all required fields are present
        return {
            summary: data.response,
        };
    }

    async getModelLists() {
        const response = await fetch(`${this.endpoint}/api/tags`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `HTTP error! status: ${response.status}, message: ${errorText}`
            );
        }

        const data = await response.json();
        return data.models.map((a) => ({ name: a.name, value: a.model })); // 返回所有模型選項
    }
}

export default OllamaProvider;
