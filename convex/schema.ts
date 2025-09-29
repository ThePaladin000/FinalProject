import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Meta tags for qualitative classification (system-defined)
  metaTags: defineTable({
    name: v.string(), // e.g., "CORE", "ACTIONABLE", "CAUTION", "CRITICAL", "EXPLORATORY"
    displayColor: v.union(
      v.literal("BLUE"),
      v.literal("GREEN"),
      v.literal("YELLOW"),
      v.literal("RED"),
      v.literal("PURPLE")
    ),
    description: v.string(), // Explaining its meaning to the user
    isSystem: v.boolean(), // Whether this is a system-defined meta tag
    createdAt: v.number(),
    updatedAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_color", ["displayColor"])
    .index("by_owner", ["ownerId"]),

  // Users (application identities, typically mapped to Clerk subject)
  users: defineTable({
    // External user identifier (e.g., Clerk subject). We index this and treat it as unique at app level
    userId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),

    // Preferences & plan
    favModel: v.optional(v.string()),
    modelPickerList: v.optional(v.array(v.string())),
    isDarkmode: v.optional(v.boolean()),
    isPaid: v.optional(v.boolean()),
    // Preferences for where to place newly created/imported chunks within a locus
    addChunkPlacement: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
    importChunkPlacement: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
    // Placement for research chunks generated from chat
    researchChunkPlacement: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
    
    // Shards accounting
    shardBalance: v.optional(v.number()),
    monthlyShardAllowance: v.optional(v.number()),
    lastAllowanceResetDate: v.optional(v.number()), // Unix timestamp (ms)
    purchasedShards: v.optional(v.number()),

    // Misc
    lastActiveAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]) // treat as unique in logic
    .index("by_email", ["email"]) // optional convenience
    .index("by_created_at", ["createdAt"]),

  // LLM models pricing (per-million token costs in USD)
  llmModels: defineTable({
    modelId: v.string(),
    inputTokenCostPerMillion: v.number(), // USD per 1,000,000 input tokens
    outputTokenCostPerMillion: v.number(), // USD per 1,000,000 output tokens
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_modelId", ["modelId"]) 
    .index("by_created_at", ["createdAt"]),

  // Shard transactions audit log
  shardTransactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("DEBIT"),
      v.literal("CREDIT"),
      v.literal("MONTHLY_RESET"),
      v.literal("PURCHASE"),
      v.literal("WELCOME_BONUS")
    ),
    shardAmount: v.number(), // positive for credits, negative for debits
    reason: v.optional(v.string()),
    associatedConversationId: v.optional(v.id("conversations")),
    inputTokensUsed: v.optional(v.number()),
    outputTokensUsed: v.optional(v.number()),
    modelIdUsed: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]) 
    .index("by_user_and_created", ["userId", "createdAt"]) 
    .index("by_created_at", ["createdAt"]),

  // Top-level knowledge domains
  nexi: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // For display ordering on the home page (0-based; optional for back-compat)
    order: v.optional(v.number()),
    // For future user authentication
    ownerId: v.optional(v.string()),
    // For guest session scoping (when ownerId is undefined)
    guestSessionId: v.optional(v.string()),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_owner", ["ownerId"])
    .index("by_guest_session", ["guestSessionId"]),

  // Focused collections within a nexus
  notebooks: defineTable({
    nexusId: v.id("nexi"),
    name: v.string(),
    description: v.optional(v.string()),
    metaQuestion: v.optional(v.string()), // The defining question for this notebook
    createdAt: v.number(),
    updatedAt: v.number(),
    order: v.optional(v.number()), // DEPRECATED: Will be removed after migration to locusContentItems
    ownerId: v.optional(v.string()),
  })
    .index("by_nexus", ["nexusId"])
    .index("by_order", ["nexusId", "order"]) // Keep index for backward compatibility during migration
    .index("by_owner", ["ownerId"]),

  // Hierarchical tags within notebooks
  tags: defineTable({
    notebookId: v.id("notebooks"),
    name: v.string(),
    description: v.optional(v.string()),
    parentTagId: v.optional(v.id("tags")), // For hierarchy
    color: v.optional(v.string()), // For UI styling
    originNotebookId: v.optional(v.id("notebooks")), // Where this tag was first created
    originNexusId: v.optional(v.id("nexi")), // Parent nexus of origin notebook
    createdAt: v.number(),
    updatedAt: v.number(),
    order: v.optional(v.number()), // DEPRECATED: Will be removed after migration to locusContentItems
    ownerId: v.optional(v.string()),
  })
    .index("by_notebook", ["notebookId"])
    .index("by_parent", ["parentTagId"])
    .index("by_order", ["notebookId", "parentTagId", "order"]) // Keep index for backward compatibility during migration
    .index("by_owner", ["ownerId"])
    .index("by_origin_notebook", ["originNotebookId"])
    .index("by_origin_nexus", ["originNexusId"]),

  // Knowledge chunks (content pieces)
  chunks: defineTable({
    notebookId: v.id("notebooks"),
    title: v.optional(v.string()),
    originalText: v.string(), // AI-generated content
    userEditedText: v.optional(v.string()), // User-modified content
    source: v.optional(v.string()), // Where this came from (e.g., "Eden AI", "User Input")
    chunkType: v.union(v.literal("text"), v.literal("code"), v.literal("document")),
    metaTagId: v.optional(v.id("metaTags")), // Meta tag for qualitative classification (optional)
    createdAt: v.number(),
    updatedAt: v.number(),
    order: v.optional(v.number()), // DEPRECATED: Will be removed after migration to locusContentItems
    ownerId: v.optional(v.string()),
  })
    .index("by_notebook", ["notebookId"])
    .index("by_owner", ["ownerId"])
    .index("by_type", ["chunkType"])
    .index("by_meta_tag", ["metaTagId"])
    .index("by_order", ["notebookId", "order"]), // Keep index for backward compatibility during migration

  // Pages (content pieces similar to chunks but with different structure)
  pages: defineTable({
    notebookId: v.id("notebooks"),
    content: v.string(), // The main content
    plainTextContent: v.string(), // Plain text version for search
    pageType: v.string(), // Type of page
    source: v.string(), // Where this came from
    metaTagId: v.id("metaTags"), // Meta tag for qualitative classification
    wordCount: v.optional(v.number()), // Word count for the page
    createdAt: v.number(),
    updatedAt: v.number(),
    order: v.optional(v.number()), // DEPRECATED: Will be removed after migration to locusContentItems
    ownerId: v.string(),
  })
    .index("by_notebook", ["notebookId"])
    .index("by_owner", ["ownerId"])
    .index("by_type", ["pageType"])
    .index("by_meta_tag", ["metaTagId"])
    .index("by_order", ["notebookId", "order"]), // Keep index for backward compatibility during migration

  // Attachments associated with chunks
  attachments: defineTable({
    chunkId: v.id("chunks"),
    name: v.string(),
    url: v.string(),
    createdAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_chunk", ["chunkId"]) 
    .index("by_owner", ["ownerId"]) 
    .index("by_created_at", ["createdAt"]),

  // Ordering and organization of content within loci (can be nexus for notebooks, or notebook for content)
  locusContentItems: defineTable({
    locusId: v.string(), // The locus this item belongs to - can be nexus ID (for notebooks) or notebook ID (for content)
    locusType: v.union(v.literal("nexus"), v.literal("notebook")), // Type of the locus
    contentType: v.union(
      v.literal("chunk"),
      v.literal("notebook"),
      v.literal("tag"),
      v.literal("conversationMessage"),
      v.literal("page")
    ),
    contentId: v.string(), // The ID of the content item (chunk, notebook, tag, etc.)
    position: v.number(), // Position within the locus (0-based, allows for decimal positions)
    parentId: v.optional(v.string()), // For hierarchical organization (e.g., tags under parent tags)
    createdAt: v.number(),
    updatedAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_locus", ["locusId"])
    .index("by_locus_and_type", ["locusId", "contentType"])
    .index("by_locus_position", ["locusId", "position"])
    .index("by_locus_parent", ["locusId", "parentId", "position"])
    .index("by_content", ["contentType", "contentId"])
    .index("by_locus_type", ["locusType"])
    .index("by_owner", ["ownerId"]),

  // Tag assignments to chunks
  chunkTags: defineTable({
    chunkId: v.id("chunks"),
    tagId: v.id("tags"),
    createdAt: v.number(),
  })
    .index("by_chunk", ["chunkId"])
    .index("by_tag", ["tagId"])
    .index("by_chunk_and_tag", ["chunkId", "tagId"]),

  // Jems (favorited chunks)
  jems: defineTable({
    chunkId: v.id("chunks"),
    createdAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_chunk", ["chunkId"])
    .index("by_owner", ["ownerId"])
    .index("by_created_at", ["createdAt"]),

  // Knowledge conduits (relationships between chunks)
  conduits: defineTable({
    sourceChunkId: v.id("chunks"),
    targetChunkId: v.id("chunks"),
    conduitType: v.union(
      v.literal("expands_on"),
      v.literal("contradicts"),
      v.literal("resolves"),
      v.literal("references"),
      v.literal("builds_on")
    ),
    description: v.optional(v.string()),
    createdAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_source", ["sourceChunkId"])
    .index("by_target", ["targetChunkId"])
    .index("by_type", ["conduitType"])
    .index("by_owner", ["ownerId"]),

  // Chunk connections (shadows/references in other notebooks)
  chunkConnections: defineTable({
    sourceChunkId: v.id("chunks"), // Original chunk
    targetNotebookId: v.id("notebooks"), // Notebook where the shadow is created
    shadowChunkId: v.id("chunks"), // The shadow chunk in the target notebook
    description: v.optional(v.string()), // Optional description of the connection
    createdAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_source", ["sourceChunkId"])
    .index("by_target_notebook", ["targetNotebookId"])
    .index("by_shadow", ["shadowChunkId"])
    .index("by_owner", ["ownerId"]),

  // Conversations (metadata for conversation sessions)
  conversations: defineTable({
    notebookId: v.optional(v.id("notebooks")),
    title: v.optional(v.string()), // Auto-generated or user-provided title
    modelUsed: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_notebook", ["notebookId"])
    .index("by_owner", ["ownerId"])
    .index("by_created_at", ["createdAt"]),

  // Question-Answer pairs within conversations
  conversationMessages: defineTable({
    conversationId: v.id("conversations"),
    question: v.string(),
    answer: v.string(),
    order: v.optional(v.number()), // DEPRECATED: Will be removed after migration to locusContentItems
    createdAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_order", ["conversationId", "order"]) // Keep index for backward compatibility during migration
    .index("by_owner", ["ownerId"]),

  // Prompt templates for AI interactions
  promptTemplates: defineTable({
    // Core metadata
    name: v.string(), // User-friendly name (e.g., "Summarize Key Points", "Creative Story Starter")
    description: v.string(), // Short explanation of what this template does
    isSystemDefined: v.boolean(), // True for default Nexus Tech templates
    isActive: v.boolean(), // Whether the template is currently active/visible
    
    // Display & discovery
    icon: v.optional(v.string()), // Optional icon (e.g., "📝", "💡")
    tagIds: v.optional(v.array(v.id("tags"))), // Link to relevant tags for organization
    
    // Prompt content
    templateContent: v.string(), // The actual prompt text with placeholders
    
    // Placeholders & customization
    placeholders: v.optional(v.array(v.object({
      name: v.string(), // Unique identifier (e.g., 'CONCEPT_FOCUS', 'OUTPUT_FORMAT')
      label: v.string(), // User-friendly label (e.g., 'Focus Area:', 'Output Style:')
      type: v.union(
        v.literal("text"),
        v.literal("number"), 
        v.literal("textarea"),
        v.literal("dropdown")
      ),
      defaultValue: v.optional(v.string()),
      options: v.optional(v.array(v.string())), // For dropdown type
      optional: v.optional(v.boolean()),
      description: v.optional(v.string()), // Helper text
    }))),
    
    // LLM configuration overrides
    llmConfig: v.optional(v.object({
      modelName: v.optional(v.string()), // e.g., 'gpt-3.5-turbo', 'claude-3-haiku'
      temperature: v.optional(v.number()), // 0.0 to 1.0
      maxTokens: v.optional(v.number()),
      topP: v.optional(v.number()),
    })),
    
    // Usage metrics
    usageCount: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    
    // Standard fields
    createdAt: v.number(),
    updatedAt: v.number(),
    ownerId: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_owner", ["ownerId"])
    .index("by_system_defined", ["isSystemDefined"])
    .index("by_active", ["isActive"])
    .index("by_created_at", ["createdAt"])
    .index("by_usage", ["usageCount"])
    .index("by_last_used", ["lastUsedAt"]),
}); 