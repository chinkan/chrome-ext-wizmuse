class PromptFactory {
    static getPrompt(key, text) {
        const prompts = {
            summarize: `
Summarize the following text into a this section:

1. shortSummary: Use simple wording to capture the main point of the content
2. featuredPoints: Highlight any key points in the content
3. fullSummary: Provide a comprehensive summary of the content
4. examples: If there are implementation examples, extract and return them
5. tags: Provide some relevant tags for this content

Each field should be concise and easy to understand.

Text to summarize:

${text}
            `,
        };
        return prompts[key] || '';
    }
}

export default PromptFactory;
