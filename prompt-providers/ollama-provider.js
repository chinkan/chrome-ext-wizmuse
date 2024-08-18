import LLMProvider from './llm-provider.js';

class OllamaProvider extends LLMProvider {
    constructor(config) {
        super(config);
    }

    async summarize(text, systemPrompt) {
        // 新增 systemPrompt 參數
        console.error('model is ', this.model);
        const response = await fetch(`${this.endpoint}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                prompt: text,
                system: systemPrompt, // 傳遞 systemPrompt
                stream: false,
                options: {
                    temperature: 0.7,
                    top_k: 50,
                    top_p: 0.95,
                    num_predict: 1000,
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
