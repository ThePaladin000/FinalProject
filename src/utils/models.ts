export interface Model {
  id: string;
  provider: string;
  model: string;
  name: string;
  description: string;
  creditCost: number;
  // USD per 1,000,000 tokens
  inputTokenCostPerMillion?: number;
  outputTokenCostPerMillion?: number;
}

export const premiumModels: Model[] = [
  {
    id: 'google/gemini-2.5-flash-lite',
    provider: 'google',
    model: 'gemini-2.5-flash-lite',
    name: 'Gemini',
    description: 'A fast yet powerful model made by Google',
    creditCost: 1,
    inputTokenCostPerMillion: 0.10,
    outputTokenCostPerMillion: 0.40,
  },
  {
    id: 'openai/gpt-4o',
    provider: 'openai',
    model: 'openai/gpt-4o',
    name: 'ChatGPT Pro',
    description: 'Most advanced model with excellent reasoning',
    creditCost: 4,
    // Example values; update when exact prices are decided
    inputTokenCostPerMillion: 5.00,
    outputTokenCostPerMillion: 15.00,
  },
  {
    id: 'perplexity/sonar',
    provider: 'perplexity',
    model: 'perplexityai/sonar-large-online',
    name: 'Perplexity',
    description: 'Facts-first model for deep research',
    creditCost: 5,
  },
];

export const allModels: Model[] = [
  {
    "id": "google/gemini-2.5-pro",
    "provider": "google",
    "model": "google/gemini-2.5-pro",
    "name": "gemini-2.5-pro",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "google/gemini-2.5-flash",
    "provider": "google",
    "model": "google/gemini-2.5-flash",
    "name": "gemini-2.5-flash",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "google/gemini-2.5-flash-lite",
    "provider": "google",
    "model": "google/gemini-2.5-flash-lite",
    "name": "gemini-2.5-flash-lite",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "google/gemini-2.0-flash-lite-001",
    "provider": "google",
    "model": "google/gemini-2.0-flash-lite-001",
    "name": "gemini-2.0-flash-lite-001",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "google/gemini-2.0-flash-001",
    "provider": "google",
    "model": "google/gemini-2.0-flash-001",
    "name": "gemini-2.0-flash-001",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "anthropic/claude-sonnet-4",
    "provider": "anthropic",
    "model": "anthropic/claude-sonnet-4",
    "name": "claude-sonnet-4",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "anthropic/claude-3.7-sonnet",
    "provider": "anthropic",
    "model": "anthropic/claude-3.7-sonnet",
    "name": "claude-3.7-sonnet",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "anthropic/claude-3.5-haiku",
    "provider": "anthropic",
    "model": "anthropic/claude-3.5-haiku",
    "name": "claude-3.5-haiku",
    "description": "Generic model description",
    "creditCost": 1,
    "inputTokenCostPerMillion": 0.25,
    "outputTokenCostPerMillion": 1.25
  },
  {
    "id": "openai/gpt-5",
    "provider": "openai",
    "model": "openai/gpt-5",
    "name": "gpt-5",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-5-mini",
    "provider": "openai",
    "model": "openai/gpt-5-mini",
    "name": "gpt-5-mini",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-5-nano",
    "provider": "openai",
    "model": "openai/gpt-5-nano",
    "name": "gpt-5-nano",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-4.1",
    "provider": "openai",
    "model": "openai/gpt-4.1",
    "name": "gpt-4.1",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-4.1-mini",
    "provider": "openai",
    "model": "openai/gpt-4.1-mini",
    "name": "gpt-4.1-mini",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-4.1-nano",
    "provider": "openai",
    "model": "openai/gpt-4.1-nano",
    "name": "gpt-4.1-nano",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-4o",
    "provider": "openai",
    "model": "openai/gpt-4o",
    "name": "gpt-4o",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-4o-mini",
    "provider": "openai",
    "model": "openai/gpt-4o-mini",
    "name": "gpt-4o-mini",
    "description": "Generic model description",
    "creditCost": 1,
    "inputTokenCostPerMillion": 0.15,
    "outputTokenCostPerMillion": 0.60
  },
  {
    "id": "openai/gpt-oss-120b",
    "provider": "openai",
    "model": "openai/gpt-oss-120b",
    "name": "gpt-oss-120b",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "openai/gpt-oss-20b:free",
    "provider": "openai",
    "model": "openai/gpt-oss-20b:free",
    "name": "gpt-oss-20b:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "openai/gpt-3.5-turbo",
    "provider": "openai",
    "model": "openai/gpt-3.5-turbo",
    "name": "gpt-3.5-turbo",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "qwen/qwen-2.5-coder-32b-instruct:free",
    "provider": "qwen",
    "model": "qwen/qwen-2.5-coder-32b-instruct:free",
    "name": "qwen-2.5-coder-32b-instruct:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "qwen/qwen-2.5-72b-instruct",
    "provider": "qwen",
    "model": "qwen/qwen-2.5-72b-instruct",
    "name": "qwen-2.5-72b-instruct",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "qwen/qwen3-coder:free",
    "provider": "qwen",
    "model": "qwen/qwen3-coder:free",
    "name": "qwen3-coder:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "qwen/qwen3-32b",
    "provider": "qwen",
    "model": "qwen/qwen3-32b",
    "name": "qwen3-32b",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "deepseek/deepseek-chat-v3-0324:free",
    "provider": "deepseek",
    "model": "deepseek/deepseek-chat-v3-0324:free",
    "name": "deepseek-chat-v3-0324:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "deepseek/deepseek-r1-0528:free",
    "provider": "deepseek",
    "model": "deepseek/deepseek-r1-0528:free",
    "name": "deepseek-r1-0528:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "mistralai/mistral-nemo:free",
    "provider": "mistralai",
    "model": "mistralai/mistral-nemo:free",
    "name": "mistral-nemo:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "mistralai/mistral-7b-instruct:free",
    "provider": "mistralai",
    "model": "mistralai/mistral-7b-instruct:free",
    "name": "mistral-7b-instruct:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "mistralai/mistral-small-3.1-24b-instruct:free",
    "provider": "mistralai",
    "model": "mistralai/mistral-small-3.1-24b-instruct:free",
    "name": "mistral-small-3.1-24b-instruct:free",
    "description": "Generic model description",
    "creditCost": 0,
    "inputTokenCostPerMillion": 0,
    "outputTokenCostPerMillion": 0
  },
  {
    "id": "meta-llama/llama-4-maverick",
    "provider": "meta-llama",
    "model": "meta-llama/llama-4-maverick",
    "name": "llama-4-maverick",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "meta-llama/llama-4-scout",
    "provider": "meta-llama",
    "model": "meta-llama/llama-4-scout",
    "name": "llama-4-scout",
    "description": "Generic model description",
    "creditCost": 1
  },
  {
    "id": "moonshotai/kimi-k2",
    "provider": "moonshotai",
    "model": "moonshotai/kimi-k2",
    "name": "kimi-k2",
    "description": "Generic model description",
    "creditCost": 1
  }
]

// Filter all free models (models with ":free" in their id)
export const defaultModels: Model[] = allModels.filter(model => model.id.includes(':free'));

// Default model selection - using openai/gpt-oss-20b:free as specified
export const defaultModel: Model = allModels.find(model => model.id === 'openai/gpt-oss-20b:free')!;

export interface ModelCategory {
  key: string;
  name: string;
  modelIds: string[];
}

// Reference categories only. Always map these IDs to `allModels` when displaying.
export const modelsByCategory: ModelCategory[] = [
  {
    key: "creativity",
    name: "Creativity",
    modelIds: [
      "google/gemini-2.5-flash",
      "deepseek/deepseek-chat-v3-0324:free",
      "google/gemini-2.5-pro",
      "anthropic/claude-3.7-sonnet",
      "mistralai/mistral-nemo:free",
      "openai/gpt-4.1-mini",
    ],
  },
  {
    key: "code",
    name: "Code",
    modelIds: [
      "anthropic/claude-sonnet-4",
      "anthropic/claude-3.7-sonnet",
      "moonshotai/kimi-k2",
      "qwen/qwen3-coder",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "openrouter/horizon-beta",
      "qwen/qwen-2.5-coder-32b-instruct:free",
    ],
  },
  {
    key: "translation",
    name: "Translation",
    modelIds: [
      "google/gemini-2.5-flash",
      "google/gemini-2.0-flash-001",
      "google/gemini-2.5-pro",
      "openai/gpt-4o-mini",
    ],
  },
  {
    key: "legal",
    name: "Legal",
    modelIds: [
      "google/gemini-2.5-flash",
      "deepseek/deepseek-chat-v3-0324:free",
      "mistralai/mistral-small-24b-instruct-2501",
      "openrouter/horizon-beta",
      "openai/gpt-5-mini",
    ],
  },
  {
    key: "health",
    name: "Health",
    modelIds: [
      "google/gemini-2.5-flash",
      "openai/gpt-4.1",
      "meta-llama/llama-4-maverick",
      "openai/gpt-4.1-nano",
    ],
  },
  {
    key: "finance",
    name: "Finance",
    modelIds: [
      "anthropic/claude-sonnet-4",
      "anthropic/claude-3.7-sonnet",
      "google/gemini-2.5-flash",
      "openai/gpt-4.1",
      "qwen/qwen3-32b",
    ],
  },
  {
    key: "academia/science",
    name: "Academia / Science",
    modelIds: [
      "anthropic/claude-sonnet-4",
      "google/gemini-2.5-flash",
      "google/gemini-2.0-flash-001",
      "google/gemini-2.5-pro",
      "openai/gpt-4.1",
    ],
  },
  {
    key: "technology",
    name: "Technology",
    modelIds: [
      "x-ai/grok-4",
      "anthropic/claude-sonnet-4",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
    ],
  },
];