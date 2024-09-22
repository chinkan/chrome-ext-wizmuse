import LLMProvider from './llm-provider.js';

class OpenAIProvider extends LLMProvider {
    constructor(config) {
        super(config);
    }

    async summarize(text, systemPrompt) {
        const response = await fetch(`${this.endpoint}/chat/completions`, {
            // 使用相同的端點
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model, // 使用配置中的模型
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text },
                ],
                max_tokens: 1024,
            }),
        });
        const data = await response.json();
        return {
            summary: data.choices[0].message.content.trim(),
        };
    }

    async getModelLists() {
        const response = await fetch(`${this.endpoint}/models`, {
            // 使用相同的端點
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
        const data = await response.json();
        return data.data.map((a) => ({ name: a.id, value: a.id })); // 返回模型列表
    }
}

export default OpenAIProvider;
