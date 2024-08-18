import OpenAIProvider from './open-ai-provider.js';
import ClaudeProvider from './claude-provider.js';
import OllamaProvider from './ollama-provider.js';
import GroqProvider from './groq-provider.js';

// LLM Provider Factory
class LLMProviderFactory {
    static getProvider(type, config) {
        switch (type) {
            case 'openai':
                return new OpenAIProvider(config);
            case 'claude':
                return new ClaudeProvider(config);
            case 'ollama':
                return new OllamaProvider(config);
            case 'groq':
                return new GroqProvider(config);
            default:
                throw new Error('Unsupported LLM provider');
        }
    }
}

export default LLMProviderFactory;
