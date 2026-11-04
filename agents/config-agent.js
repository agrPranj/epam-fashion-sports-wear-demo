export class ConfigDrivenAgent {
  constructor(config) {
    this.config = config;
  }

  // Static loader to fetch agent-config.json
  static async load(configUrl = '/agents/agent-config.json') {
    try {
      const response = await fetch(configUrl);
      if (!response.ok) throw new Error(`Failed to load config: ${response.statusText}`);
      const config = await response.json();
      return new ConfigDrivenAgent(config);
    } catch (err) {
      console.error("Agent Configuration Load Error:", err);
      return null;
    }
  }

  // Execute a task by replacing placeholders with runtime variables
  async executeTask(taskName, variables = {}) {
    const task = this.config.tasks[taskName];
    if (!task) {
      throw new Error(`Task '${taskName}' not found in agent configuration.`);
    }

    let prompt = task.prompt;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      prompt = prompt.replaceAll(placeholder, typeof value === 'string' ? value : JSON.stringify(value));
    }

    let rawResponse = '';
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: prompt,
          stream: false
        })
      });

      const result = await response.json();
      rawResponse = result.response || '';

      // Clean the response
      let cleaned = rawResponse.trim();

      // Remove markdown code blocks
      cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();

      // Extract JSON - try array first, then object
      let jsonString = null;

      // Match JSON array
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonString = arrayMatch[0];
      } else {
        // Match JSON object
        const objectMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        } else {
          // Use cleaned as-is
          jsonString = cleaned;
        }
      }

      console.log(`[${this.config.agentName}] Task: ${taskName}`);
      console.log(`[${this.config.agentName}] Extracted JSON:`, jsonString.substring(0, 150));

      return JSON.parse(jsonString);
    } catch (error) {
      console.error(`[${this.config.agentName}] Task '${taskName}' Error:`, error.message);
      console.error(`[${this.config.agentName}] Raw LLM Response:`, rawResponse);
      return null;
    }
  }
}
