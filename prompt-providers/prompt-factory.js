import { getStorageData } from '../utils/storage.js';

class PromptFactory {
    static async getPrompt(key, text, language) {
        const result = await getStorageData(['prompts', 'defaultPromptIndex']);
        const prompts = result.prompts || [];
        const defaultPromptIndex = result.defaultPromptIndex;

        let selectedPrompt;

        console.log('key:', key, 'type:', typeof key);
        console.log('prompts:', prompts);
        console.log('defaultPromptIndex:', defaultPromptIndex);

        // 將 key 轉換為數字
        const numericKey = parseInt(key, 10);

        if (numericKey === -1 || isNaN(numericKey)) {
            selectedPrompt =
                defaultPromptIndex !== undefined && prompts[defaultPromptIndex]
                    ? prompts[defaultPromptIndex]
                    : this.getDefaultPrompt();
        } else if (numericKey >= 0 && numericKey < prompts.length) {
            console.log('Selecting prompt at index:', numericKey);
            selectedPrompt = prompts[numericKey];
        } else {
            console.log('Using default prompt');
            selectedPrompt = this.getDefaultPrompt();
        }

        console.log('selectedPrompt:', selectedPrompt);

        // 替換提示中的 {{content}} 和 {{language}} 佔位符
        return {
            systemPrompt: selectedPrompt.systemPrompt.replace(
                '{{language}}',
                language
            ),
            userPrompt: selectedPrompt.userPrompt
                .replace('{{content}}', text)
                .replace('{{language}}', language),
        };
    }

    static getDefaultPrompt() {
        return {
            systemPrompt: `You are a helpful assistant that summarizes content in {{language}}.`,
            userPrompt: `Please summarize the following content in {{language}}:

1. Create a simple summary with these sections:

   A. **Introduction**
      - Briefly overview the main topic and key goals/themes.

   B. **Key Takeaways**
      - Identify the 3-5 most important conclusions or insights.
      - Use around 100 words to describe the insights.

   C. **Content Outline** 
      - Summarize the focus and main points of each major section.

  D. **Example**
      - Use simple wording to step by step the example in the article
      - Describe the concept of the article, use some POC to proof the concept

   E. **Next Steps & Resources**
      - Suggest ways to further explore the topic.
      - List any key references or supplementary materials.

2. Keep the summary concise and well-structured to enable quick comprehension.

3. If the content does not meet the criteria, provide a high-level summary inline instead of creating a separate artifact.

4. Use {{language}} to response, don't miss this rules!

Here is the content to summarize:

{{content}}
`,
        };
    }
}

export default PromptFactory;
