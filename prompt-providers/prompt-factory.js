class PromptFactory {
    static getPrompt(key, text) {
        const prompts = {
            summarize: {
                userPrompt: `Text to summarize:

${text}`,
                systemPrompt: `
Please think step by step when asked to summarize lengthy material, follow these steps:

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

4. Use traditional chinese to response`,
            },
        };
        return prompts[key] || '';
    }
}

export default PromptFactory;
