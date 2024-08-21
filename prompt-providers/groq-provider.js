import LLMProvider from './llm-provider.js';

class GroqProvider extends LLMProvider {
    constructor(config) {
        super(config);
    }

    async summarize(text, systemPrompt) {
        const response = await fetch(
            `${this.endpoint}/chat/completions`, // 使用配置中的端點
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
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
                    model: this.model, // 使用配置中的模型
                }),
            }
        );

        const data = await response.json();
        return {
            summary: data.choices[0]?.message?.content || '', // 返回摘要內容
        };
    }

    async getModelLists() {
        const response = await fetch(`${this.endpoint}/models`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
        });

        const data = await response.json();
        return data.data.map((a) => ({ name: a.id, value: a.id })); // 返回模型列表
    }

    getDefaultEndpoint() {
        return 'https://api.groq.com/openai/v1';
    }
}

export default GroqProvider;
