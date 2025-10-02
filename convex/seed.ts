import { mutation } from "./_generated/server";

// Seed the database with system-defined meta tags
export const seedMetaTags = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Check if meta tags already exist
    const existingMetaTags = await ctx.db.query("metaTags").collect();
    if (existingMetaTags.length > 0) {
      console.log("Meta tags already seeded, skipping...");
      return;
    }

    // Create the five system-defined meta tags
    const metaTags = [
      {
        name: "CORE",
        displayColor: "BLUE" as const,
        description: "Essential information, fundamental concepts, main ideas, widely accepted facts",
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "ACTIONABLE",
        displayColor: "GREEN" as const,
        description: "Best practices, how-to guides, solutions to problems, direct applications, practical steps",
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "CAUTION",
        displayColor: "YELLOW" as const,
        description: "Potential pitfalls, limitations, ethical concerns, known issues, areas needing careful consideration",
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "CRITICAL",
        displayColor: "RED" as const,
        description: "High-priority items, conflicting information, outdated methods, urgent alerts, things to avoid",
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "EXPLORATORY",
        displayColor: "PURPLE" as const,
        description: "Brainstorming ideas, future trends, experimental concepts, open questions, speculative scenarios",
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Insert all meta tags
    const insertedIds = await Promise.all(
      metaTags.map(metaTag => ctx.db.insert("metaTags", metaTag))
    );

    console.log(`Seeded ${insertedIds.length} meta tags`);
    return insertedIds;
  },
});

// Seed the database with system-defined prompt templates
export const seedPromptTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Check if prompt templates already exist
    const existingTemplates = await ctx.db.query("promptTemplates").collect();
    if (existingTemplates.length > 0) {
      console.log("Prompt templates already seeded, skipping...");
      return;
    }

    // System-defined prompt templates from the JSON file
    const promptTemplates = [
      {
        name: "Knowledge Graph",
        description: "Create a knowledge graph of key terms for any given topic",
        isSystemDefined: true,
        isActive: true,
        icon: "🕸️",
        templateContent: "Conduct an exhaustive domain analysis of [SPECIFIC TOPIC HERE], identifying its core ontological concepts, primary sub-domains, and the foundational theories or principles underpinning each. For each identified sub-domain, provide a concise definition, list at least three key terms or concepts unique to it, and propose a conceptual mapping that illustrates its relationship to the main topic and other sub-domains. The output should be structured as a hierarchical knowledge graph, accompanied by a narrative summary explaining the interdependencies and emergent properties of the domain.",
        placeholders: [
          {
            name: "SPECIFIC_TOPIC_HERE",
            label: "Topic to Analyze",
            type: "textarea" as const,
            description: "Enter the specific topic, concept, or domain you want to analyze",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "History",
        description: "Generate context for a key historical figure or event",
        isSystemDefined: true,
        isActive: true,
        icon: "📚",
        templateContent: "Perform a comprehensive landscape scan of [SPECIFIC TOPIC HERE], delineating its historical evolution, current state-of-the-art, and projected future trajectories. For each temporal phase (past, present, future), identify the most significant breakthroughs, influential figures or organizations, and prevalent methodologies or technologies. Systematically extract and define at least five critical jargon terms or technical concepts associated with each phase. Conclude with a 'Domain Surface Area Map' that categorizes these terms based on their relevance to different aspects (e.g., technical, theoretical, ethical, application) of the topic, highlighting areas of active research and potential disruption.",
        placeholders: [
          {
            name: "SPECIFIC_TOPIC_HERE",
            label: "Historical Topic",
            type: "textarea" as const,
            description: "Enter the historical figure, event, or concept you want to analyze",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Social Analysis",
        description: "Conduct an in-depth social analysis, including impact, of a given idea or technology",
        isSystemDefined: true,
        isActive: true,
        icon: "🌍",
        templateContent: "Conduct a comprehensive ethical and societal impact assessment of [SPECIFIC TECHNOLOGY/CONCEPT HERE], identifying its primary stakeholders, potential benefits, and anticipated risks or harms. For each identified impact category (e.g., privacy, equity, employment, environmental), delineate specific manifestations of the impact, provide illustrative real-world examples (if applicable), and list at least three key ethical frameworks or societal principles (e.g., fairness, autonomy, transparency) most relevant to its analysis. The output should be structured as a 'Risk-Benefit Matrix' with associated ethical considerations, accompanied by a narrative explaining the normative trade-offs and areas requiring policy or regulatory attention.",
        placeholders: [
          {
            name: "SPECIFIC TECHNOLOGY/CONCEPT HERE",
            label: "Technology or Concept",
            type: "textarea" as const,
            description: "Enter the technology, concept, or innovation you want to analyze for social impact",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Practical Implementation",
        description: "Get practical information on how to implement or apply a particular technology or methodology",
        isSystemDefined: true,
        isActive: true,
        icon: "⚙️",
        templateContent: "Perform a detailed application and implementation analysis of [SPECIFIC TECHNOLOGY/METHODOLOGY HERE], identifying its core use cases, practical implementation challenges, and the ecosystem of tools or platforms that support its deployment. For each primary use case, describe its typical workflow, specify the prerequisite technical infrastructure or data requirements, and list at least three key performance indicators (KPIs) or success metrics used to evaluate its effectiveness. Conclude with an 'Implementation Readiness Map' that categorizes the identified challenges (e.g., technical, data quality, integration, user adoption) and proposes initial mitigation strategies, providing a clear roadmap for practical application.",
        placeholders: [
          {
            name: "SPECIFIC TECHNOLOGY/METHODOLOGY HERE",
            label: "Technology or Methodology",
            type: "textarea" as const,
            description: "Enter the technology, methodology, or approach you want to implement",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Legal",
        description: "Find the external legal constraints or frameworks governing a particular industry or technology",
        isSystemDefined: true,
        isActive: true,
        icon: "⚖️",
        templateContent: "Perform an in-depth analysis of the regulatory and legal landscape surrounding [SPECIFIC INDUSTRY/TECHNOLOGY HERE], identifying the key legislative acts, regulatory bodies, and influential legal precedents that shape its operation. For each major regulatory area (e.g., data protection, consumer safety, intellectual property, antitrust), detail its core provisions or mandates, specify the entities responsible for enforcement, and list at least three critical compliance requirements or legal obligations for participants in the domain. Conclude with a 'Regulatory Compliance Framework' that maps legal terms and obligations to specific operational areas, highlighting areas of regulatory uncertainty or upcoming legislative changes, providing a clear understanding of the legal 'surface area'.",
        placeholders: [
          {
            name: "SPECIFIC INDUSTRY/TECHNOLOGY HERE",
            label: "Industry or Technology",
            type: "textarea" as const,
            description: "Enter the industry, technology, or domain you want to analyze for legal constraints",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Insert all prompt templates
    const insertedIds = await Promise.all(
      promptTemplates.map(template => ctx.db.insert("promptTemplates", template))
    );

    console.log(`Seeded ${insertedIds.length} prompt templates`);
    return insertedIds;
  },
});

// Seed LLM models pricing (per-million token USD costs)
export const seedLlmModels = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existing = await ctx.db.query("llmModels").collect();
    const byId = new Set(existing.map(m => m.modelId));
    const models = [
      { modelId: 'openai/gpt-4o-mini', inputTokenCostPerMillion: 0.15, outputTokenCostPerMillion: 0.60 },
      { modelId: 'google/gemini-2.5-flash-lite', inputTokenCostPerMillion: 0.10, outputTokenCostPerMillion: 0.40 },
      { modelId: 'anthropic/claude-3.5-haiku', inputTokenCostPerMillion: 0.25, outputTokenCostPerMillion: 1.25 },
      { modelId: 'openai/gpt-oss-20b:free', inputTokenCostPerMillion: 0, outputTokenCostPerMillion: 0 },
    ];
    let inserted = 0;
    for (const m of models) {
      if (byId.has(m.modelId)) continue;
      await ctx.db.insert("llmModels", { ...m, createdAt: now, updatedAt: now });
      inserted++;
    }
    return { inserted, totalKnown: models.length };
  },
});

// Sync prompt templates from JSON file to database
export const syncPromptTemplatesFromJSON = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get current templates from database
    const existingTemplates = await ctx.db.query("promptTemplates").collect();
    
    // Import the JSON data (this would need to be done differently in a real app)
    // For now, we'll use the same templates as in seedPromptTemplates
    const jsonTemplates = [
      {
        name: "Knowledge Graph",
        description: "Create a knowledge graph of key terms for any given topic",
        templateContent: "Conduct an exhaustive domain analysis of [SPECIFIC TOPIC HERE], identifying its core ontological concepts, primary sub-domains, and the foundational theories or principles underpinning each. For each identified sub-domain, provide a concise definition, list at least three key terms or concepts unique to it, and propose a conceptual mapping that illustrates its relationship to the main topic and other sub-domains. The output should be structured as a hierarchical knowledge graph, accompanied by a narrative summary explaining the interdependencies and emergent properties of the domain.",
        icon: "🕸️",
        placeholders: [
          {
            name: "SPECIFIC_TOPIC_HERE",
            label: "Topic to Analyze",
            type: "textarea" as const,
            description: "Enter the specific topic, concept, or domain you want to analyze",
            optional: false,
          }
        ],
      },
      {
        name: "History",
        description: "Generate context for a key historical figure or event",
        templateContent: "Perform a comprehensive landscape scan of [SPECIFIC TOPIC HERE], delineating its historical evolution, current state-of-the-art, and projected future trajectories. For each temporal phase (past, present, future), identify the most significant breakthroughs, influential figures or organizations, and prevalent methodologies or technologies. Systematically extract and define at least five critical jargon terms or technical concepts associated with each phase. Conclude with a 'Domain Surface Area Map' that categorizes these terms based on their relevance to different aspects (e.g., technical, theoretical, ethical, application) of the topic, highlighting areas of active research and potential disruption.",
        icon: "📚",
        placeholders: [
          {
            name: "SPECIFIC_TOPIC_HERE",
            label: "Historical Topic",
            type: "textarea" as const,
            description: "Enter the historical figure, event, or concept you want to analyze",
            optional: false,
          }
        ],
      },
      {
        name: "Social Analysis",
        description: "Conduct an in-depth social analysis, including impact, of a given idea or technology",
        templateContent: "Conduct a comprehensive ethical and societal impact assessment of [SPECIFIC TECHNOLOGY/CONCEPT HERE], identifying its primary stakeholders, potential benefits, and anticipated risks or harms. For each identified impact category (e.g., privacy, equity, employment, environmental), delineate specific manifestations of the impact, provide illustrative real-world examples (if applicable), and list at least three key ethical frameworks or societal principles (e.g., fairness, autonomy, transparency) most relevant to its analysis. The output should be structured as a 'Risk-Benefit Matrix' with associated ethical considerations, accompanied by a narrative explaining the normative trade-offs and areas requiring policy or regulatory attention.",
        icon: "🌍",
        placeholders: [
          {
            name: "SPECIFIC TECHNOLOGY/CONCEPT HERE",
            label: "Technology or Concept",
            type: "textarea" as const,
            description: "Enter the technology, concept, or innovation you want to analyze for social impact",
            optional: false,
          }
        ],
      },
      {
        name: "Practical Implementation",
        description: "Get practical information on how to implement or apply a particular technology or methodology",
        templateContent: "Perform a detailed application and implementation analysis of [SPECIFIC TECHNOLOGY/METHODOLOGY HERE], identifying its core use cases, practical implementation challenges, and the ecosystem of tools or platforms that support its deployment. For each primary use case, describe its typical workflow, specify the prerequisite technical infrastructure or data requirements, and list at least three key performance indicators (KPIs) or success metrics used to evaluate its effectiveness. Conclude with an 'Implementation Readiness Map' that categorizes the identified challenges (e.g., technical, data quality, integration, user adoption) and proposes initial mitigation strategies, providing a clear roadmap for practical application.",
        icon: "⚙️",
        placeholders: [
          {
            name: "SPECIFIC TECHNOLOGY/METHODOLOGY HERE",
            label: "Technology or Methodology",
            type: "textarea" as const,
            description: "Enter the technology, methodology, or approach you want to implement",
            optional: false,
          }
        ],
      },
      {
        name: "Legal",
        description: "Find the external legal constraints or frameworks governing a particular industry or technology",
        templateContent: "Perform an in-depth analysis of the regulatory and legal landscape surrounding [SPECIFIC INDUSTRY/TECHNOLOGY HERE], identifying the key legislative acts, regulatory bodies, and influential legal precedents that shape its operation. For each major regulatory area (e.g., data protection, consumer safety, intellectual property, antitrust), detail its core provisions or mandates, specify the entities responsible for enforcement, and list at least three critical compliance requirements or legal obligations for participants in the domain. Conclude with a 'Regulatory Compliance Framework' that maps legal terms and obligations to specific operational areas, highlighting areas of regulatory uncertainty or upcoming legislative changes, providing a clear understanding of the legal 'surface area'.",
        icon: "⚖️",
        placeholders: [
          {
            name: "SPECIFIC INDUSTRY/TECHNOLOGY HERE",
            label: "Industry or Technology",
            type: "textarea" as const,
            description: "Enter the industry, technology, or domain you want to analyze for legal constraints",
            optional: false,
          }
        ],
      },
    ];
    
    let newTemplatesCount = 0;
    let updatedTemplatesCount = 0;
    
    // Process each JSON template
    for (const jsonTemplate of jsonTemplates) {
      const existingTemplate = existingTemplates.find(t => t.name === jsonTemplate.name);
      
      if (!existingTemplate) {
        // Create new template
        await ctx.db.insert("promptTemplates", {
          ...jsonTemplate,
          isSystemDefined: true,
          isActive: true,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        newTemplatesCount++;
      } else {
        // Check if template needs updating
        if (
          existingTemplate.templateContent !== jsonTemplate.templateContent ||
          existingTemplate.description !== jsonTemplate.description
        ) {
          await ctx.db.patch(existingTemplate._id, {
            templateContent: jsonTemplate.templateContent,
            description: jsonTemplate.description,
            placeholders: jsonTemplate.placeholders,
            icon: jsonTemplate.icon,
            updatedAt: now,
          });
          updatedTemplatesCount++;
        }
      }
    }
    
    console.log(`Sync completed: ${newTemplatesCount} new templates, ${updatedTemplatesCount} updated templates`);
    return { newTemplatesCount, updatedTemplatesCount };
  },
});

// Clear all prompt templates and re-seed them
export const reseedPromptTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all existing prompt templates
    const existingTemplates = await ctx.db.query("promptTemplates").collect();
    let deletedCount = 0;
    
    for (const template of existingTemplates) {
      await ctx.db.delete(template._id);
      deletedCount++;
    }
    
    console.log(`Deleted ${deletedCount} existing templates`);
    
    // Re-seed with correct placeholder names
    const now = Date.now();
    
    // System-defined prompt templates with correct placeholder names
    const promptTemplates = [
      {
        name: "Knowledge Graph",
        description: "Create a knowledge graph of key terms for any given topic",
        isSystemDefined: true,
        isActive: true,
        icon: "🕸️",
        templateContent: "Conduct an exhaustive domain analysis of [SPECIFIC TOPIC HERE], identifying its core ontological concepts, primary sub-domains, and the foundational theories or principles underpinning each. For each identified sub-domain, provide a concise definition, list at least three key terms or concepts unique to it, and propose a conceptual mapping that illustrates its relationship to the main topic and other sub-domains. The output should be structured as a hierarchical knowledge graph, accompanied by a narrative summary explaining the interdependencies and emergent properties of the domain.",
        placeholders: [
          {
            name: "SPECIFIC TOPIC HERE",
            label: "Topic to Analyze",
            type: "textarea" as const,
            description: "Enter the specific topic, concept, or domain you want to analyze",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "History",
        description: "Generate context for a key historical figure or event",
        isSystemDefined: true,
        isActive: true,
        icon: "📚",
        templateContent: "Perform a comprehensive landscape scan of [SPECIFIC TOPIC HERE], delineating its historical evolution, current state-of-the-art, and projected future trajectories. For each temporal phase (past, present, future), identify the most significant breakthroughs, influential figures or organizations, and prevalent methodologies or technologies. Systematically extract and define at least five critical jargon terms or technical concepts associated with each phase. Conclude with a 'Domain Surface Area Map' that categorizes these terms based on their relevance to different aspects (e.g., technical, theoretical, ethical, application) of the topic, highlighting areas of active research and potential disruption.",
        placeholders: [
          {
            name: "SPECIFIC TOPIC HERE",
            label: "Historical Topic",
            type: "textarea" as const,
            description: "Enter the historical figure, event, or concept you want to analyze",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Social Analysis",
        description: "Conduct an in-depth social analysis, including impact, of a given idea or technology",
        isSystemDefined: true,
        isActive: true,
        icon: "🌍",
        templateContent: "Conduct a comprehensive ethical and societal impact assessment of [SPECIFIC TECHNOLOGY/CONCEPT HERE], identifying its primary stakeholders, potential benefits, and anticipated risks or harms. For each identified impact category (e.g., privacy, equity, employment, environmental), delineate specific manifestations of the impact, provide illustrative real-world examples (if applicable), and list at least three key ethical frameworks or societal principles (e.g., fairness, autonomy, transparency) most relevant to its analysis. The output should be structured as a 'Risk-Benefit Matrix' with associated ethical considerations, accompanied by a narrative explaining the normative trade-offs and areas requiring policy or regulatory attention.",
        placeholders: [
          {
            name: "SPECIFIC TECHNOLOGY/CONCEPT HERE",
            label: "Technology or Concept",
            type: "textarea" as const,
            description: "Enter the technology, concept, or innovation you want to analyze for social impact",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Practical Implementation",
        description: "Get practical information on how to implement or apply a particular technology or methodology",
        isSystemDefined: true,
        isActive: true,
        icon: "⚙️",
        templateContent: "Perform a detailed application and implementation analysis of [SPECIFIC TECHNOLOGY/METHODOLOGY HERE], identifying its core use cases, practical implementation challenges, and the ecosystem of tools or platforms that support its deployment. For each primary use case, describe its typical workflow, specify the prerequisite technical infrastructure or data requirements, and list at least three key performance indicators (KPIs) or success metrics used to evaluate its effectiveness. Conclude with an 'Implementation Readiness Map' that categorizes the identified challenges (e.g., technical, data quality, integration, user adoption) and proposes initial mitigation strategies, providing a clear roadmap for practical application.",
        placeholders: [
          {
            name: "SPECIFIC TECHNOLOGY/METHODOLOGY HERE",
            label: "Technology or Methodology",
            type: "textarea" as const,
            description: "Enter the technology, methodology, or approach you want to implement",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Legal",
        description: "Find the external legal constraints or frameworks governing a particular industry or technology",
        isSystemDefined: true,
        isActive: true,
        icon: "⚖️",
        templateContent: "Perform an in-depth analysis of the regulatory and legal landscape surrounding [SPECIFIC INDUSTRY/TECHNOLOGY HERE], identifying the key legislative acts, regulatory bodies, and influential legal precedents that shape its operation. For each major regulatory area (e.g., data protection, consumer safety, intellectual property, antitrust), detail its core provisions or mandates, specify the entities responsible for enforcement, and list at least three critical compliance requirements or legal obligations for participants in the domain. Conclude with a 'Regulatory Compliance Framework' that maps legal terms and obligations to specific operational areas, highlighting areas of regulatory uncertainty or upcoming legislative changes, providing a clear understanding of the legal 'surface area'.",
        placeholders: [
          {
            name: "SPECIFIC INDUSTRY/TECHNOLOGY HERE",
            label: "Industry or Technology",
            type: "textarea" as const,
            description: "Enter the industry, technology, or domain you want to analyze for legal constraints",
            optional: false,
          }
        ],
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Insert all prompt templates
    const insertedIds = await Promise.all(
      promptTemplates.map(template => ctx.db.insert("promptTemplates", template))
    );

    console.log(`Re-seeded ${insertedIds.length} prompt templates`);
    return { deletedCount, reseededCount: insertedIds.length };
  },
});

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Create main RAG Chatbot nexus
    const nexusId = await ctx.db.insert("nexi", {
      name: "RAG Chatbot Development",
      description: "Comprehensive knowledge base for building Retrieval-Augmented Generation chatbots",
      createdAt: now,
      updatedAt: now,
    });

    // Create notebooks within the nexus
    const notebooks = [
      {
        name: "Vector Database Fundamentals",
        description: "Understanding embeddings, similarity search, and vector storage",
        metaQuestion: "How do vector databases work and which one should I choose?",
        order: 0,
      },
      {
        name: "Chunking Strategies",
        description: "Text segmentation techniques for optimal retrieval",
        metaQuestion: "What's the best way to split documents for RAG?",
        order: 1,
      },
      {
        name: "Prompt Engineering for RAG",
        description: "Crafting effective prompts that leverage retrieved context",
        metaQuestion: "How do I write prompts that make the best use of retrieved information?",
        order: 2,
      },
      {
        name: "Evaluation & Testing",
        description: "Measuring RAG system performance and quality",
        metaQuestion: "How do I know if my RAG system is working well?",
        order: 3,
      },
      {
        name: "Production Deployment",
        description: "Scaling and deploying RAG systems in production",
        metaQuestion: "What are the best practices for deploying RAG systems?",
        order: 4,
      },
      {
        name: "Advanced Techniques",
        description: "Hybrid search, re-ranking, and multi-modal RAG",
        metaQuestion: "What advanced techniques can improve RAG performance?",
        order: 5,
      },
    ];

    const notebookIds = [];
    for (const notebook of notebooks) {
      const notebookId = await ctx.db.insert("notebooks", {
        nexusId,
        ...notebook,
        createdAt: now,
        updatedAt: now,
      });
      notebookIds.push(notebookId);
    }

    // Create tags for each notebook
    const tagData = [
      // Vector Database Fundamentals tags
      {
        notebookId: notebookIds[0],
        tags: [
          { name: "Embeddings", description: "Vector representations of text", color: "#3B82F6", order: 0 },
          { name: "Similarity Search", description: "Finding similar vectors", color: "#8B5CF6", order: 1 },
          { name: "Pinecone", description: "Vector database platform", color: "#10B981", order: 2 },
          { name: "Weaviate", description: "Vector database with schema", color: "#F59E0B", order: 3 },
          { name: "Chroma", description: "Open-source vector database", color: "#EF4444", order: 4 },
        ],
      },
      // Chunking Strategies tags
      {
        notebookId: notebookIds[1],
        tags: [
          { name: "Semantic Chunking", description: "Chunking based on meaning", color: "#3B82F6", order: 0 },
          { name: "Fixed-Size Chunks", description: "Uniform chunk sizes", color: "#8B5CF6", order: 1 },
          { name: "Overlap Strategies", description: "Handling context across chunks", color: "#10B981", order: 2 },
          { name: "Sentence Splitting", description: "Chunking at sentence boundaries", color: "#F59E0B", order: 3 },
          { name: "Paragraph Splitting", description: "Chunking at paragraph boundaries", color: "#EF4444", order: 4 },
        ],
      },
      // Prompt Engineering tags
      {
        notebookId: notebookIds[2],
        tags: [
          { name: "Context Injection", description: "Incorporating retrieved context", color: "#3B82F6", order: 0 },
          { name: "Few-Shot Examples", description: "Example-based prompting", color: "#8B5CF6", order: 1 },
          { name: "System Prompts", description: "Defining AI behavior", color: "#10B981", order: 2 },
          { name: "Temperature Tuning", description: "Controlling response creativity", color: "#F59E0B", order: 3 },
          { name: "Chain-of-Thought", description: "Step-by-step reasoning", color: "#EF4444", order: 4 },
        ],
      },
      // Evaluation & Testing tags
      {
        notebookId: notebookIds[3],
        tags: [
          { name: "Retrieval Metrics", description: "Measuring search quality", color: "#3B82F6", order: 0 },
          { name: "Generation Metrics", description: "Measuring response quality", color: "#8B5CF6", order: 1 },
          { name: "Human Evaluation", description: "Manual quality assessment", color: "#10B981", order: 2 },
          { name: "A/B Testing", description: "Comparing system versions", color: "#F59E0B", order: 3 },
          { name: "ROUGE Scores", description: "Text similarity metrics", color: "#EF4444", order: 4 },
        ],
      },
      // Production Deployment tags
      {
        notebookId: notebookIds[4],
        tags: [
          { name: "Caching", description: "Storing frequent queries", color: "#3B82F6", order: 0 },
          { name: "Load Balancing", description: "Distributing traffic", color: "#8B5CF6", order: 1 },
          { name: "Monitoring", description: "Tracking system health", color: "#10B981", order: 2 },
          { name: "Rate Limiting", description: "Controlling API usage", color: "#F59E0B", order: 3 },
          { name: "Cost Optimization", description: "Managing API expenses", color: "#EF4444", order: 4 },
        ],
      },
      // Advanced Techniques tags
      {
        notebookId: notebookIds[5],
        tags: [
          { name: "Hybrid Search", description: "Combining semantic and keyword search", color: "#3B82F6", order: 0 },
          { name: "Re-ranking", description: "Improving search results", color: "#8B5CF6", order: 1 },
          { name: "Multi-modal RAG", description: "Text, image, and audio", color: "#10B981", order: 2 },
          { name: "Conversational Memory", description: "Maintaining context", color: "#F59E0B", order: 3 },
          { name: "Active Learning", description: "Improving from user feedback", color: "#EF4444", order: 4 },
        ],
      },
    ];

    // Insert tags
    for (const { notebookId, tags } of tagData) {
      for (const tag of tags) {
        await ctx.db.insert("tags", {
          notebookId,
          ...tag,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Create some sample chunks
    const sampleChunks = [
      {
        notebookId: notebookIds[0],
        title: "What are Vector Embeddings?",
        originalText: "Vector embeddings are numerical representations of text that capture semantic meaning. They allow us to compare documents based on their content rather than exact word matches. Popular embedding models include OpenAI's text-embedding-ada-002 and sentence-transformers.",
        chunkType: "text",
        order: 0,
      },
      {
        notebookId: notebookIds[0],
        title: "Pinecone vs Weaviate Comparison",
        originalText: "Pinecone is a managed vector database service that's easy to get started with but can be expensive at scale. Weaviate is open-source and offers more flexibility with schema management, but requires more setup and maintenance.",
        chunkType: "text",
        order: 1,
      },
      {
        notebookId: notebookIds[1],
        title: "Optimal Chunk Size for RAG",
        originalText: "The optimal chunk size depends on your use case. For factual questions, smaller chunks (100-500 tokens) work well. For complex reasoning, larger chunks (500-1000 tokens) provide more context. Always include some overlap between chunks to maintain context.",
        chunkType: "text",
        order: 0,
      },
      {
        notebookId: notebookIds[2],
        title: "RAG Prompt Template",
        originalText: `System: You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain enough information, say so.

Context: {context}

Question: {question}

Answer:`,
        chunkType: "code",
        order: 0,
      },
    ];

    for (const chunk of sampleChunks) {
      // Ensure chunkType is explicitly typed as one of the allowed string literals
      await ctx.db.insert("chunks", {
        ...chunk,
        chunkType: chunk.chunkType as "text" | "code" | "document",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, nexusId, notebookCount: notebooks.length };
  },
}); 