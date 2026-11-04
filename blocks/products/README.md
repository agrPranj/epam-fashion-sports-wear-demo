# Products Block - Model Orchestration

## Overview

This block uses **3 independent AI agents** that chain together to generate product recommendations.

## Agent Pipeline

```
Product Metadata
    ↓
┌─────────────────────────────────────┐
│ AGENT 1: TagExtractionAgent        │
│ File: agent-extract-tags.json      │
│ Task: Extract product tags          │
└─────────────────────────────────────┘
    ↓ Output: ["pink", "pants", "women"]
    
Catalog Data
    ↓
┌─────────────────────────────────────┐
│ AGENT 2: CatalogParserAgent         │
│ File: agent-parse-catalog.json      │
│ Task: Parse catalog structure       │
└─────────────────────────────────────┘
    ↓ Output: [{imageName, path, tags}]
    
    ↓ (Both outputs combined)
    ↓
┌─────────────────────────────────────┐
│ AGENT 3: ProductMatchingAgent       │
│ File: agent-match-products.json     │
│ Task: Match products                │
└─────────────────────────────────────┘
    ↓ Output: ["wp11-pink_main.jpg", ...]
    ↓
Final Recommendations
```

## How It Works

### Step 1: Load Agents
```javascript
const agent1 = await ConfigDrivenAgent.load('/agents/agent-extract-tags.json');
const agent2 = await ConfigDrivenAgent.load('/agents/agent-parse-catalog.json');
const agent3 = await ConfigDrivenAgent.load('/agents/agent-match-products.json');
```

### Step 2: Agent 1 - Extract Tags
```javascript
const targetSubject = await agent1.executeTask('extract_tags', {
  PRODUCT_META: currentMeta
});
// Output: ["pink", "pants", "women"]
```

### Step 3: Agent 2 - Parse Catalog
```javascript
const catalogSummary = await agent2.executeTask('parse_catalog', {
  FOLDER_DATA: folderData,
  BASE_URL: baseUrl
});
// Output: [{imageName: "...", path: "...", tags: [...]}, ...]
```

### Step 4: Agent 3 - Match Products
```javascript
// Uses output from Agent 1 AND Agent 2
const recommendations = await agent3.executeTask('match_products', {
  TARGET_SUBJECTS: targetSubject,      // From Agent 1
  CATALOG_SUMMARY: catalogSummary      // From Agent 2
});
// Output: ["wp11-pink_main.jpg", "wp12-rose_main.jpg"]
```

## Console Output

```
🤖 Loading Agent 1: TagExtractionAgent...
🤖 Loading Agent 2: CatalogParserAgent...
🤖 Loading Agent 3: ProductMatchingAgent...

--- AGENT 1: TagExtractionAgent ---
✓ Tags extracted: ["pink","pants","women"]
  Duration: 2145ms

--- AGENT 2: CatalogParserAgent ---
✓ Catalog parsed: 15 products found
  Duration: 4890ms

--- AGENT 3: ProductMatchingAgent ---
Input from Agent 1 (tags): ["pink","pants","women"]
Input from Agent 2 (catalog): 15 products
✓ Products matched: 4 recommendations
  Recommendations: ["wp11-pink_main.jpg","wp12-rose_main.jpg"]
  Duration: 1523ms

--- PIPELINE COMPLETE ---
Total execution time: 8558ms
Step 1 (Extract Tags): 2145ms
Step 2 (Parse Catalog): 4890ms
Step 3 (Match Products): 1523ms
```

## Benefits

✅ **Clear Separation**: Each agent has one responsibility
✅ **Output Chaining**: Agent outputs flow to next agent
✅ **Detailed Logging**: Track each agent's performance
✅ **Independent Models**: Can use different models per agent
✅ **Easy Debugging**: See exactly where issues occur

## Files

- `products.js` - This block (uses 3 agents)
- `../../agents/agent-extract-tags.json` - Agent 1
- `../../agents/agent-parse-catalog.json` - Agent 2
- `../../agents/agent-match-products.json` - Agent 3
- `../../agents/config-agent.js` - Agent runtime

## Setup

1. Ensure Ollama is running: `ollama serve`
2. Model is downloaded: `ollama pull llama2`
3. All 3 agent config files exist in `/agents/` folder
4. Block will automatically execute on page load
