import LLMProvider from './llm-provider.js';

class GroqProvider extends LLMProvider {
    constructor(config) {
        super(config);
    }

    async summarize(text, systemPrompt, advancedSettings) {
        try {
            const response = await fetch(
                `${this.endpoint}/chat/completions`,
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
                        model: this.model,
                        max_tokens: advancedSettings.maxTokens,
                        temperature: advancedSettings.temperature,
                        top_p: advancedSettings.topP,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 413 && errorData.error && errorData.error.code === 'rate_limit_exceeded') {
                    throw new Error('RateLimitExceeded: Content is too large for current model');
                }
                throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            if (!data.choices || !data.choices.length || !data.choices[0].message) {
                throw new Error('Invalid response format from Groq API');
            }

            return {
                summary: data.choices[0].message.content || '',
            };
        } catch (error) {
            console.error('Groq API error:', error);
            throw error;
        }
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
}

export default GroqProvider;
