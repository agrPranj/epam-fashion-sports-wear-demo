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
      const cleaned = result.response.trim().replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(cleaned);
    } catch (error) {
      console.error(`[Agent Task: ${taskName}] Execution Error:`, error);
      return null;
    }
  }
}
