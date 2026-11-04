# Fashion Stylist Agent System

AI agent system for product recommendations in EPAM Fashion Sports Wear Demo.

## 🎯 Two Approaches

### 1. Single Agent (Simple)
One agent with all tasks combined.

**File**: `agent-config.json`

```javascript
const agent = await ConfigDrivenAgent.load('/agents/agent-config.json');
const tags = await agent.executeTask('extract_tags', { PRODUCT_META: json });
```

### 2. Model Orchestration (Advanced)
Three independent agents chained together:
- **Agent 1**: TagExtractionAgent
- **Agent 2**: CatalogParserAgent  
- **Agent 3**: ProductMatchingAgent

**Files**: `agent-extract-tags.json`, `agent-parse-catalog.json`, `agent-match-products.json`

```javascript
import { AgentOrchestrator } from './agents/agent-orchestrator.js';

const orchestrator = new AgentOrchestrator();
await orchestrator.initialize();

// Agent 1 → Agent 2 → Agent 3
const result = await orchestrator.executeRecommendationPipeline(
  productMetadata,
  folderData,
  baseUrl
);
```

## 📊 Pipeline Flow

```
Product Metadata → Agent 1 (Extract Tags) → ["pink", "pants"]
                                                    ↓
Catalog Data → Agent 2 (Parse Catalog) → [{...}]  ↓
                                            ↓       ↓
                           Agent 3 (Match Products) → Recommendations
```

See **[ORCHESTRATION.md](./ORCHESTRATION.md)** for detailed guide.

## 🚀 Quick Start

### Single Agent
```javascript
import { ConfigDrivenAgent } from './agents/config-agent.js';

const agent = await ConfigDrivenAgent.load('/agents/agent-config.json');
const tags = await agent.executeTask('extract_tags', {
  PRODUCT_META: JSON.stringify(metadata)
});
```

### Orchestrated Agents
```javascript
import { AgentOrchestrator } from './agents/agent-orchestrator.js';

const orchestrator = new AgentOrchestrator();
await orchestrator.initialize();

const result = await orchestrator.executeRecommendationPipeline(
  productMetadata,
  folderData,
  baseUrl
);

console.log('Recommendations:', result.recommendations);
console.log('Execution time:', result.metadata.totalDuration, 'ms');
```

## 🛠️ Setup

1. Install Ollama: https://ollama.ai/download
2. Pull model: `ollama pull llama2`
3. Start server: `ollama serve`
4. Use in your blocks

## 📁 Files

### Single Agent
- `agent-config.json` - Single agent configuration
- `config-agent.js` - Agent runtime

### Orchestration
- `agent-extract-tags.json` - Agent 1 config
- `agent-parse-catalog.json` - Agent 2 config
- `agent-match-products.json` - Agent 3 config
- `agent-orchestrator.js` - Orchestrator
- `example-orchestration.js` - Usage example
- `ORCHESTRATION.md` - Orchestration guide

### Documentation
- `README.md` - This file
