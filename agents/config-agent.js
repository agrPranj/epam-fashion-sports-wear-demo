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
      let cleaned = result.response.trim();

      // Remove markdown code blocks
      cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');

      // Extract JSON array or object using regex
      // Look for [...] or {...}
      const jsonArrayMatch = cleaned.match(/\[[\s\S]*\]/);
      const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);

      let jsonString = null;
      if (jsonArrayMatch) {
        jsonString = jsonArrayMatch[0];
      } else if (jsonObjectMatch) {
        jsonString = jsonObjectMatch[0];
      } else {
        jsonString = cleaned;
      }

      return JSON.parse(jsonString);
    } catch (error) {
      console.error(`[Agent Task: ${taskName}] Execution Error:`, error);
      console.error(`Raw response:`, result?.response);
      return null;
    }
  }
}
