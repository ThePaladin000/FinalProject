import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";

// Return the shared USER MANUAL nexus (ownerId undefined), if present
export const getSharedManualNexus = query({
  args: {},
  handler: async (ctx) => {
    const manuals = await ctx.db
      .query("nexi")
      .filter((q) => q.eq(q.field("name"), "USER MANUAL"))
      .collect();
    const sharedManual = manuals.find((n) => n.ownerId === undefined) || null;
    return sharedManual;
  },
});

// Get guest nexi (those without ownerId but not the shared USER MANUAL)
export const getGuestNexi = query({
  args: { guestSessionId: v.string() },
  handler: async (ctx, args) => {
    const guestNexi = await ctx.db
      .query("nexi")
      .withIndex("by_guest_session", q => q.eq("guestSessionId", args.guestSessionId))
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .filter((q) => q.neq(q.field("name"), "USER MANUAL"))
      .order("asc")
      .collect();
    return guestNexi;
  },
});

// Get the currently authenticated user's record
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject as string | undefined;
    if (!subject) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();
    return user;
  },
});

// Get shard balance and recent transactions
export const getMyShardSummary = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject as string | undefined;
    if (!subject) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();
    if (!user) return null;
    const take = Math.max(1, Math.min(100, args.limit ?? 25));
    const tx = await ctx.db
      .query("shardTransactions")
      .withIndex("by_user_and_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const recent = tx
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, take);
    return {
      shardBalance: user.shardBalance ?? 0,
      monthlyShardAllowance: user.monthlyShardAllowance ?? 0,
      lastAllowanceResetDate: user.lastAllowanceResetDate ?? 0,
      purchasedShards: user.purchasedShards ?? 0,
      recentTransactions: recent,
    };
  },
});

// Get model pricing by modelId
export const getModelPricing = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("llmModels")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .first();
    return row ?? null;
  },
});

// Get all meta tags
export const getMetaTags = query({
  args: { ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("metaTags").order("asc").collect();
    if (!args.ownerId) return all;
    return all.filter(mt => (mt.ownerId === args.ownerId) || (mt.ownerId === undefined && mt.isSystem === true));
  },
});

// Get system meta tags only
export const getSystemMetaTags = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("metaTags")
      .withIndex("by_owner", (q) => q.eq("ownerId", undefined))
      .filter((q) => q.eq(q.field("isSystem"), true))
      .order("asc")
      .collect();
  },
});

// Get all nexi
export const getNexi = query({
  args: { ownerId: v.optional(v.string()), guestSessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userNexi: Doc<"nexi">[] = [];

    if (args.ownerId) {
      // For authenticated users, get their owned nexi
      userNexi = await ctx.db
        .query("nexi")
        .withIndex("by_owner", q => q.eq("ownerId", args.ownerId))
        .collect();
    } else if (args.guestSessionId) {
      // For guests, get only their session-specific nexi
      userNexi = await ctx.db
        .query("nexi")
        .withIndex("by_guest_session", q => q.eq("guestSessionId", args.guestSessionId))
        .filter((q) => q.eq(q.field("ownerId"), undefined))
        .filter((q) => q.neq(q.field("name"), "USER MANUAL"))
        .collect();
    } else {
      // No ownerId or guestSessionId provided, return empty array
      userNexi = [];
    }

    // Include a single shared USER MANUAL nexus (ownerId undefined) for all users
    let sharedManual: typeof userNexi[number] | null = null;
    try {
      const manuals = await ctx.db
        .query("nexi")
        .filter((q) => q.eq(q.field("name"), "USER MANUAL"))
        .collect();
      sharedManual = manuals.find((n) => n.ownerId === undefined) || null;
    } catch {
      sharedManual = null;
    }

    const combined = sharedManual
      ? [sharedManual, ...userNexi.filter((n) => n._id !== sharedManual!._id)]
      : userNexi;
    // Sort by explicit order if present; fallback to updatedAt desc
    return combined.sort((a, b) => {
      const ao = a.order;
      const bo = b.order;
      if (typeof ao === "number" && typeof bo === "number") return ao - bo;
      if (typeof ao === "number") return -1; // ordered nexi first
      if (typeof bo === "number") return 1;
      return b.updatedAt - a.updatedAt;
    });
  },
});

// Get notebooks for a specific nexus (legacy - will be replaced by locus content items version)
// This is temporarily kept for backward compatibility

// Get a single notebook by ID
export const getNotebookById = query({
  args: { notebookId: v.id("notebooks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) return null;
    if (args.ownerId && notebook.ownerId !== args.ownerId) return null;
    return notebook;
  },
});

// Get multiple notebooks by IDs
export const getNotebooksByIds = query({
  args: { notebookIds: v.array(v.id("notebooks")) },
  handler: async (ctx, args) => {
    const notebooks = await Promise.all(
      args.notebookIds.map(id => ctx.db.get(id))
    );
    return notebooks.filter(notebook => notebook !== null);
  },
});

// Get tags for a specific notebook
export const getTagsByNotebook = query({
  args: { notebookId: v.id("notebooks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If the parent nexus is shared (no owner), bypass owner scoping
    let isSharedNexus = false;
    try {
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook) {
        const nexus = await ctx.db.get(notebook.nexusId);
        isSharedNexus = !!nexus && nexus.ownerId === undefined;
      }
    } catch {
      isSharedNexus = false;
    }
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
      .order("asc")
      .collect();
    if (isSharedNexus) return tags;
    return args.ownerId ? tags.filter(t => t.ownerId === args.ownerId || t.ownerId === undefined) : tags;
  },
});

// Get chunks for a specific notebook with meta tag information, ordered by locus content items
export const getChunksByNotebook = query({
  args: { notebookId: v.id("notebooks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If the parent nexus is shared (no owner), bypass owner scoping
    let isSharedNexus = false;
    try {
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook) {
        const nexus = await ctx.db.get(notebook.nexusId);
        isSharedNexus = !!nexus && nexus.ownerId === undefined;
      }
    } catch {
      isSharedNexus = false;
    }
    // Get the content items for chunks in this locus, ordered by position
    const contentItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_locus_and_type", (q) =>
        q.eq("locusId", args.notebookId).eq("contentType", "chunk")
      )
      .filter((q) => q.eq(q.field("locusType"), "notebook"))
      .collect();

    // Sort by position since the index doesn't include position ordering
    contentItems.sort((a, b) => a.position - b.position);

    // Get the actual chunks with their meta tag information and tags
    const chunksWithMetaTags = await Promise.all(
      contentItems.map(async (item) => {
        const chunk = await ctx.db.get(item.contentId as Id<"chunks">);
        if (!chunk) return null;
        if (!isSharedNexus && args.ownerId && !(chunk.ownerId === args.ownerId || chunk.ownerId === undefined)) return null;

        const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;

        // Get tags for this chunk
        const chunkTags = await ctx.db
          .query("chunkTags")
          .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
          .collect();

        const tags = await Promise.all(
          chunkTags.map(async (chunkTag) => {
            const tag = await ctx.db.get(chunkTag.tagId);
            return tag;
          })
        );

        const validTags = tags.filter(tag => tag !== null);

        return {
          ...chunk,
          metaTag,
          tags: validTags,
          _locusPosition: item.position, // Include position for debugging/reference
        };
      })
    );

    // Filter out any null chunks and return
    return chunksWithMetaTags.filter(chunk => chunk !== null);
  },
});

// Composite notebook view for faster first paint: chunks + attachments + connection counts + metaTags
export const getNotebookView = query({
  args: { notebookId: v.id("notebooks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Determine sharing to scope owner filters
    let isSharedNexus = false;
    try {
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook) {
        const nexus = await ctx.db.get(notebook.nexusId);
        isSharedNexus = !!nexus && nexus.ownerId === undefined;
      }
    } catch {
      isSharedNexus = false;
    }

    // Ordered content items for this notebook
    const contentItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_locus_and_type", (q) =>
        q.eq("locusId", args.notebookId).eq("contentType", "chunk")
      )
      .filter((q) => q.eq(q.field("locusType"), "notebook"))
      .collect();
    contentItems.sort((a, b) => a.position - b.position);

    // Load chunks with meta tag and tags
    const chunks = (
      await Promise.all(
        contentItems.map(async (item) => {
          const chunk = await ctx.db.get(item.contentId as Id<"chunks">);
          if (!chunk) return null;
          if (!isSharedNexus && args.ownerId && !(chunk.ownerId === args.ownerId || chunk.ownerId === undefined)) return null;

          const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;

          const chunkTags = await ctx.db
            .query("chunkTags")
            .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
            .collect();

          const tags = await Promise.all(
            chunkTags.map(async (chunkTag) => ctx.db.get(chunkTag.tagId))
          );

          const validTags = tags.filter((t) => t !== null);

        return {
          ...chunk,
          metaTag,
          tags: validTags,
          _locusPosition: item.position,
        };
        })
      )
    ).filter((c) => c !== null) as Doc<"chunks">[];

    const chunkIds: Id<"chunks">[] = chunks.map((c) => c._id);

    // Attachments map per chunk (scoped by owner if applicable)
    const attachments: Record<string, Array<{ _id: Id<"attachments">; name: string; url: string; createdAt: number }>> = {};
    for (const chunkId of chunkIds) {
      const rows = await ctx.db
        .query("attachments")
        .withIndex("by_chunk", (q) => q.eq("chunkId", chunkId))
        .order("asc")
        .collect();
      const scoped = args.ownerId
        ? rows.filter((a) => a.ownerId === args.ownerId || a.ownerId === undefined)
        : rows;
      attachments[chunkId] = scoped.map((a) => ({ _id: a._id, name: a.name, url: a.url, createdAt: a.createdAt }));
    }

    // Connection counts per chunk
    const allConnections = await ctx.db
      .query("chunkConnections")
      .withIndex("by_source", (q) => q)
      .collect();
    const filteredConnections = allConnections.filter((c) => chunkIds.includes(c.sourceChunkId));
    const counts: Record<string, number> = {};
    for (const c of filteredConnections) {
      const id = c.sourceChunkId as unknown as string;
      counts[id] = (counts[id] || 0) + 1;
    }

    // Meta tags for selector
    const allMeta = await ctx.db.query("metaTags").order("asc").collect();
    const metaTags = args.ownerId
      ? allMeta.filter((mt) => mt.ownerId === args.ownerId || mt.ownerId === undefined)
      : allMeta;

    return { chunks, attachments, counts, metaTags };
  },
});

// Paginated composite notebook view: chunks + attachments + connection counts + metaTags
export const getNotebookViewPage = query({
  args: { notebookId: v.id("notebooks"), ownerId: v.optional(v.string()), page: v.number(), pageSize: v.number() },
  handler: async (ctx, args) => {
    let isSharedNexus = false;
    try {
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook) {
        const nexus = await ctx.db.get(notebook.nexusId);
        isSharedNexus = !!nexus && nexus.ownerId === undefined;
      }
    } catch {
      isSharedNexus = false;
    }

    const contentItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_locus_and_type", (q) =>
        q.eq("locusId", args.notebookId).eq("contentType", "chunk")
      )
      .filter((q) => q.eq(q.field("locusType"), "notebook"))
      .collect();
    contentItems.sort((a, b) => a.position - b.position);

    // IMPORTANT: Apply owner scoping BEFORE pagination so each page is filled
    // with visible chunks only. Otherwise, filtering after slicing can yield
    // short or empty pages and an incorrect total count.
    const visibleItems: typeof contentItems = [];
    for (const item of contentItems) {
      const chunk = await ctx.db.get(item.contentId as Id<"chunks">);
      if (!chunk) continue;
      if (!isSharedNexus && args.ownerId && !(chunk.ownerId === args.ownerId || chunk.ownerId === undefined)) {
        continue;
      }
      visibleItems.push(item);
    }

    const totalChunks = visibleItems.length;
    const pageSize = Math.max(1, args.pageSize);
    const page = Math.max(1, args.page);
    const offset = (page - 1) * pageSize;
    const slice = visibleItems.slice(offset, offset + pageSize);

    const chunks = (
      await Promise.all(
        slice.map(async (item) => {
          const chunk = await ctx.db.get(item.contentId as Id<"chunks">);
          if (!chunk) return null;

          const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;

          const chunkTags = await ctx.db
            .query("chunkTags")
            .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
            .collect();

          const tags = await Promise.all(
            chunkTags.map(async (chunkTag) => ctx.db.get(chunkTag.tagId))
          );

          const validTags = tags.filter((t) => t !== null);

        return {
          ...chunk,
          metaTag,
          tags: validTags,
          _locusPosition: item.position,
        };
        })
      )
    ).filter((c) => c !== null) as Doc<"chunks">[];

    const chunkIds: Id<"chunks">[] = chunks.map((c) => c._id);

    // Attachments map per chunk (scoped by owner if applicable)
    const attachments: Record<string, Array<{ _id: Id<"attachments">; name: string; url: string; createdAt: number }>> = {};
    for (const chunkId of chunkIds) {
      const rows = await ctx.db
        .query("attachments")
        .withIndex("by_chunk", (q) => q.eq("chunkId", chunkId))
        .order("asc")
        .collect();
      const scoped = args.ownerId
        ? rows.filter((a) => a.ownerId === args.ownerId || a.ownerId === undefined)
        : rows;
      attachments[chunkId] = scoped.map((a) => ({ _id: a._id, name: a.name, url: a.url, createdAt: a.createdAt }));
    }

    // Connection counts per chunk (only for page)
    const allConnections = await ctx.db
      .query("chunkConnections")
      .withIndex("by_source", (q) => q)
      .collect();
    const filteredConnections = allConnections.filter((c) => chunkIds.includes(c.sourceChunkId));
    const counts: Record<string, number> = {};
    for (const c of filteredConnections) {
      const id = c.sourceChunkId as unknown as string;
      counts[id] = (counts[id] || 0) + 1;
    }

    // Meta tags for selector
    const allMeta = await ctx.db.query("metaTags").order("asc").collect();
    const metaTags = args.ownerId
      ? allMeta.filter((mt) => mt.ownerId === args.ownerId || mt.ownerId === undefined)
      : allMeta;

    return { chunks, attachments, counts, metaTags, totalChunks };
  },
});

// Get chunks for a specific tag with meta tag information
export const getChunksByTag = query({
  args: { tagId: v.id("tags"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If the parent nexus (via tag->notebook->nexus) is shared, bypass owner scoping
    let isSharedNexus = false;
    try {
      const tag = await ctx.db.get(args.tagId);
      if (tag) {
        const notebook = await ctx.db.get(tag.notebookId);
        if (notebook) {
          const nexus = await ctx.db.get(notebook.nexusId);
          isSharedNexus = !!nexus && nexus.ownerId === undefined;
        }
      }
    } catch {
      isSharedNexus = false;
    }
    // Get all chunk tags for this tag
    const chunkTags = await ctx.db
      .query("chunkTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    // Get the actual chunks
    const chunks = await Promise.all(
      chunkTags.map(async (chunkTag) => {
        const chunk = await ctx.db.get(chunkTag.chunkId);
        return chunk;
      })
    );

    // Filter out null chunks and fetch meta tag information and tags
    const validChunks = chunks.filter(chunk => chunk !== null);
    const chunksWithMetaTags = await Promise.all(
      validChunks.map(async (chunk) => {
        const metaTag = chunk!.metaTagId ? await ctx.db.get(chunk!.metaTagId) : null;
        if (!isSharedNexus && args.ownerId && !(chunk!.ownerId === args.ownerId || chunk!.ownerId === undefined)) return null;

        // Get all tags for this chunk
        const chunkTagsForChunk = await ctx.db
          .query("chunkTags")
          .withIndex("by_chunk", (q) => q.eq("chunkId", chunk!._id))
          .collect();

        const tags = await Promise.all(
          chunkTagsForChunk.map(async (chunkTag) => {
            const tag = await ctx.db.get(chunkTag.tagId);
            return tag;
          })
        );

        const validTags = tags.filter(tag => tag !== null);

        return {
          ...chunk!,
          metaTag,
          tags: validTags,
        };
      })
    );

    return chunksWithMetaTags.filter(c => c !== null);
  },
});

// Paginated chunks by tag with meta + attachments + counts
export const getChunksByTagPage = query({
  args: { tagId: v.id("tags"), ownerId: v.optional(v.string()), page: v.number(), pageSize: v.number() },
  handler: async (ctx, args) => {
    let isSharedNexus = false;
    try {
      const tag = await ctx.db.get(args.tagId);
      if (tag) {
        const notebook = await ctx.db.get(tag.notebookId);
        if (notebook) {
          const nexus = await ctx.db.get(notebook.nexusId);
          isSharedNexus = !!nexus && nexus.ownerId === undefined;
        }
      }
    } catch {
      isSharedNexus = false;
    }

    const chunkTags = await ctx.db
      .query("chunkTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    // Fetch chunks and filter by owner if needed
    const chunksRaw = await Promise.all(
      chunkTags.map(async (ct) => ctx.db.get(ct.chunkId))
    );
    let valid = chunksRaw.filter((c): c is NonNullable<typeof c> => c !== null);
    if (!isSharedNexus && args.ownerId) {
      valid = valid.filter((c) => c.ownerId === args.ownerId || c.ownerId === undefined);
    }

    // Order by createdAt asc for deterministic paging
    valid.sort((a, b) => a.createdAt - b.createdAt);

    const totalChunks = valid.length;
    const pageSize = Math.max(1, args.pageSize);
    const page = Math.max(1, args.page);
    const offset = (page - 1) * pageSize;
    const pageSlice = valid.slice(offset, offset + pageSize);

    const chunks = await Promise.all(
      pageSlice.map(async (chunk) => {
        const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;
        const ctForChunk = await ctx.db
          .query("chunkTags")
          .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
          .collect();
        const tags = await Promise.all(ctForChunk.map(async (ct) => ctx.db.get(ct.tagId)));
        const validTags = tags.filter((t) => t !== null);
        return { ...chunk, metaTag, tags: validTags };
      })
    );

    const chunkIds: Id<"chunks">[] = pageSlice.map((c) => c._id);

    const attachments: Record<string, Array<{ _id: Id<"attachments">; name: string; url: string; createdAt: number }>> = {};
    for (const chunkId of chunkIds) {
      const rows = await ctx.db
        .query("attachments")
        .withIndex("by_chunk", (q) => q.eq("chunkId", chunkId))
        .order("asc")
        .collect();
      const scoped = args.ownerId
        ? rows.filter((a) => a.ownerId === args.ownerId || a.ownerId === undefined)
        : rows;
      attachments[chunkId] = scoped.map((a) => ({ _id: a._id, name: a.name, url: a.url, createdAt: a.createdAt }));
    }

    const allConnections = await ctx.db
      .query("chunkConnections")
      .withIndex("by_source", (q) => q)
      .collect();
    const filteredConnections = allConnections.filter((c) => chunkIds.includes(c.sourceChunkId));
    const counts: Record<string, number> = {};
    for (const c of filteredConnections) {
      const id = c.sourceChunkId as unknown as string;
      counts[id] = (counts[id] || 0) + 1;
    }

    return { chunks, attachments, counts, totalChunks };
  },
});

// Helper: find chunk's index in notebook order (after owner scoping)
export const getChunkIndexInNotebook = query({
  args: { notebookId: v.id("notebooks"), chunkId: v.id("chunks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let isSharedNexus = false;
    try {
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook) {
        const nexus = await ctx.db.get(notebook.nexusId);
        isSharedNexus = !!nexus && nexus.ownerId === undefined;
      }
    } catch {
      isSharedNexus = false;
    }

    const items = await ctx.db
      .query("locusContentItems")
      .withIndex("by_locus_and_type", (q) =>
        q.eq("locusId", args.notebookId).eq("contentType", "chunk")
      )
      .filter((q) => q.eq(q.field("locusType"), "notebook"))
      .collect();
    items.sort((a, b) => a.position - b.position);

    // Apply owner scoping by filtering out chunks not visible
    const filtered: string[] = [];
    for (const item of items) {
      const chunk = await ctx.db.get(item.contentId as Id<"chunks">);
      if (!chunk) continue;
      if (!isSharedNexus && args.ownerId && !(chunk.ownerId === args.ownerId || chunk.ownerId === undefined)) continue;
      filtered.push(item.contentId);
    }

    return filtered.findIndex((id) => id === (args.chunkId as unknown as string));
  },
});

// Helper: find chunk's index within a tag listing (ordered by createdAt asc, after owner scoping)
export const getChunkIndexInTag = query({
  args: { tagId: v.id("tags"), chunkId: v.id("chunks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let isSharedNexus = false;
    try {
      const tag = await ctx.db.get(args.tagId);
      if (tag) {
        const notebook = await ctx.db.get(tag.notebookId);
        if (notebook) {
          const nexus = await ctx.db.get(notebook.nexusId);
          isSharedNexus = !!nexus && nexus.ownerId === undefined;
        }
      }
    } catch {
      isSharedNexus = false;
    }

    const chunkTags = await ctx.db
      .query("chunkTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();
    const chunks = await Promise.all(chunkTags.map(async (ct) => ctx.db.get(ct.chunkId)));
    let valid = chunks.filter((c): c is NonNullable<typeof c> => c !== null);
    if (!isSharedNexus && args.ownerId) {
      valid = valid.filter((c) => c.ownerId === args.ownerId || c.ownerId === undefined);
    }
    valid.sort((a, b) => a.createdAt - b.createdAt);
    return valid.findIndex((c) => (c._id as unknown as string) === (args.chunkId as unknown as string));
  },
});

// Get complete tree structure (nexus -> notebooks -> tags -> child tags)
export const getCompleteTree = query({
  args: { ownerId: v.optional(v.string()), guestSessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let nexi: Doc<"nexi">[] = [];
    if (args.ownerId) {
      const userNexi = await ctx.db
        .query("nexi")
        .withIndex("by_owner", q => q.eq("ownerId", args.ownerId))
        .order("desc")
        .collect();
      nexi = userNexi;
    } else if (args.guestSessionId) {
      // For guests, get shared manual and any guest-created nexi for this session
      const sharedManual = await ctx.db
        .query("nexi")
        .filter((q) => q.eq(q.field("name"), "USER MANUAL"))
        .filter((q) => q.eq(q.field("ownerId"), undefined))
        .first();

      const guestNexi = await ctx.db
        .query("nexi")
        .withIndex("by_guest_session", q => q.eq("guestSessionId", args.guestSessionId))
        .filter((q) => q.eq(q.field("ownerId"), undefined))
        .filter((q) => q.neq(q.field("name"), "USER MANUAL"))
        .order("desc")
        .collect();

      nexi = sharedManual ? [sharedManual, ...guestNexi] : guestNexi;
    } else {
      // No ownerId or guestSessionId provided, return empty array
      nexi = [];
    }

    const result = await Promise.all(
      nexi.map(async (nexus) => {
        const notebooks = await ctx.db
          .query("notebooks")
          .withIndex("by_nexus", q => q.eq("nexusId", nexus._id))
          .order("asc")
          .collect();

        const notebookData = await Promise.all(
          notebooks.map(async (notebook) => {
            const chunks = await ctx.db
              .query("chunks")
              .withIndex("by_notebook", q => q.eq("notebookId", notebook._id))
              .order("asc")
              .collect();

            const chunkData = await Promise.all(
              chunks.map(async (chunk) => {
                const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;
                return {
                  ...chunk,
                  metaTag,
                };
              })
            );

            // Get all tags for this notebook
            const allTags = await ctx.db
              .query("tags")
              .withIndex("by_notebook", q => q.eq("notebookId", notebook._id))
              .order("asc")
              .collect();

            // Separate top-level tags (no parent) from child tags
            const topLevelTags = allTags.filter(tag => !tag.parentTagId);

            // Build tag structure with child tags
            const tagsWithChildren = await Promise.all(
              topLevelTags.map(async (tag) => {
                const childTags = allTags.filter(t => t.parentTagId === tag._id);
                return {
                  ...tag,
                  childTags,
                };
              })
            );

            return {
              ...notebook,
              chunks: chunkData,
              tags: tagsWithChildren,
            };
          })
        );

        return {
          ...nexus,
          notebooks: notebookData,
        };
      })
    );

    return result;
  },
});

// Get a specific nexus with all its data including meta tags
export const getNexusWithData = query({
  args: { nexusId: v.id("nexi"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const nexus = await ctx.db.get(args.nexusId);
    if (!nexus) return null;

    const isShared = nexus.ownerId === undefined; // shared/public

    if (args.ownerId) {
      const isOwner = nexus.ownerId === args.ownerId;
      if (!isOwner && !isShared) {
        return null;
      }
    } else {
      // Guests may only access shared/public nexi
      if (!isShared) {
        return null;
      }
    }
    const isSharedNexus = isShared;

    let notebooks = await ctx.db
      .query("notebooks")
      .withIndex("by_nexus", (q) => q.eq("nexusId", args.nexusId))
      .order("asc")
      .collect();

    // Scope notebooks by owner unless the nexus is shared
    if (!isSharedNexus && args.ownerId) {
      notebooks = notebooks.filter(n => n.ownerId === args.ownerId || n.ownerId === undefined);
    }

    const notebooksWithData = await Promise.all(
      notebooks.map(async (notebook) => {
        const tags = await ctx.db
          .query("tags")
          .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
          .order("asc")
          .collect();
        const scopedTags = isSharedNexus
          ? tags
          : (args.ownerId ? tags.filter(t => t.ownerId === args.ownerId || t.ownerId === undefined) : tags);

        const chunks = await ctx.db
          .query("chunks")
          .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
          .order("asc")
          .collect();
        const scopedChunks = isSharedNexus
          ? chunks
          : (args.ownerId ? chunks.filter(c => c.ownerId === args.ownerId || c.ownerId === undefined) : chunks);

        // Fetch meta tag information for each chunk
        const chunksWithMetaTags = await Promise.all(
          scopedChunks.map(async (chunk) => {
            const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;
            return {
              ...chunk,
              metaTag,
            };
          })
        );

        return {
          ...notebook,
          tags: scopedTags,
          chunks: chunksWithMetaTags,
        };
      })
    );

    return {
      ...nexus,
      notebooks: notebooksWithData,
    };
  },
});

// Search chunks by text (simple regex search) with meta tag information
export const searchChunks = query({
  args: { searchTerm: v.string(), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const chunks = args.ownerId
      ? await ctx.db.query("chunks").withIndex("by_owner", q => q.eq("ownerId", args.ownerId)).collect()
      : await ctx.db.query("chunks").collect();

    // Simple case-insensitive search
    const searchLower = args.searchTerm.toLowerCase();
    const filteredChunks = chunks.filter(chunk =>
      chunk.originalText.toLowerCase().includes(searchLower) ||
      chunk.userEditedText?.toLowerCase().includes(searchLower) ||
      chunk.title?.toLowerCase().includes(searchLower)
    );

    // Fetch meta tag information for filtered chunks
    const chunksWithMetaTags = await Promise.all(
      filteredChunks.map(async (chunk) => {
        const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;
        return {
          ...chunk,
          metaTag,
        };
      })
    );

    return chunksWithMetaTags;
  },
});

// Get tags assigned to a specific chunk
export const getTagsByChunk = query({
  args: { chunkId: v.id("chunks") },
  handler: async (ctx, args) => {
    const chunkTags = await ctx.db
      .query("chunkTags")
      .withIndex("by_chunk", (q) => q.eq("chunkId", args.chunkId))
      .collect();

    // Fetch the actual tag data for each chunk tag
    const tags = await Promise.all(
      chunkTags.map(async (chunkTag) => {
        const tag = await ctx.db.get(chunkTag.tagId);
        return tag;
      })
    );

    return tags.filter(tag => tag !== null);
  },
});



// Search within a specific nexus (all notebooks and chunks)
export const searchNexus = query({
  args: {
    nexusId: v.id("nexi"),
    searchTerm: v.string(),
    ownerId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const nexus = await ctx.db.get(args.nexusId);
    if (!nexus) return null;
    if (args.ownerId && nexus.ownerId !== args.ownerId) return null;

    // Get all notebooks for this nexus
    const notebooks = await ctx.db
      .query("notebooks")
      .withIndex("by_nexus", (q) => q.eq("nexusId", args.nexusId))
      .order("asc")
      .collect();
    const scopedNotebooks = args.ownerId ? notebooks.filter(n => n.ownerId === args.ownerId) : notebooks;

    const searchLower = args.searchTerm.toLowerCase();
    const results: {
      type: 'nexus' | 'notebook' | 'chunk';
      id: string;
      name: string;
      content?: string;
      notebookName?: string;
      notebookId?: string;
      chunkType?: string;
      score: number;
    }[] = [];

    // Search nexus name and description
    if (nexus.name.toLowerCase().includes(searchLower)) {
      results.push({
        type: 'nexus',
        id: nexus._id,
        name: nexus.name,
        score: nexus.name.toLowerCase().indexOf(searchLower)
      });
    }
    if (nexus.description?.toLowerCase().includes(searchLower)) {
      results.push({
        type: 'nexus',
        id: nexus._id,
        name: nexus.name,
        content: nexus.description,
        score: nexus.description.toLowerCase().indexOf(searchLower)
      });
    }

    // Search notebooks
    for (const notebook of scopedNotebooks) {
      let notebookMatch: {
        type: 'notebook';
        id: string;
        name: string;
        content: string;
        score: number;
      } | null = null;
      let bestScore = Infinity;
      let bestContent = '';

      // Check name match
      if (notebook.name.toLowerCase().includes(searchLower)) {
        const score = notebook.name.toLowerCase().indexOf(searchLower);
        if (score < bestScore) {
          bestScore = score;
          bestContent = '';
          notebookMatch = {
            type: 'notebook',
            id: notebook._id,
            name: notebook.name,
            content: bestContent,
            score: bestScore
          };
        }
      }

      // Check description match
      if (notebook.description?.toLowerCase().includes(searchLower)) {
        const score = notebook.description.toLowerCase().indexOf(searchLower);
        if (score < bestScore) {
          bestScore = score;
          bestContent = notebook.description;
          notebookMatch = {
            type: 'notebook',
            id: notebook._id,
            name: notebook.name,
            content: bestContent,
            score: bestScore
          };
        }
      }

      // Check meta question match
      if (notebook.metaQuestion?.toLowerCase().includes(searchLower)) {
        const score = notebook.metaQuestion.toLowerCase().indexOf(searchLower);
        if (score < bestScore) {
          bestScore = score;
          bestContent = notebook.metaQuestion;
          notebookMatch = {
            type: 'notebook',
            id: notebook._id,
            name: notebook.name,
            content: bestContent,
            score: bestScore
          };
        }
      }

      // Add the best match for this notebook
      if (notebookMatch) {
        results.push(notebookMatch);
      }

      // Search chunks in this notebook
      const chunks = await ctx.db
        .query("chunks")
        .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
        .order("asc")
        .collect();
     const scopedChunks = args.ownerId
       ? chunks.filter(c => c.ownerId === args.ownerId || c.ownerId === undefined)
       : chunks;

      for (const chunk of scopedChunks) {
        const chunkText = chunk.userEditedText || chunk.originalText;
        const chunkTitle = chunk.title || '';

        let chunkMatch: {
          type: 'chunk';
          id: string;
          name: string;
          content: string;
          notebookName: string;
          notebookId: string;
          chunkType: string;
          score: number;
        } | null = null;
        let bestScore = Infinity;
        let bestContent = '';
        let bestName = '';

        // Check content match
        if (chunkText.toLowerCase().includes(searchLower)) {
          const score = chunkText.toLowerCase().indexOf(searchLower);
          if (score < bestScore) {
            bestScore = score;
            bestContent = chunkText;
            bestName = chunkTitle || 'Untitled Chunk';
            chunkMatch = {
              type: 'chunk',
              id: chunk._id,
              name: bestName,
              content: bestContent,
              notebookName: notebook.name,
              notebookId: notebook._id,
              chunkType: chunk.chunkType,
              score: bestScore
            };
          }
        }

        // Check title match
        if (chunkTitle.toLowerCase().includes(searchLower)) {
          const score = chunkTitle.toLowerCase().indexOf(searchLower);
          if (score < bestScore) {
            bestScore = score;
            bestContent = chunkText;
            bestName = chunkTitle;
            chunkMatch = {
              type: 'chunk',
              id: chunk._id,
              name: bestName,
              content: bestContent,
              notebookName: notebook.name,
              notebookId: notebook._id,
              chunkType: chunk.chunkType,
              score: bestScore
            };
          }
        }

        // Add the best match for this chunk
        if (chunkMatch) {
          results.push(chunkMatch);
        }
      }
    }

    // Sort by score (lower score = earlier match = higher relevance)
    results.sort((a, b) => a.score - b.score);

    return {
      nexus,
      results
    };
  },
});

// Get conversations for a specific notebook
export const getConversationsByNotebook = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
      .order("desc")
      .collect();
  },
});

// Get full conversation with all messages by conversation ID
export const getConversationById = query({
  args: { conversationId: v.id("conversations"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;
    if (args.ownerId && conversation.ownerId !== args.ownerId) return null;

    const messages = await ctx.db
      .query("conversationMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    return {
      conversation,
      messages,
    };
  },
});

// Get conversation messages by conversation ID
export const getConversationMessages = query({
  args: { conversationId: v.id("conversations"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("conversationMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();
    return args.ownerId ? messages.filter(m => m.ownerId === args.ownerId) : messages;
  },
});

// Get all tags with comprehensive information for Tag Manager
export const getAllTagsForManager = query({
  args: { ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const allTags = args.ownerId
      ? await ctx.db.query("tags").withIndex("by_owner", q => q.eq("ownerId", args.ownerId)).collect()
      : await ctx.db.query("tags").collect();

    // Fetch additional information for each tag
    const tagsWithInfo = await Promise.all(
      allTags.map(async (tag) => {
        // Get parent tag info
        const parentTag = tag.parentTagId ? await ctx.db.get(tag.parentTagId) : null;

        // Get origin notebook and nexus info
        const originNotebook = tag.originNotebookId ? await ctx.db.get(tag.originNotebookId) : null;
        const originNexus = tag.originNexusId ? await ctx.db.get(tag.originNexusId) : null;

        // Get current notebook and nexus info
        const currentNotebook = await ctx.db.get(tag.notebookId);
        const currentNexus = currentNotebook ? await ctx.db.get(currentNotebook.nexusId) : null;

        // Count usage across all chunks
        const chunkTags = await ctx.db
          .query("chunkTags")
          .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
          .collect();

        // Get detailed usage information
        const usageInfo = await Promise.all(
          chunkTags.map(async (chunkTag) => {
            const chunk = await ctx.db.get(chunkTag.chunkId);
            if (!chunk) return null;
            if (args.ownerId && chunk.ownerId !== args.ownerId) return null;

            const notebook = await ctx.db.get(chunk.notebookId);
            if (!notebook) return null;

            const nexus = await ctx.db.get(notebook.nexusId);
            if (!nexus) return null;

            return {
              chunkId: chunk._id,
              chunkTitle: chunk.title,
              chunkText: chunk.userEditedText || chunk.originalText,
              notebookId: notebook._id,
              notebookName: notebook.name,
              nexusId: nexus._id,
              nexusName: nexus.name,
            };
          })
        );

        // Group usage by nexus and notebook
        const usageByLocation = usageInfo
          .filter(info => info !== null)
          .reduce((acc, info) => {
            if (!info) return acc;

            const nexusKey = `${info.nexusId}-${info.nexusName}`;
            if (!acc[nexusKey]) {
              acc[nexusKey] = {
                nexusId: info.nexusId,
                nexusName: info.nexusName,
                notebooks: {} as Record<string, {
                  notebookId: string;
                  notebookName: string;
                  chunks: Array<{
                    chunkId: string;
                    chunkTitle?: string;
                    chunkText: string;
                  }>;
                }>
              };
            }

            const notebookKey = `${info.notebookId}-${info.notebookName}`;
            if (!acc[nexusKey].notebooks[notebookKey]) {
              acc[nexusKey].notebooks[notebookKey] = {
                notebookId: info.notebookId,
                notebookName: info.notebookName,
                chunks: []
              };
            }

            acc[nexusKey].notebooks[notebookKey].chunks.push({
              chunkId: info.chunkId,
              chunkTitle: info.chunkTitle,
              chunkText: info.chunkText,
            });

            return acc;
          }, {} as Record<string, {
            nexusId: string;
            nexusName: string;
            notebooks: Record<string, {
              notebookId: string;
              notebookName: string;
              chunks: Array<{
                chunkId: string;
                chunkTitle?: string;
                chunkText: string;
              }>;
            }>;
          }>);

        return {
          ...tag,
          parentTag,
          originNotebook,
          originNexus,
          currentNotebook,
          currentNexus,
          totalUsage: chunkTags.length,
          usageByLocation: Object.values(usageByLocation),
        };
      })
    );

    return tagsWithInfo;
  },
});

// Get tags filtered by origin nexus
export const getTagsByOriginNexus = query({
  args: { nexusId: v.id("nexi"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_origin_nexus", (q) => q.eq("originNexusId", args.nexusId))
      .collect();
    const scoped = args.ownerId ? tags.filter(t => t.ownerId === args.ownerId) : tags;

    // Fetch additional info similar to getAllTagsForManager but for filtered tags
    const tagsWithInfo = await Promise.all(
      scoped.map(async (tag) => {
        const parentTag = tag.parentTagId ? await ctx.db.get(tag.parentTagId) : null;
        const originNotebook = tag.originNotebookId ? await ctx.db.get(tag.originNotebookId) : null;
        const originNexus = tag.originNexusId ? await ctx.db.get(tag.originNexusId) : null;
        const currentNotebook = await ctx.db.get(tag.notebookId);
        const currentNexus = currentNotebook ? await ctx.db.get(currentNotebook.nexusId) : null;

        const chunkTags = await ctx.db
          .query("chunkTags")
          .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
          .collect();

        return {
          ...tag,
          parentTag,
          originNotebook,
          originNexus,
          currentNotebook,
          currentNexus,
          totalUsage: chunkTags.length,
        };
      })
    );

    return tagsWithInfo;
  },
});

// Get tags filtered by origin notebook
export const getTagsByOriginNotebook = query({
  args: { notebookId: v.id("notebooks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_origin_notebook", (q) => q.eq("originNotebookId", args.notebookId))
      .collect();
    const scoped = args.ownerId ? tags.filter(t => t.ownerId === args.ownerId) : tags;

    // Fetch additional info
    const tagsWithInfo = await Promise.all(
      scoped.map(async (tag) => {
        const parentTag = tag.parentTagId ? await ctx.db.get(tag.parentTagId) : null;
        const originNotebook = tag.originNotebookId ? await ctx.db.get(tag.originNotebookId) : null;
        const originNexus = tag.originNexusId ? await ctx.db.get(tag.originNexusId) : null;
        const currentNotebook = await ctx.db.get(tag.notebookId);
        const currentNexus = currentNotebook ? await ctx.db.get(currentNotebook.nexusId) : null;

        const chunkTags = await ctx.db
          .query("chunkTags")
          .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
          .collect();

        return {
          ...tag,
          parentTag,
          originNotebook,
          originNexus,
          currentNotebook,
          currentNexus,
          totalUsage: chunkTags.length,
        };
      })
    );

    return tagsWithInfo;
  },
});

// Get tags filtered by context for chunk tag selection
export const getTagsByContext = query({
  args: {
    currentNotebookId: v.id("notebooks"),
    currentNexusId: v.id("nexi"),
    ownerId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Get current notebook and nexus info
    const currentNotebook = await ctx.db.get(args.currentNotebookId);
    const currentNexus = await ctx.db.get(args.currentNexusId);

    if (!currentNotebook || !currentNexus) {
      return { locusTags: [], nexusTags: [], globalTags: [] };
    }

    // Get all tags
    const allTags = args.ownerId
      ? await ctx.db.query("tags").withIndex("by_owner", q => q.eq("ownerId", args.ownerId)).collect()
      : await ctx.db.query("tags").collect();

    // Categorize tags by context
    type EnrichedTag = Doc<"tags"> & {
      originNotebook: Doc<"notebooks"> | null;
      originNexus: Doc<"nexi"> | null;
      currentNotebook: Doc<"notebooks"> | null;
      currentNexus: Doc<"nexi"> | null;
      context: string;
    };
    const locusTags: EnrichedTag[] = [];
    const nexusTags: EnrichedTag[] = [];
    const globalTags: EnrichedTag[] = [];

    for (const tag of allTags) {
      // Get origin info for this tag
      const originNotebook = tag.originNotebookId ? await ctx.db.get(tag.originNotebookId) : null;
      const originNexus = tag.originNexusId ? await ctx.db.get(tag.originNexusId) : null;

      // Get current notebook and nexus for this tag
      const tagNotebook = await ctx.db.get(tag.notebookId);
      const tagNexus = tagNotebook ? await ctx.db.get(tagNotebook.nexusId) : null;

      // Categorize based on origin
      if (originNotebook?._id === args.currentNotebookId) {
        // Tags originating from current locus
        locusTags.push({
          ...tag,
          originNotebook,
          originNexus,
          currentNotebook: tagNotebook,
          currentNexus: tagNexus,
          context: 'locus'
        });
      } else if (originNexus?._id === args.currentNexusId) {
        // Tags originating from current nexus (but not current locus)
        nexusTags.push({
          ...tag,
          originNotebook,
          originNexus,
          currentNotebook: tagNotebook,
          currentNexus: tagNexus,
          context: 'nexus'
        });
      } else {
        // All other tags (global)
        globalTags.push({
          ...tag,
          originNotebook,
          originNexus,
          currentNotebook: tagNotebook,
          currentNexus: tagNexus,
          context: 'global'
        });
      }
    }

    return {
      locusTags: locusTags.sort((a, b) => a.name.localeCompare(b.name)),
      nexusTags: nexusTags.sort((a, b) => a.name.localeCompare(b.name)),
      globalTags: globalTags.sort((a, b) => a.name.localeCompare(b.name))
    };
  },
});

// Get all prompt templates
export const getPromptTemplates = query({
  args: { ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const templates = args.ownerId
      ? await ctx.db.query("promptTemplates").withIndex("by_owner", q => q.eq("ownerId", args.ownerId)).order("asc").collect()
      : await ctx.db.query("promptTemplates").order("asc").collect();
    return templates;
  },
});

// Get active prompt templates only
export const getActivePromptTemplates = query({
  args: { ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const base = ctx.db
      .query("promptTemplates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc");
    const templates = args.ownerId
      ? await base.filter(q => q.eq(q.field("ownerId"), args.ownerId)).collect()
      : await base.collect();
    return templates;
  },
});

// Get system-defined prompt templates
export const getSystemPromptTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("promptTemplates")
      .filter((q) => q.eq(q.field("isSystemDefined"), true))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();
  },
});

// Get user-defined prompt templates
export const getUserPromptTemplates = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promptTemplates")
      .filter((q) => q.eq(q.field("ownerId"), args.ownerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();
  },
});

// Get a single prompt template by ID
export const getPromptTemplateById = query({
  args: { templateId: v.id("promptTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Get prompt templates by usage (most popular first)
export const getPromptTemplatesByUsage = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const templates = await ctx.db
      .query("promptTemplates")
      .filter((q) => q.gt(q.field("usageCount"), 0))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    return templates.slice(0, limit);
  },
});

// Get content items for a locus organized by type and position
export const getLocusContentItems = query({
  args: {
    locusId: v.string(), // Can be nexus ID or notebook ID
    contentType: v.optional(v.union(
      v.literal("chunk"),
      v.literal("notebook"),
      v.literal("tag"),
      v.literal("conversationMessage")
    )),
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("locusContentItems")
      .withIndex("by_locus_parent", (q) =>
        q.eq("locusId", args.locusId).eq("parentId", args.parentId)
      );

    if (args.contentType) {
      query = query.filter((q) => q.eq(q.field("contentType"), args.contentType));
    }

    const items = await query.order("asc").collect();

    // Enrich items with their actual content data
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let contentData = null;

        switch (item.contentType) {
          case "chunk":
            const chunk = await ctx.db.get(item.contentId as Id<"chunks">);
            if (chunk) {
              const metaTag = chunk.metaTagId ? await ctx.db.get(chunk.metaTagId) : null;
              contentData = { ...chunk, metaTag };
            }
            break;
          case "notebook":
            contentData = await ctx.db.get(item.contentId as Id<"notebooks">);
            break;
          case "tag":
            contentData = await ctx.db.get(item.contentId as Id<"tags">);
            break;
          case "conversationMessage":
            contentData = await ctx.db.get(item.contentId as Id<"conversationMessages">);
            break;
        }

        return {
          ...item,
          contentData,
        };
      })
    );

    return enrichedItems.filter(item => item.contentData !== null);
  },
});

// Get notebooks for a specific nexus with ordering from locus content items
export const getNotebooksByNexus = query({
  args: { nexusId: v.id("nexi"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const nexus = await ctx.db.get(args.nexusId);
    if (!nexus) return [];

    // Check access permissions
    const isShared = nexus.ownerId === undefined;
    if (args.ownerId) {
      const isOwner = nexus.ownerId === args.ownerId;
      if (!isOwner && !isShared) return [];
    } else {
      // Guests may only access shared/public nexi
      if (!isShared) return [];
    }

    // Get notebooks with proper ordering from locusContentItems
    const locusItems = await ctx.db
      .query("locusContentItems")
      .withIndex("by_locus_parent", (q) =>
        q.eq("locusId", args.nexusId).eq("parentId", undefined)
      )
      .filter((q) => q.eq(q.field("contentType"), "notebook"))
      .order("asc")
      .collect();

    // Get the actual notebook data for each item
    const notebooks = await Promise.all(
      locusItems.map(async (item) => {
        const notebook = await ctx.db.get(item.contentId as Id<"notebooks">);
        return notebook ? { ...notebook, _locusPosition: item.position } : null;
      })
    );

    // Filter out null notebooks and scope by owner
    let filteredNotebooks = notebooks.filter(n => n !== null) as Doc<"notebooks">[];

    // For shared nexi, return all notebooks (including those without ownerId)
    // For owned nexi, scope by owner when ownerId provided
    if (args.ownerId && !isShared) {
      filteredNotebooks = filteredNotebooks.filter(n => n.ownerId === args.ownerId || n.ownerId === undefined);
    }

    return filteredNotebooks;
  },
});

// Get all notebooks across all nexi
export const getAllNotebooks = query({
  args: { ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If ownerId provided, only include nexi owned by that user (exclude shared)
    let nexi = await ctx.db.query("nexi").collect();
    if (args.ownerId) {
      nexi = await ctx.db
        .query("nexi")
        .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId!))
        .collect();
    }

    // Get notebooks for each allowed nexus with nexus information
    const allNotebooks: Array<Doc<"notebooks"> & { nexusName: string }> = [];
    for (const nexus of nexi) {
      let notebooks = await ctx.db
        .query("notebooks")
        .withIndex("by_nexus", (q) => q.eq("nexusId", nexus._id))
        .collect();

      // Scope notebooks by owner if ownerId provided; allow undefined only for back-compat within user's own nexi
      if (args.ownerId) {
        notebooks = notebooks.filter((nb) => nb.ownerId === args.ownerId || nb.ownerId === undefined);
      }

      const notebooksWithNexus = notebooks.map((notebook) => ({
        ...notebook,
        nexusName: nexus.name,
      }));

      allNotebooks.push(...notebooksWithNexus);
    }

    return allNotebooks;
  },
});

// Check if a chunk is a shadow chunk and get parent info
export const getShadowChunkInfo = query({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    // Check if this chunk is a shadow chunk
    const connection = await ctx.db
      .query("chunkConnections")
      .withIndex("by_shadow", (q) => q.eq("shadowChunkId", args.chunkId))
      .first();

    if (!connection) {
      return null; // Not a shadow chunk
    }

    // Get the source chunk and notebook info
    const sourceChunk = await ctx.db.get(connection.sourceChunkId);
    const sourceNotebook = sourceChunk?.notebookId ? await ctx.db.get(sourceChunk.notebookId) : null;

    return {
      connection,
      sourceChunk,
      sourceNotebook,
    };
  },
});

// Get connections for a chunk
export const getChunkConnections = query({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("chunkConnections")
      .withIndex("by_source", (q) => q.eq("sourceChunkId", args.chunkId))
      .collect();

    // Get additional details for each connection
    const connectionsWithDetails = await Promise.all(
      connections.map(async (connection) => {
        const targetNotebook = await ctx.db.get(connection.targetNotebookId);
        const shadowChunk = await ctx.db.get(connection.shadowChunkId);

        // Get nexus information for the target notebook
        let targetNotebookWithNexus = targetNotebook;
        if (targetNotebook) {
          const nexus = await ctx.db.get(targetNotebook.nexusId);
          targetNotebookWithNexus = {
            ...targetNotebook,
            nexusName: nexus?.name,
          } as typeof targetNotebook & { nexusName?: string };
        }

        return {
          ...connection,
          targetNotebook: targetNotebookWithNexus,
          shadowChunk,
        };
      })
    );

    return connectionsWithDetails;
  },
});

// Get connection counts for multiple chunks
export const getChunkConnectionCounts = query({
  args: {
    chunkIds: v.array(v.id("chunks")),
  },
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {};

    // Get all connections for the provided chunk IDs
    // Work around lack of .in() by collecting all and filtering in JS
    const allConnections = await ctx.db
      .query("chunkConnections")
      .withIndex("by_source", (q) => q) // no .in(), so get all by index
      .collect();
    const filteredConnections = allConnections.filter(connection =>
      args.chunkIds.includes(connection.sourceChunkId)
    );

    // Count connections for each chunk
    for (const connection of filteredConnections) {
      const chunkId = connection.sourceChunkId;
      counts[chunkId] = (counts[chunkId] || 0) + 1;
    }

    return counts;
  },
});

// Get attachments for a chunk
export const getAttachmentsByChunk = query({
  args: { chunkId: v.id("chunks"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("attachments")
      .withIndex("by_chunk", (q) => q.eq("chunkId", args.chunkId))
      .order("asc")
      .collect();
    return args.ownerId
      ? all.filter(a => a.ownerId === args.ownerId || a.ownerId === undefined)
      : all;
  },
});

// Get attachments for multiple chunks, returned as a map chunkId -> attachments[]
export const getAttachmentsForChunks = query({
  args: { chunkIds: v.array(v.id("chunks")), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, Array<{ _id: Id<"attachments">; name: string; url: string; createdAt: number }>> = {};
    for (const chunkId of args.chunkIds) {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_chunk", (q) => q.eq("chunkId", chunkId))
        .order("asc")
        .collect();
      const scoped = args.ownerId
        ? attachments.filter(a => a.ownerId === args.ownerId || a.ownerId === undefined)
        : attachments;
      results[chunkId] = scoped.map(a => ({ _id: a._id, name: a.name, url: a.url, createdAt: a.createdAt }));
    }
    return results;
  },
});

// Get chunks by meta tag with full meta tag and tags information
export const getChunksByMetaTag = query({
  args: { metaTagId: v.id("metaTags"), ownerId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Get all chunks with this meta tag
    let chunks = await ctx.db
      .query("chunks")
      .withIndex("by_meta_tag", (q) => q.eq("metaTagId", args.metaTagId))
      .collect();

    // Filter by owner through notebook relationship if provided
    if (args.ownerId) {
      const filteredChunks = [];
      for (const chunk of chunks) {
        // Get the notebook this chunk belongs to
        const notebook = await ctx.db.get(chunk.notebookId);
        if (notebook) {
          // Get the nexus this notebook belongs to
          const nexus = await ctx.db.get(notebook.nexusId);
          if (nexus) {
            // Only include chunks from nexi owned by this user
            // NO shared chunks (except USER MANUAL which should have user-specific copies)
            const isUserOwned = nexus.ownerId === args.ownerId;

            if (isUserOwned) {
              filteredChunks.push(chunk);
            }
          }
        }
      }
      chunks = filteredChunks;
    }

    // Get the meta tag information
    const metaTag = await ctx.db.get(args.metaTagId);

    // Get chunks with their meta tag and tags information
    const chunksWithMetaTags = await Promise.all(
      chunks.map(async (chunk) => {
        // Get tags for this chunk
        const chunkTags = await ctx.db
          .query("chunkTags")
          .withIndex("by_chunk", (q) => q.eq("chunkId", chunk._id))
          .collect();

        const tags = await Promise.all(
          chunkTags.map(async (chunkTag) => {
            const tag = await ctx.db.get(chunkTag.tagId);
            return tag;
          })
        );

        const validTags = tags.filter(tag => tag !== null);

        return {
          ...chunk,
          metaTag,
          tags: validTags,
        };
      })
    );

    return chunksWithMetaTags;
  },
});

// Debug query to find orphaned chunks and nexi without proper ownership
export const findOrphanedData = query({
  args: {},
  handler: async (ctx) => {
    // Find all nexi without owners (should only be shared USER MANUAL)
    const nexiWithoutOwners = await ctx.db
      .query("nexi")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    // Find all chunks without owners
    const chunksWithoutOwners = await ctx.db
      .query("chunks")
      .filter((q) => q.eq(q.field("ownerId"), undefined))
      .collect();

    // Find chunks with EXPLORATORY meta tag
    const exploratoryMetaTag = await ctx.db
      .query("metaTags")
      .filter((q) => q.eq(q.field("name"), "EXPLORATORY"))
      .first();

    let exploratoryChunks: Array<{ _id: Id<"chunks">; notebookId: Id<"notebooks">; ownerId?: string }> = [];
    if (exploratoryMetaTag) {
      exploratoryChunks = await ctx.db
        .query("chunks")
        .withIndex("by_meta_tag", (q) => q.eq("metaTagId", exploratoryMetaTag._id))
        .collect();
    }

    // Get notebook and nexus info for each exploratory chunk
    const exploratoryChunksWithContext = await Promise.all(
      exploratoryChunks.map(async (chunk) => {
        const notebook = await ctx.db.get(chunk.notebookId);
        const nexus = notebook ? await ctx.db.get(notebook.nexusId) : null;
        return {
          chunkId: chunk._id,
          chunkOwnerId: chunk.ownerId,
          notebookName: notebook?.name,
          notebookOwnerId: notebook?.ownerId,
          nexusName: nexus?.name,
          nexusOwnerId: nexus?.ownerId,
          nexusGuestSessionId: nexus?.guestSessionId,
        };
      })
    );

    return {
      nexiWithoutOwners: nexiWithoutOwners.map(n => ({
        id: n._id,
        name: n.name,
        guestSessionId: n.guestSessionId,
      })),
      chunksWithoutOwners: chunksWithoutOwners.length,
      exploratoryChunksWithContext,
      totalExploratoryChunks: exploratoryChunks.length,
    };
  },
});
