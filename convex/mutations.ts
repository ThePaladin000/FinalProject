import { mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";

// Helper: ensure CORE meta tag exists and return its id
async function ensureCoreMetaTag(ctx: MutationCtx): Promise<Id<"metaTags"> | undefined> {
  try {
    const existing = await ctx.db
      .query("metaTags")
      .withIndex("by_name", (q) => q.eq("name", "CORE"))
      .first();
    if (existing) {
      return existing._id as Id<"metaTags">;
    }
  } catch {
    // continue to create
  }

  const now = Date.now();
  try {
    const createdId = await ctx.db.insert("metaTags", {
      name: "CORE",
      displayColor: "BLUE",
      description: "Essential information, fundamental concepts, main ideas, widely accepted facts",
      isSystem: true,
      createdAt: now,
      updatedAt: now,
      ownerId: undefined,
    });
    return createdId as Id<"metaTags">;
  } catch {
    return undefined;
  }
}

// Ensure a user record exists for the currently authenticated Clerk user
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject as string | undefined;
    if (!subject) return { created: false, updated: false };

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { lastActiveAt: now, updatedAt: now });
      return { created: false, updated: true };
    }

    // Give new users 100 shards as a welcome bonus
    const welcomeShards = 100;
    const user = await ctx.db.insert("users", {
      userId: subject,
      createdAt: now,
      updatedAt: now,
      shardBalance: welcomeShards,
      monthlyShardAllowance: 100,
      lastAllowanceResetDate: now,
      purchasedShards: 0,
    });

    // Record the welcome bonus transaction
    await ctx.db.insert("shardTransactions", {
      userId: user,
      type: "WELCOME_BONUS",
      shardAmount: welcomeShards,
      reason: "Welcome bonus for new users",
      associatedConversationId: undefined,
      inputTokensUsed: undefined,
      outputTokensUsed: undefined,
      modelIdUsed: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { created: true, updated: false };
  },
});

// Server-side pathway to ensure a user exists without relying on Convex auth context.
// Intended to be called only from trusted server code (e.g., Next.js API route after Clerk auth).
export const ensureUserServer = mutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastActiveAt: now,
        updatedAt: now,
        email: args.email ?? existing.email,
        name: args.name ?? existing.name,
        imageUrl: args.imageUrl ?? existing.imageUrl,
      });
      return { created: false, updated: true };
    }

    // Give new users 100 shards as a welcome bonus
    const welcomeShards = 100;
    const user = await ctx.db.insert("users", {
      userId: args.userId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
      shardBalance: welcomeShards,
      monthlyShardAllowance: 100,
      lastAllowanceResetDate: now,
      purchasedShards: 0,
    });

    // Record the welcome bonus transaction
    await ctx.db.insert("shardTransactions", {
      userId: user,
      type: "WELCOME_BONUS",
      shardAmount: welcomeShards,
      reason: "Welcome bonus for new users",
      associatedConversationId: undefined,
      inputTokensUsed: undefined,
      outputTokensUsed: undefined,
      modelIdUsed: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { created: true, updated: false };
  },
});

// Update the current user's profile fields
export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // plan is derived from billing typically; allow toggling isPaid for now
    isPaid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject as string | undefined;
    if (!subject) throw new Error("Unauthenticated");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();
    const now = Date.now();
    if (!existing) {
      const newId = await ctx.db.insert("users", {
        userId: subject,
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        isPaid: args.isPaid,
        createdAt: now,
        updatedAt: now,
      });
      return newId;
    }
    await ctx.db.patch(existing._id, {
      email: args.email ?? existing.email,
      name: args.name ?? existing.name,
      imageUrl: args.imageUrl ?? existing.imageUrl,
      isPaid: args.isPaid ?? existing.isPaid,
      updatedAt: now,
    });
    return existing._id;
  },
});

// Update current user's preferences (dark mode, model picker list, placements)
export const updateMyPreferences = mutation({
  args: {
    isDarkmode: v.optional(v.boolean()),
    favModel: v.optional(v.string()),
    modelPickerList: v.optional(v.array(v.string())),
    addChunkPlacement: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
    importChunkPlacement: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
    researchChunkPlacement: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject as string | undefined;
    if (!subject) throw new Error("Unauthenticated");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();
    const now = Date.now();
    if (!existing) {
      const newId = await ctx.db.insert("users", {
        userId: subject,
        isDarkmode: args.isDarkmode,
        favModel: args.favModel,
        modelPickerList: args.modelPickerList,
        addChunkPlacement: args.addChunkPlacement,
        importChunkPlacement: args.importChunkPlacement,
        researchChunkPlacement: args.researchChunkPlacement,
        createdAt: now,
        updatedAt: now,
      });
      return newId;
    }
    await ctx.db.patch(existing._id, {
      isDarkmode: args.isDarkmode ?? existing.isDarkmode,
      favModel: args.favModel ?? existing.favModel,
      modelPickerList: args.modelPickerList ?? existing.modelPickerList,
      addChunkPlacement: args.addChunkPlacement ?? existing.addChunkPlacement,
      importChunkPlacement: args.importChunkPlacement ?? existing.importChunkPlacement,
      researchChunkPlacement: args.researchChunkPlacement ?? (existing as any).researchChunkPlacement,
      updatedAt: now,
    });
    return existing._id;
  },
});

// Debit shards after an LLM call. Ensures atomicity per user document.
export const debitShards = mutation({
  args: {
    userId: v.string(), // Clerk subject
    totalShardCost: v.number(),
    reason: v.optional(v.string()),
    inputTokensUsed: v.optional(v.number()),
    outputTokensUsed: v.optional(v.number()),
    modelIdUsed: v.optional(v.string()),
    associatedConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    const currentBalance = user.shardBalance ?? 0;
    if (args.totalShardCost <= 0) return { skipped: true };
    if (currentBalance < args.totalShardCost) {
      throw new Error("Insufficient Shards");
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
      shardBalance: currentBalance - args.totalShardCost,
      updatedAt: now,
    });

    await ctx.db.insert("shardTransactions", {
      userId: user._id,
      type: "DEBIT",
      shardAmount: -args.totalShardCost,
      reason: args.reason,
      associatedConversationId: args.associatedConversationId,
      inputTokensUsed: args.inputTokensUsed,
      outputTokensUsed: args.outputTokensUsed,
      modelIdUsed: args.modelIdUsed,
      createdAt: now,
      updatedAt: now,
    });

    return { balance: currentBalance - args.totalShardCost };
  },
});

// Credit shards for monthly reset
export const monthlyAllowanceReset = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
    const monthStartMs = monthStart.getTime();

    const users = await ctx.db.query("users").collect();
    let processed = 0;
    for (const user of users) {
      const last = user.lastAllowanceResetDate ?? 0;
      const allowance = user.monthlyShardAllowance ?? 0;
      if (allowance > 0 && last < monthStartMs) {
        const newBalance = (user.shardBalance ?? 0) + allowance;
        await ctx.db.patch(user._id, {
          shardBalance: newBalance,
          lastAllowanceResetDate: monthStartMs,
          updatedAt: now,
        });
        await ctx.db.insert("shardTransactions", {
          userId: user._id,
          type: "MONTHLY_RESET",
          shardAmount: allowance,
          reason: "Monthly allowance reset",
          associatedConversationId: undefined,
          inputTokensUsed: undefined,
          outputTokensUsed: undefined,
          modelIdUsed: undefined,
          createdAt: now,
          updatedAt: now,
        });
        processed++;
      }
    }
    return { processed };
  },
});

// Credit shards on purchase
export const creditShards = mutation({
  args: {
    userId: v.string(),
    purchasedAmount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!user) throw new Error("User not found");
    if (args.purchasedAmount <= 0) return { skipped: true };

    const now = Date.now();
    const newBalance = (user.shardBalance ?? 0) + args.purchasedAmount;
    await ctx.db.patch(user._id, {
      shardBalance: newBalance,
      purchasedShards: (user.purchasedShards ?? 0) + args.purchasedAmount,
      updatedAt: now,
    });

    await ctx.db.insert("shardTransactions", {
      userId: user._id,
      type: "PURCHASE",
      shardAmount: args.purchasedAmount,
      reason: args.reason ?? "User purchase",
      associatedConversationId: undefined,
      inputTokensUsed: undefined,
      outputTokensUsed: undefined,
      modelIdUsed: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { balance: newBalance };
  },
});

// Helper function to get the next position for a content item in a locus
async function getNextPosition(ctx: MutationCtx, locusId: string, parentId?: string): Promise<number> {
  const existingItems = await ctx.db
    .query("locusContentItems")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_locus_parent", (q: any) => 
      q.eq("locusId", locusId).eq("parentId", parentId)
    )
    .order("desc")
    .first();
  
  return existingItems ? existingItems.position + 1 : 0;
}

// Helper function to insert a content item at the top (position 0)
async function insertContentItemAtTop(
  ctx: MutationCtx,
  locusId: string,
  locusType: "nexus" | "notebook",
  contentType: "chunk" | "notebook" | "tag" | "conversationMessage",
  contentId: string,
  parentId?: string
): Promise<void> {
  const now = Date.now();
  const identity = await ctx.auth.getUserIdentity();
  
  // Shift all existing items down by 1
  const existingItems = await ctx.db
    .query("locusContentItems")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_locus_parent", (q: any) => 
      q.eq("locusId", locusId).eq("parentId", parentId)
    )
    .collect();
  
  for (const item of existingItems) {
    await ctx.db.patch(item._id, {
      position: item.position + 1,
      updatedAt: now,
    });
  }
  
  // Insert the new item at position 0
  await ctx.db.insert("locusContentItems", {
    locusId,
    locusType,
    contentType,
    contentId,
    position: 0,
    parentId,
    createdAt: now,
    updatedAt: now,
    ownerId: identity?.subject,
  });
}

// Helper function to append a content item at the end
async function appendContentItem(
  ctx: MutationCtx,
  locusId: string,
  locusType: "nexus" | "notebook",
  contentType: "chunk" | "notebook" | "tag" | "conversationMessage",
  contentId: string,
  parentId?: string
): Promise<void> {
  const now = Date.now();
  const nextPosition = await getNextPosition(ctx, locusId, parentId);
  const identity = await ctx.auth.getUserIdentity();
  
  await ctx.db.insert("locusContentItems", {
    locusId,
    locusType,
    contentType,
    contentId,
    position: nextPosition,
    parentId,
    createdAt: now,
    updatedAt: now,
    ownerId: identity?.subject,
  });
}

// Reorder content items within a locus (for drag and drop)
export const reorderLocusContentItems = mutation({
  args: {
    locusId: v.string(), // Can be nexus ID or notebook ID
    contentType: v.union(
      v.literal("chunk"),
      v.literal("notebook"),
      v.literal("tag"),
      v.literal("conversationMessage")
    ),
    itemIds: v.array(v.string()), // Ordered array of content IDs in their new positions
    parentId: v.optional(v.string()), // For hierarchical organization
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get all existing items for this locus, content type, and parent
    const existingItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_locus_parent", (q) => 
        q.eq("locusId", args.locusId).eq("parentId", args.parentId)
      )
      .filter((q) => q.eq(q.field("contentType"), args.contentType))
      .collect();
    
    // Create a map of contentId to existing item for easy lookup
    const itemMap = new Map(existingItems.map(item => [item.contentId, item]));
    
    // Update positions based on the new order
    for (let i = 0; i < args.itemIds.length; i++) {
      const contentId = args.itemIds[i];
      const existingItem = itemMap.get(contentId);
      
      if (existingItem) {
        await ctx.db.patch(existingItem._id, {
          position: i,
          updatedAt: now,
        });
      }
    }
  },
});

// Move content item between different parents or loci
export const moveLocusContentItem = mutation({
  args: {
    itemId: v.id("locusContentItems"),
    newLocusId: v.string(), // Can be nexus ID or notebook ID
    newLocusType: v.union(v.literal("nexus"), v.literal("notebook")),
    newParentId: v.optional(v.string()),
    newPosition: v.optional(v.number()), // If not provided, append to end
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    
    if (!item) {
      throw new Error("Content item not found");
    }
    
    // If moving to a new position, calculate it
    const finalPosition = args.newPosition !== undefined 
      ? args.newPosition 
      : await getNextPosition(ctx, args.newLocusId, args.newParentId);
    
    // Update the item
    await ctx.db.patch(args.itemId, {
      locusId: args.newLocusId,
      locusType: args.newLocusType,
      parentId: args.newParentId,
      position: finalPosition,
      updatedAt: now,
    });
  },
});

// Delete conversations older than 7 days
export const cleanupOldConversations = mutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
    
    // Find all conversations older than 7 days
    const oldConversations = await ctx.db
      .query("conversations")
      .withIndex("by_created_at", (q) => q.lt("createdAt", sevenDaysAgo))
      .collect();
    
    let deletedCount = 0;
    
    // Delete each old conversation and its associated messages
    for (const conversation of oldConversations) {
      // First, delete all messages associated with this conversation
      const messages = await ctx.db
        .query("conversationMessages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
        .collect();
      
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      
      // Then delete the conversation itself
      await ctx.db.delete(conversation._id);
      deletedCount++;
    }
    
    return { deletedCount, totalOldConversations: oldConversations.length };
  },
});

// Assign a meta tag to a chunk
export const assignMetaTagToChunk = mutation({
  args: {
    chunkId: v.id("chunks"),
    metaTagId: v.optional(v.id("metaTags")), // Optional to allow removing meta tag
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chunkId, {
      metaTagId: args.metaTagId,
      updatedAt: Date.now(),
    });
    
    // Note: Convex automatically invalidates queries when data changes
    // The UI should update automatically after this mutation
  },
});

// Create a new nexus
export const createNexus = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    // Determine next order (append to end)
    const allNexi: Doc<"nexi">[] = await ctx.db.query("nexi").collect();
    const nextOrder =
      allNexi.reduce((max, n) => {
        const orderValue = typeof n.order === "number" ? n.order : -1;
        return orderValue > max ? orderValue : max;
      }, -1) + 1;
    const nexusId = await ctx.db.insert("nexi", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
      order: nextOrder,
      ownerId: identity?.subject,
    });
    return nexusId;
  },
});

// Create a new nexus for guests (no authentication required, limited to one per session)
export const createGuestNexus = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    guestSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if there's already a guest nexus for this session (no ownerId, not the shared manual)
    const existingGuestNexi = await ctx.db
      .query("nexi")
      .withIndex("by_guest_session", q => q.eq("guestSessionId", args.guestSessionId))
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .filter((q) => q.neq(q.field("name"), "USER MANUAL"))
      .collect();
    
    if (existingGuestNexi.length > 0) {
      throw new Error("Guests can only create one nexus. Please sign in to create more.");
    }
    
    // Determine next order (append to end)
    const allNexi: Doc<"nexi">[] = await ctx.db.query("nexi").collect();
    const nextOrder =
      allNexi.reduce((max, n) => {
        const orderValue = typeof n.order === "number" ? n.order : -1;
        return orderValue > max ? orderValue : max;
      }, -1) + 1;
    
    const nexusId = await ctx.db.insert("nexi", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
      order: nextOrder,
      ownerId: undefined, // Guest nexus has no owner
      guestSessionId: args.guestSessionId, // Scope to this guest session
    });
    return nexusId;
  },
});

// Reorder top-level nexi for home page drag-and-drop
export const reorderNexi = mutation({
  args: {
    orderedNexusIds: v.array(v.id("nexi")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (let i = 0; i < args.orderedNexusIds.length; i++) {
      const nexusId = args.orderedNexusIds[i] as Id<"nexi">;
      await ctx.db.patch(nexusId, {
        order: i,
        updatedAt: now,
      });
    }
    return { updated: args.orderedNexusIds.length };
  },
});

// Simple mutation to assign all orphaned data to a specific user
export const assignOrphanedDataToUser = mutation({
  args: {
    dryRun: v.optional(v.boolean()) // If true, just return what would be changed
  },
  handler: async (ctx, args) => {
    const TARGET_USER_ID = "user_30nwTtRAwOS34muVHyICPGq9xVT";
    const now = Date.now();
    let fixedChunks = 0;
    let fixedNexi = 0;
    let fixedNotebooks = 0;
    let fixedTags = 0;
    let fixedAttachments = 0;
    let fixedJems = 0;
    let fixedConnections = 0;
    let fixedConversations = 0;
    let fixedMessages = 0;
    let fixedContentItems = 0;

    // Find all orphaned data (ownerId is undefined)
    const orphanedChunks = await ctx.db
      .query("chunks")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedNexi = await ctx.db
      .query("nexi")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .filter((q) => q.neq(q.field("name"), "USER MANUAL")) // Keep shared USER MANUAL
      .collect();

    const orphanedNotebooks = await ctx.db
      .query("notebooks")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedTags = await ctx.db
      .query("tags")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedAttachments = await ctx.db
      .query("attachments")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedJems = await ctx.db
      .query("jems")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedConnections = await ctx.db
      .query("chunkConnections")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedConversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedMessages = await ctx.db
      .query("conversationMessages")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    const orphanedContentItems = await ctx.db
      .query("locusContentItems")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    if (args.dryRun) {
      return {
        dryRun: true,
        targetUserId: TARGET_USER_ID,
        wouldFix: {
          chunks: orphanedChunks.length,
          nexi: orphanedNexi.length,
          notebooks: orphanedNotebooks.length,
          tags: orphanedTags.length,
          attachments: orphanedAttachments.length,
          jems: orphanedJems.length,
          connections: orphanedConnections.length,
          conversations: orphanedConversations.length,
          messages: orphanedMessages.length,
          contentItems: orphanedContentItems.length,
        },
        summary: `Would assign ownership of ${
          orphanedChunks.length + orphanedNexi.length + orphanedNotebooks.length +
          orphanedTags.length + orphanedAttachments.length + orphanedJems.length +
          orphanedConnections.length + orphanedConversations.length + orphanedMessages.length +
          orphanedContentItems.length
        } total items to user ${TARGET_USER_ID}`
      };
    }

    // Actually fix the data
    for (const chunk of orphanedChunks) {
      await ctx.db.patch(chunk._id, { ownerId: TARGET_USER_ID, updatedAt: now });
      fixedChunks++;
    }

    for (const nexus of orphanedNexi) {
      await ctx.db.patch(nexus._id, { ownerId: TARGET_USER_ID, updatedAt: now });
      fixedNexi++;
    }

    for (const notebook of orphanedNotebooks) {
      await ctx.db.patch(notebook._id, { ownerId: TARGET_USER_ID, updatedAt: now });
      fixedNotebooks++;
    }

    for (const tag of orphanedTags) {
      await ctx.db.patch(tag._id, { ownerId: TARGET_USER_ID, updatedAt: now });
      fixedTags++;
    }

    for (const attachment of orphanedAttachments) {
      await ctx.db.patch(attachment._id, { ownerId: TARGET_USER_ID });
      fixedAttachments++;
    }

    for (const jem of orphanedJems) {
      await ctx.db.patch(jem._id, { ownerId: TARGET_USER_ID });
      fixedJems++;
    }

    for (const connection of orphanedConnections) {
      await ctx.db.patch(connection._id, { ownerId: TARGET_USER_ID });
      fixedConnections++;
    }

    for (const conversation of orphanedConversations) {
      await ctx.db.patch(conversation._id, { ownerId: TARGET_USER_ID, updatedAt: now });
      fixedConversations++;
    }

    for (const message of orphanedMessages) {
      await ctx.db.patch(message._id, { ownerId: TARGET_USER_ID });
      fixedMessages++;
    }

    for (const contentItem of orphanedContentItems) {
      await ctx.db.patch(contentItem._id, { ownerId: TARGET_USER_ID, updatedAt: now });
      fixedContentItems++;
    }

    const totalFixed = fixedChunks + fixedNexi + fixedNotebooks + fixedTags +
                     fixedAttachments + fixedJems + fixedConnections +
                     fixedConversations + fixedMessages + fixedContentItems;

    return {
      dryRun: false,
      targetUserId: TARGET_USER_ID,
      fixed: {
        chunks: fixedChunks,
        nexi: fixedNexi,
        notebooks: fixedNotebooks,
        tags: fixedTags,
        attachments: fixedAttachments,
        jems: fixedJems,
        connections: fixedConnections,
        conversations: fixedConversations,
        messages: fixedMessages,
        contentItems: fixedContentItems,
        total: totalFixed,
      },
      summary: `Successfully assigned ownership of ${totalFixed} items to user ${TARGET_USER_ID}`
    };
  },
});

// Create a new notebook within a nexus
export const createNotebook = mutation({
  args: {
    nexusId: v.id("nexi"),
    name: v.string(),
    description: v.optional(v.string()),
    metaQuestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const notebookId = await ctx.db.insert("notebooks", {
      nexusId: args.nexusId,
      name: args.name,
      description: args.description,
      metaQuestion: args.metaQuestion,
      createdAt: now,
      updatedAt: now,
      ownerId: identity?.subject,
    });

    // Add the notebook to the nexus's content organization
    // Note: For notebooks, we use the nexusId as the "locusId" with locusType "nexus"
    await appendContentItem(ctx, args.nexusId, "nexus", "notebook", notebookId, undefined);

    return notebookId;
  },
});

// Create a new chunk within a notebook
export const createChunk = mutation({
  args: {
    notebookId: v.id("notebooks"),
    originalText: v.string(),
    userEditedText: v.optional(v.string()),
    source: v.optional(v.string()),
    chunkType: v.union(v.literal("text"), v.literal("code"), v.literal("document")),
    metaTagId: v.optional(v.id("metaTags")),
    ownerId: v.optional(v.string()),
    placementHint: v.optional(v.union(v.literal("add"), v.literal("import"), v.literal("research"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    // Determine meta tag to assign: use provided one or default to CORE
    let metaTagIdToAssign = args.metaTagId;
    if (!metaTagIdToAssign) {
      metaTagIdToAssign = await ensureCoreMetaTag(ctx);
    }
    const chunkId = await ctx.db.insert("chunks", {
      notebookId: args.notebookId,
      originalText: args.originalText,
      userEditedText: args.userEditedText,
      source: args.source,
      chunkType: args.chunkType,
      metaTagId: metaTagIdToAssign || undefined,
      createdAt: now,
      updatedAt: now,
      ownerId: args.ownerId || identity?.subject,
    });
    
    // Respect user preference for placement (top/bottom)
    let placeAtTop = true;
    try {
      const identity = await ctx.auth.getUserIdentity();
      // Prefer Convex auth identity; fall back to ownerId provided in args (from Next/Clerk)
      const subject = (identity?.subject as string | undefined) ?? (args.ownerId as string | undefined);
      if (subject) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_userId", (q) => q.eq("userId", subject))
          .first();
        if (user) {
          if (args.placementHint === "import") {
            if (user.importChunkPlacement === "bottom") placeAtTop = false;
          } else if (args.placementHint === "research") {
            if ((user as any).researchChunkPlacement === "bottom") placeAtTop = false;
          } else {
            if (user.addChunkPlacement === "bottom") placeAtTop = false;
          }
        }
      }
    } catch {}

    if (placeAtTop) {
      await insertContentItemAtTop(ctx, args.notebookId, "notebook", "chunk", chunkId, undefined);
    } else {
      await appendContentItem(ctx, args.notebookId, "notebook", "chunk", chunkId, undefined);
    }
    
    return chunkId;
  },
});

// Update a chunk
export const updateChunk = mutation({
  args: {
    chunkId: v.id("chunks"),
    originalText: v.optional(v.string()),
    userEditedText: v.optional(v.string()),
    source: v.optional(v.string()),
    chunkType: v.optional(v.union(v.literal("text"), v.literal("code"), v.literal("document"))),
    metaTagId: v.optional(v.id("metaTags")),
  },
  handler: async (ctx, args) => {
    const { chunkId, ...updates } = args;

    // Build patch object only with provided fields to avoid clearing values unintentionally
    const patch: {
      originalText?: string;
      userEditedText?: string;
      source?: string;
      chunkType?: "text" | "code" | "document";
      metaTagId?: Id<"metaTags">;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (updates.originalText !== undefined) patch.originalText = updates.originalText;
    if (updates.userEditedText !== undefined) patch.userEditedText = updates.userEditedText;
    if (updates.source !== undefined) patch.source = updates.source;
    if (updates.chunkType !== undefined) patch.chunkType = updates.chunkType;

    const existing = await ctx.db.get(chunkId);
    if (!existing) throw new Error("Chunk not found");

    // Only touch metaTagId when explicitly provided, or when assigning default CORE for chunks without one
    if (updates.metaTagId !== undefined) {
      patch.metaTagId = updates.metaTagId;
    } else if (existing.metaTagId === undefined) {
      const coreId = await ensureCoreMetaTag(ctx);
      if (coreId) {
        patch.metaTagId = coreId;
      }
    }

    await ctx.db.patch(chunkId, patch);
  },
});

// Delete a chunk
export const deleteChunk = mutation({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    // Delete related data first
    // Delete chunk tags
    await ctx.db
      .query("chunkTags")
      .withIndex("by_chunk", (q) => q.eq("chunkId", args.chunkId))
      .collect()
      .then(tags => tags.forEach(tag => ctx.db.delete(tag._id)));
    
    // Delete conduits
    await ctx.db
      .query("conduits")
      .withIndex("by_source", (q) => q.eq("sourceChunkId", args.chunkId))
      .collect()
      .then(conduits => conduits.forEach(conduit => ctx.db.delete(conduit._id)));
    
    await ctx.db
      .query("conduits")
      .withIndex("by_target", (q) => q.eq("targetChunkId", args.chunkId))
      .collect()
      .then(conduits => conduits.forEach(conduit => ctx.db.delete(conduit._id)));
    
    // Delete jems
    await ctx.db
      .query("jems")
      .withIndex("by_chunk", (q) => q.eq("chunkId", args.chunkId))
      .collect()
      .then(jems => jems.forEach(jem => ctx.db.delete(jem._id)));
    
    // Delete attachments
    await ctx.db
      .query("attachments")
      .withIndex("by_chunk", (q) => q.eq("chunkId", args.chunkId))
      .collect()
      .then(attachments => attachments.forEach(a => ctx.db.delete(a._id)));
    
    // Delete chunk connections and their shadow chunks
    const connections = await ctx.db
      .query("chunkConnections")
      .withIndex("by_source", (q) => q.eq("sourceChunkId", args.chunkId))
      .collect();
    
    for (const connection of connections) {
      // Delete the shadow chunk
      await ctx.db.delete(connection.shadowChunkId);
      
      // Remove the shadow chunk from the target notebook's content items
      const contentItem = await ctx.db
        .query("locusContentItems")
        .withIndex("by_content", (q) => 
          q.eq("contentType", "chunk").eq("contentId", connection.shadowChunkId)
        )
        .filter((q) => q.eq(q.field("locusType"), "notebook"))
        .first();
      
      if (contentItem) {
        await ctx.db.delete(contentItem._id);
      }
      
      // Delete the connection record
      await ctx.db.delete(connection._id);
    }
    
    // Delete the chunk
    await ctx.db.delete(args.chunkId);
  },
});

// Create an attachment for a chunk
export const createAttachment = mutation({
  args: {
    chunkId: v.id("chunks"),
    name: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    // Ensure chunk exists
    const chunk = await ctx.db.get(args.chunkId);
    if (!chunk) throw new Error("Chunk not found");

    const attachmentId = await ctx.db.insert("attachments", {
      chunkId: args.chunkId,
      name: args.name,
      url: args.url,
      createdAt: now,
      ownerId: identity?.subject,
    });
    return attachmentId;
  },
});

// Delete an attachment
export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.attachmentId);
  },
});

// Move a chunk to a different notebook
export const moveChunk = mutation({
  args: {
    chunkId: v.id("chunks"),
    targetNotebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const { chunkId, targetNotebookId } = args;
    
    // Get the current chunk to verify it exists
    const chunk = await ctx.db.get(chunkId);
    if (!chunk) {
      throw new Error("Chunk not found");
    }
    
    // Get the target notebook to verify it exists
    const targetNotebook = await ctx.db.get(targetNotebookId);
    if (!targetNotebook) {
      throw new Error("Target notebook not found");
    }
    
    // Update the chunk's notebook ID
    await ctx.db.patch(chunkId, {
      notebookId: targetNotebookId,
      updatedAt: Date.now(),
    });
    
    // Remove the chunk from the old notebook's locus content items
    const oldLocusItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_content", (q) => 
        q.eq("contentType", "chunk").eq("contentId", chunkId)
      )
      .collect();
    
    for (const item of oldLocusItems) {
      await ctx.db.delete(item._id);
    }
    
    // Add the chunk to the new notebook's locus content items at the end
    await appendContentItem(
      ctx,
      targetNotebookId,
      "notebook",
      "chunk",
      chunkId
    );
  },
});

// Move a chunk to the top of its current notebook
export const moveChunkToTop = mutation({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    const { chunkId } = args;
    
    // Get the current chunk to verify it exists and get its notebook
    const chunk = await ctx.db.get(chunkId);
    if (!chunk) {
      throw new Error("Chunk not found");
    }
    
    // Remove the chunk from its current position in locus content items
    const currentLocusItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_content", (q) => 
        q.eq("contentType", "chunk").eq("contentId", chunkId)
      )
      .collect();
    
    for (const item of currentLocusItems) {
      await ctx.db.delete(item._id);
    }
    
    // Add the chunk to the top of the notebook
    await insertContentItemAtTop(
      ctx,
      chunk.notebookId,
      "notebook",
      "chunk",
      chunkId
    );
  },
});

// Move a chunk to the bottom of its current notebook
export const moveChunkToBottom = mutation({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    const { chunkId } = args;
    
    // Get the current chunk to verify it exists and get its notebook
    const chunk = await ctx.db.get(chunkId);
    if (!chunk) {
      throw new Error("Chunk not found");
    }
    
    // Remove the chunk from its current position in locus content items
    const currentLocusItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_content", (q) => 
        q.eq("contentType", "chunk").eq("contentId", chunkId)
      )
      .collect();
    
    for (const item of currentLocusItems) {
      await ctx.db.delete(item._id);
    }
    
    // Add the chunk to the bottom of the notebook
    await appendContentItem(
      ctx,
      chunk.notebookId,
      "notebook",
      "chunk",
      chunkId
    );
  },
});

// Update a nexus
export const updateNexus = mutation({
  args: {
    nexusId: v.id("nexi"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { nexusId, ...updates } = args;
    await ctx.db.patch(nexusId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a nexus (and all its related data)
export const deleteNexus = mutation({
  args: {
    nexusId: v.id("nexi"),
  },
  handler: async (ctx, args) => {
    // First, get all notebooks in this nexus
    const notebooks = await ctx.db
      .query("notebooks")
      .withIndex("by_nexus", (q) => q.eq("nexusId", args.nexusId))
      .collect();

    // Delete all related data
    for (const notebook of notebooks) {
      // Delete chunks in this notebook
      const chunks = await ctx.db
        .query("chunks")
        .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
        .collect();
      
      for (const chunk of chunks) {
        // Delete chunk tags
        await ctx.db
          .query("chunkTags")
          .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
          .collect()
          .then(tags => tags.forEach(tag => ctx.db.delete(tag._id)));
        
        // Delete conduits
        await ctx.db
          .query("conduits")
          .withIndex("by_source", (q) => q.eq("sourceChunkId", chunk._id))
          .collect()
          .then(conduits => conduits.forEach(conduit => ctx.db.delete(conduit._id)));
        
        await ctx.db
          .query("conduits")
          .withIndex("by_target", (q) => q.eq("targetChunkId", chunk._id))
          .collect()
          .then(conduits => conduits.forEach(conduit => ctx.db.delete(conduit._id)));
        
        // Delete jems
        await ctx.db
          .query("jems")
          .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
          .collect()
          .then(jems => jems.forEach(jem => ctx.db.delete(jem._id)));
        
        // Delete the chunk
        await ctx.db.delete(chunk._id);
      }

      // Delete tags in this notebook
      const tags = await ctx.db
        .query("tags")
        .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
        .collect();
      
      for (const tag of tags) {
        await ctx.db.delete(tag._id);
      }

      // Delete conversations in this notebook
      await ctx.db
        .query("conversations")
        .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
        .collect()
        .then(conversations => conversations.forEach(conv => ctx.db.delete(conv._id)));

      // Delete the notebook
      await ctx.db.delete(notebook._id);
    }

    // Finally, delete the nexus
    await ctx.db.delete(args.nexusId);
  },
});

// Update a notebook
export const updateNotebook = mutation({
  args: {
    notebookId: v.id("notebooks"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    metaQuestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { notebookId, ...updates } = args;
    await ctx.db.patch(notebookId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a notebook (and all its related data)
export const deleteNotebook = mutation({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    // Delete chunks in this notebook
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
      .collect();
    
    for (const chunk of chunks) {
      // Delete chunk tags
      await ctx.db
        .query("chunkTags")
        .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
        .collect()
        .then(tags => tags.forEach(tag => ctx.db.delete(tag._id)));
      
      // Delete conduits
      await ctx.db
        .query("conduits")
        .withIndex("by_source", (q) => q.eq("sourceChunkId", chunk._id))
        .collect()
        .then(conduits => conduits.forEach(conduit => ctx.db.delete(conduit._id)));
      
      await ctx.db
        .query("conduits")
        .withIndex("by_target", (q) => q.eq("targetChunkId", chunk._id))
        .collect()
        .then(conduits => conduits.forEach(conduit => ctx.db.delete(conduit._id)));
      
      // Delete jems
      await ctx.db
        .query("jems")
        .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
        .collect()
        .then(jems => jems.forEach(jem => ctx.db.delete(jem._id)));
      
      // Delete the chunk
      await ctx.db.delete(chunk._id);
    }

    // Delete tags in this notebook
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
      .collect();
    
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    // Delete conversations in this notebook
    await ctx.db
      .query("conversations")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
      .collect()
      .then(conversations => conversations.forEach(conv => ctx.db.delete(conv._id)));

    // Finally, delete the notebook
    await ctx.db.delete(args.notebookId);
  },
});

// Create a new conversation session
export const createConversation = mutation({
  args: {
    notebookId: v.optional(v.id("notebooks")),
    title: v.optional(v.string()),
    modelUsed: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const conversationId = await ctx.db.insert("conversations", {
      notebookId: args.notebookId,
      title: args.title,
      modelUsed: args.modelUsed,
      createdAt: now,
      updatedAt: now,
      ownerId: identity?.subject,
    });
    return conversationId;
  },
});

// Add a Q&A pair to an existing conversation
export const addConversationMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    
    // Add the message
    const messageId = await ctx.db.insert("conversationMessages", {
      conversationId: args.conversationId,
      question: args.question,
      answer: args.answer,
      createdAt: now,
      ownerId: identity?.subject,
    });

    // Get the conversation to find its notebook (locus)
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation && conversation.notebookId) {
      // Add the conversation message to the locus content organization
      await appendContentItem(ctx, conversation.notebookId, "notebook", "conversationMessage", messageId, undefined);
    }

    // Update the conversation's updatedAt timestamp
    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
    });
  },
}); 

// Assign tags to a chunk
export const assignTagsToChunk = mutation({
  args: {
    chunkId: v.id("chunks"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    // First, remove all existing tag assignments for this chunk
    const existingTags = await ctx.db
      .query("chunkTags")
      .withIndex("by_chunk", (q) => q.eq("chunkId", args.chunkId))
      .collect();
    
    for (const tag of existingTags) {
      await ctx.db.delete(tag._id);
    }

    // Then, add the new tag assignments
    const now = Date.now();
    for (const tagId of args.tagIds) {
      await ctx.db.insert("chunkTags", {
        chunkId: args.chunkId,
        tagId: tagId,
        createdAt: now,
      });
    }
  },
});

// Create a new tag within a notebook
export const createTag = mutation({
  args: {
    notebookId: v.id("notebooks"),
    name: v.string(),
    description: v.optional(v.string()),
    parentTagId: v.optional(v.id("tags")),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the notebook to find its parent nexus
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new Error("Notebook not found");
    }

    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const tagId = await ctx.db.insert("tags", {
      notebookId: args.notebookId,
      name: args.name,
      description: args.description,
      parentTagId: args.parentTagId,
      color: args.color,
      originNotebookId: args.notebookId, // Set origin to current notebook
      originNexusId: notebook.nexusId, // Set origin nexus
      createdAt: now,
      updatedAt: now,
      ownerId: identity?.subject,
    });

    // Add the tag to the locus content organization
    // Use parentTagId to maintain hierarchy - if it has a parent, it's nested
    const parentIdForOrdering = args.parentTagId ? args.parentTagId.toString() : undefined;
    await appendContentItem(ctx, args.notebookId, "notebook", "tag", tagId, parentIdForOrdering);

    return tagId;
  },
});

// Update a tag
export const updateTag = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    parentTagId: v.optional(v.id("tags")),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: {
      updatedAt: number;
      name?: string;
      description?: string;
      parentTagId?: Id<"tags">;
      color?: string;
    } = {
      updatedAt: Date.now(),
    };
    
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.parentTagId !== undefined) updateData.parentTagId = args.parentTagId;
    if (args.color !== undefined) updateData.color = args.color;
    
    await ctx.db.patch(args.tagId, updateData);
  },
});

// Delete a tag and all its assignments
export const deleteTag = mutation({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    // First, delete all chunk tag assignments for this tag
    const chunkTags = await ctx.db
      .query("chunkTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();
    
    for (const chunkTag of chunkTags) {
      await ctx.db.delete(chunkTag._id);
    }
    
    // Then delete the tag itself
    await ctx.db.delete(args.tagId);
  },
});

// Reparent a tag (move it to a different parent)
export const reparentTag = mutation({
  args: {
    tagId: v.id("tags"),
    newParentTagId: v.optional(v.id("tags")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tagId, {
      parentTagId: args.newParentTagId,
      updatedAt: Date.now(),
    });
  },
});

// Create a new prompt template
export const createPromptTemplate = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    templateContent: v.string(),
    isSystemDefined: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    icon: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("tags"))),
    placeholders: v.optional(v.array(v.object({
      name: v.string(),
      label: v.string(),
      type: v.union(v.literal("text"), v.literal("number"), v.literal("textarea"), v.literal("dropdown")),
      defaultValue: v.optional(v.string()),
      options: v.optional(v.array(v.string())),
      optional: v.optional(v.boolean()),
      description: v.optional(v.string()),
    }))),
    llmConfig: v.optional(v.object({
      modelName: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      topP: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const templateId = await ctx.db.insert("promptTemplates", {
      name: args.name,
      description: args.description,
      templateContent: args.templateContent,
      isSystemDefined: args.isSystemDefined || false,
      isActive: args.isActive !== undefined ? args.isActive : true,
      icon: args.icon,
      tagIds: args.tagIds,
      placeholders: args.placeholders,
      llmConfig: args.llmConfig,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      ownerId: identity?.subject,
    });
    return templateId;
  },
});

// Update a prompt template
export const updatePromptTemplate = mutation({
  args: {
    templateId: v.id("promptTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    templateContent: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    icon: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("tags"))),
    placeholders: v.optional(v.array(v.object({
      name: v.string(),
      label: v.string(),
      type: v.union(v.literal("text"), v.literal("number"), v.literal("textarea"), v.literal("dropdown")),
      defaultValue: v.optional(v.string()),
      options: v.optional(v.array(v.string())),
      optional: v.optional(v.boolean()),
      description: v.optional(v.string()),
    }))),
    llmConfig: v.optional(v.object({
      modelName: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      topP: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const updateData: {
      updatedAt: number;
      name?: string;
      description?: string;
      templateContent?: string;
      isActive?: boolean;
      icon?: string;
      tagIds?: Id<"tags">[];
      placeholders?: Array<{
        name: string;
        label: string;
        type: "text" | "number" | "textarea" | "dropdown";
        defaultValue?: string;
        options?: string[];
        optional?: boolean;
        description?: string;
      }>;
      llmConfig?: {
        modelName?: string;
        temperature?: number;
        maxTokens?: number;
        topP?: number;
      };
    } = {
      updatedAt: Date.now(),
    };
    
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.templateContent !== undefined) updateData.templateContent = args.templateContent;
    if (args.isActive !== undefined) updateData.isActive = args.isActive;
    if (args.icon !== undefined) updateData.icon = args.icon;
    if (args.tagIds !== undefined) updateData.tagIds = args.tagIds;
    if (args.placeholders !== undefined) updateData.placeholders = args.placeholders;
    if (args.llmConfig !== undefined) updateData.llmConfig = args.llmConfig;
    
    await ctx.db.patch(args.templateId, updateData);
  },
});

// Delete a prompt template
export const deletePromptTemplate = mutation({
  args: {
    templateId: v.id("promptTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
  },
});

// Increment usage count for a prompt template
export const incrementPromptTemplateUsage = mutation({
  args: {
    templateId: v.id("promptTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Prompt template not found");
    }
    
    const currentUsageCount = template.usageCount || 0;
    
    await ctx.db.patch(args.templateId, {
      usageCount: currentUsageCount + 1,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Create a chunk connection (shadow in another notebook)
export const createChunkConnection = mutation({
  args: {
    sourceChunkId: v.id("chunks"),
    targetNotebookId: v.id("notebooks"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    
    // Get the source chunk
    const sourceChunk = await ctx.db.get(args.sourceChunkId);
    if (!sourceChunk) {
      throw new Error("Source chunk not found");
    }
    
    // Get the target notebook
    const targetNotebook = await ctx.db.get(args.targetNotebookId);
    if (!targetNotebook) {
      throw new Error("Target notebook not found");
    }
    
    // Check if connection already exists
    const existingConnection = await ctx.db
      .query("chunkConnections")
      .withIndex("by_source", (q) => q.eq("sourceChunkId", args.sourceChunkId))
      .filter((q) => q.eq(q.field("targetNotebookId"), args.targetNotebookId))
      .first();
    
    if (existingConnection) {
      throw new Error("Connection already exists between this chunk and notebook");
    }
    
    // Create a shadow chunk in the target notebook
    const shadowChunkId = await ctx.db.insert("chunks", {
      notebookId: args.targetNotebookId,
      originalText: sourceChunk.originalText,
      userEditedText: sourceChunk.userEditedText,
      source: `Connection from ${sourceChunk.source || "Unknown"}`,
      chunkType: sourceChunk.chunkType,
      metaTagId: sourceChunk.metaTagId,
      createdAt: now,
      updatedAt: now,
      ownerId: identity?.subject,
    });
    
    // Add the shadow chunk to the target notebook's content items
    await appendContentItem(
      ctx,
      args.targetNotebookId,
      "notebook",
      "chunk",
      shadowChunkId,
      undefined
    );
    
    // Create the connection record
    const connectionId = await ctx.db.insert("chunkConnections", {
      sourceChunkId: args.sourceChunkId,
      targetNotebookId: args.targetNotebookId,
      shadowChunkId: shadowChunkId,
      description: args.description,
      createdAt: now,
      ownerId: identity?.subject,
    });
    
    return { connectionId, shadowChunkId };
  },
});

// Delete a chunk connection
export const deleteChunkConnection = mutation({
  args: {
    connectionId: v.id("chunkConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }
    
    // Delete the shadow chunk
    await ctx.db.delete(connection.shadowChunkId);
    
    // Remove the shadow chunk from the target notebook's content items
    const contentItem = await ctx.db
      .query("locusContentItems")
      .withIndex("by_content", (q) => 
        q.eq("contentType", "chunk").eq("contentId", connection.shadowChunkId)
      )
      .filter((q) => q.eq(q.field("locusType"), "notebook"))
      .first();
    
    if (contentItem) {
      await ctx.db.delete(contentItem._id);
    }
    
    // Delete the connection record
    await ctx.db.delete(args.connectionId);
  },
});

// Update conversation titles that use the old "Conversation about..." format
export const updateConversationTitles = mutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    
    let updatedCount = 0;
    
    for (const conversation of conversations) {
      // Check if the title uses the old format
      if (conversation.title && conversation.title.startsWith('Conversation about ')) {
        // Get the first message from this conversation to generate a better title
        const firstMessage = await ctx.db
          .query("conversationMessages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .order("asc")
          .first();
        
        if (firstMessage) {
          // Generate a better title from the first message
          const betterTitle = generateFallbackTitle(firstMessage.question);
          
          await ctx.db.patch(conversation._id, {
            title: betterTitle,
            updatedAt: Date.now(),
          });
          
          updatedCount++;
          console.log(`Updated conversation title from "${conversation.title}" to "${betterTitle}"`);
        }
      }
    }
    
    return { 
      updatedCount, 
      totalConversations: conversations.length 
    };
  },
});

// Helper function to generate a fallback title (same logic as in titleGeneration.ts)
function generateFallbackTitle(message: string): string {
  // Remove common prefixes and clean up the message
  let cleanedMessage = message.trim();
  
  // Remove common prefixes
  const prefixesToRemove = [
    'explain', 'what is', 'how does', 'tell me about', 'describe', 
    'analyze', 'discuss', 'compare', 'contrast', 'summarize'
  ];
  
  for (const prefix of prefixesToRemove) {
    if (cleanedMessage.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleanedMessage = cleanedMessage.substring(prefix.length).trim();
      break;
    }
  }
  
  // Remove punctuation at the beginning
  cleanedMessage = cleanedMessage.replace(/^[.,!?;:]+/, '').trim();
  
  // If the cleaned message is still too long, truncate it
  if (cleanedMessage.length > 60) {
    // Try to find a good breaking point (end of a word)
    const truncated = cleanedMessage.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 40) {
      cleanedMessage = truncated.substring(0, lastSpace) + '...';
    } else {
      cleanedMessage = truncated + '...';
    }
  }
  
  // If we have a meaningful title, use it
  if (cleanedMessage.length > 10) {
    return cleanedMessage;
  }
  
  // Final fallback
  return `Research: ${message.substring(0, 40)}...`;
}

 