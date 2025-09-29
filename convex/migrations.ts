import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type LegacyOrdered = { order?: number };
function legacyOrder(val: LegacyOrdered | undefined): number {
  return typeof val?.order === "number" ? val.order : 0;
}

// Migration to fix missing updatedAt fields in conversations table
export const fixConversationsUpdatedAt = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all conversations that don't have updatedAt field
    const conversations = await ctx.db.query("conversations").collect();
    
    let fixedCount = 0;
    let deletedCount = 0;
    
    for (const conversation of conversations) {
      // Check if this document has the wrong structure (has answer/question fields)
      if ('answer' in conversation || 'question' in conversation) {
        // This is incorrectly structured - it should be in conversationMessages table
        // Delete it from conversations table
        await ctx.db.delete(conversation._id);
        deletedCount++;
        console.log(`Deleted incorrectly structured conversation: ${conversation._id}`);
        continue;
      }
      
      // Check if updatedAt is missing or undefined
      if (!conversation.updatedAt) {
        // Use createdAt as updatedAt if available, otherwise use current time
        const updatedAt = conversation.createdAt || Date.now();
        
        await ctx.db.patch(conversation._id, {
          updatedAt: updatedAt,
        });
        fixedCount++;
        console.log(`Fixed missing updatedAt for conversation: ${conversation._id}`);
      }
    }
    
    return { 
      fixedCount, 
      deletedCount, 
      totalConversations: conversations.length 
    };
  },
});



// Migration to populate locusContentItems table from existing order fields
export const migrateToLocusContentItems = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let migratedChunks = 0;
    let migratedNotebooks = 0;
    let migratedTags = 0;
    let migratedMessages = 0;

    // Migrate chunks
    console.log("Migrating chunks...");
    const chunks = await ctx.db.query("chunks").collect();
    
    for (const chunk of chunks) {
      // Check if this chunk is already in locusContentItems
      const existingItem = await ctx.db
        .query("locusContentItems")
        .withIndex("by_content", (q) => 
          q.eq("contentType", "chunk").eq("contentId", chunk._id)
        )
        .first();
      
      if (!existingItem) {
        await ctx.db.insert("locusContentItems", {
          locusId: chunk.notebookId,
          locusType: "notebook",
          contentType: "chunk",
          contentId: chunk._id,
           position: legacyOrder(chunk as unknown as LegacyOrdered),
          parentId: undefined,
          createdAt: chunk.createdAt,
          updatedAt: now,
          ownerId: chunk.ownerId,
        });
        migratedChunks++;
      }
    }

    // Migrate notebooks (use nexusId as locusId)
    console.log("Migrating notebooks...");
    const notebooks = await ctx.db.query("notebooks").collect();
    
    for (const notebook of notebooks) {
      const existingItem = await ctx.db
        .query("locusContentItems")
        .withIndex("by_content", (q) => 
          q.eq("contentType", "notebook").eq("contentId", notebook._id)
        )
        .first();
      
      if (!existingItem) {
        await ctx.db.insert("locusContentItems", {
          locusId: notebook.nexusId,
          locusType: "nexus",
          contentType: "notebook",
          contentId: notebook._id,
           position: legacyOrder(notebook as unknown as LegacyOrdered),
          parentId: undefined,
          createdAt: notebook.createdAt,
          updatedAt: now,
          ownerId: notebook.ownerId,
        });
        migratedNotebooks++;
      }
    }

    // Migrate tags
    console.log("Migrating tags...");
    const tags = await ctx.db.query("tags").collect();
    
    for (const tag of tags) {
      const existingItem = await ctx.db
        .query("locusContentItems")
        .withIndex("by_content", (q) => 
          q.eq("contentType", "tag").eq("contentId", tag._id)
        )
        .first();
      
      if (!existingItem) {
        await ctx.db.insert("locusContentItems", {
          locusId: tag.notebookId,
          locusType: "notebook",
          contentType: "tag",
          contentId: tag._id,
           position: legacyOrder(tag as unknown as LegacyOrdered),
          parentId: tag.parentTagId ? tag.parentTagId.toString() : undefined,
          createdAt: tag.createdAt,
          updatedAt: now,
          ownerId: tag.ownerId,
        });
        migratedTags++;
      }
    }

    // Migrate conversation messages
    console.log("Migrating conversation messages...");
    const messages = await ctx.db.query("conversationMessages").collect();
    
    for (const message of messages) {
      const existingItem = await ctx.db
        .query("locusContentItems")
        .withIndex("by_content", (q) => 
          q.eq("contentType", "conversationMessage").eq("contentId", message._id)
        )
        .first();
      
      if (!existingItem) {
        // Get the conversation to find the notebookId
        const conversation = await ctx.db.get(message.conversationId);
        if (conversation && conversation.notebookId) {
          await ctx.db.insert("locusContentItems", {
            locusId: conversation.notebookId,
            locusType: "notebook",
            contentType: "conversationMessage",
            contentId: message._id,
            position: legacyOrder(message as unknown as LegacyOrdered),
            parentId: undefined,
            createdAt: message.createdAt,
            updatedAt: now,
            ownerId: message.ownerId,
          });
          migratedMessages++;
        }
      }
    }

    console.log(`Migration complete:
      - Chunks: ${migratedChunks}
      - Notebooks: ${migratedNotebooks}
      - Tags: ${migratedTags}
      - Messages: ${migratedMessages}
    `);

    return { 
      migratedChunks, 
      migratedNotebooks, 
      migratedTags, 
      migratedMessages 
    };
  },
}); 

// Backfill ownerIds and clone USER MANUAL nexus for all users
export const backfillOwnerIdsAndShareUserManual = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1) Build a set of known user IDs from existing data
    const userIdSet = new Set<string>();
    const collectOwnerIds = (docs: Array<{ ownerId?: string }>) => {
      for (const d of docs) if (typeof d.ownerId === "string" && d.ownerId.length > 0) userIdSet.add(d.ownerId);
    };

    const [allNexi, allNotebooks, allChunks, allConversations, allTemplates, allMetaTags, allJems, allUsers] = await Promise.all([
      ctx.db.query("nexi").collect(),
      ctx.db.query("notebooks").collect(),
      ctx.db.query("chunks").collect(),
      ctx.db.query("conversations").collect(),
      ctx.db.query("promptTemplates").collect(),
      ctx.db.query("metaTags").collect(),
      ctx.db.query("jems").collect(),
      ctx.db.query("users").collect(),
    ]);
    collectOwnerIds(allNexi);
    collectOwnerIds(allNotebooks);
    collectOwnerIds(allChunks);
    collectOwnerIds(allConversations);
    collectOwnerIds(allTemplates);
    collectOwnerIds(allMetaTags);
    collectOwnerIds(allJems);
    for (const u of allUsers) if (u.userId) userIdSet.add(u.userId);

    // Helper to get or infer ownerId for a nexus
    const inferNexusOwner = async (nexusId: Id<"nexi">): Promise<string | undefined> => {
      const notebooks = await ctx.db.query("notebooks").withIndex("by_nexus", (q) => q.eq("nexusId", nexusId)).collect();
      const owner = notebooks.find((n) => typeof n.ownerId === "string")?.ownerId;
      return owner;
    };

    // 2) Backfill ownerId for nexi
    let updatedNexiCount = 0;
    for (const nexus of allNexi) {
      if (!nexus.ownerId) {
        const inferred = await inferNexusOwner(nexus._id as Id<"nexi">);
        if (inferred) {
          await ctx.db.patch(nexus._id, { ownerId: inferred, updatedAt: now });
          updatedNexiCount++;
        }
      }
    }

    // 3) Backfill ownerId for notebooks from their parent nexus
    let updatedNotebookCount = 0;
    for (const notebook of allNotebooks) {
      if (!notebook.ownerId) {
        const parentNexus = await ctx.db.get(notebook.nexusId);
        if (parentNexus?.ownerId) {
          await ctx.db.patch(notebook._id, { ownerId: parentNexus.ownerId, updatedAt: now });
          updatedNotebookCount++;
        }
      }
    }

    // 4) Backfill ownerId for chunks from their parent notebook
    let updatedChunkCount = 0;
    for (const chunk of allChunks) {
      if (!chunk.ownerId) {
        const parentNotebook = await ctx.db.get(chunk.notebookId);
        if (parentNotebook?.ownerId) {
          await ctx.db.patch(chunk._id, { ownerId: parentNotebook.ownerId, updatedAt: now });
          updatedChunkCount++;
        }
      }
    }

    // 4b) Fallback: any remaining orphaned chunks -> assign to fallback userId
    const HARDCODED_FALLBACK_USER = "user_310e3AlPAGjkzo5PjOD3vqxLGDG";
    let fallbackOwnerId: string = HARDCODED_FALLBACK_USER;
    if (allUsers.length > 0) {
      // Use the last entry by createdAt
      const sortedUsers = [...allUsers].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const last = sortedUsers[sortedUsers.length - 1];
      if (last?.userId) fallbackOwnerId = last.userId;
    }

    let fallbackUpdatedChunks = 0;
    const latestChunks = await ctx.db.query("chunks").collect();
    for (const chunk of latestChunks) {
      if (!chunk.ownerId) {
        await ctx.db.patch(chunk._id, { ownerId: fallbackOwnerId, updatedAt: now });
        updatedChunkCount++;
        fallbackUpdatedChunks++;
      }
    }

    // 5) Backfill ownerId for locusContentItems if missing
    let updatedLocusItemsCount = 0;
    const allLocusItems = await ctx.db.query("locusContentItems").collect();
    for (const item of allLocusItems) {
      if (!item.ownerId) {
        let ownerIdToSet: string | undefined;
        if (item.locusType === "nexus") {
          const nexus = await ctx.db.get(item.locusId as Id<"nexi">);
          ownerIdToSet = nexus?.ownerId;
        } else if (item.locusType === "notebook") {
          // Try the notebook first
          const notebook = await ctx.db.get(item.locusId as Id<"notebooks">);
          ownerIdToSet = notebook?.ownerId;
          // If still missing, try content item owner
          if (!ownerIdToSet) {
            if (item.contentType === "chunk") {
              const c = await ctx.db.get(item.contentId as Id<"chunks">);
              ownerIdToSet = c?.ownerId;
            } else if (item.contentType === "tag") {
              const t = await ctx.db.get(item.contentId as Id<"tags">);
              ownerIdToSet = t?.ownerId as string | undefined;
            } else if (item.contentType === "conversationMessage") {
              const m = await ctx.db.get(item.contentId as Id<"conversationMessages">);
              ownerIdToSet = m?.ownerId as string | undefined;
            }
          }
        }
        if (ownerIdToSet) {
          await ctx.db.patch(item._id, { ownerId: ownerIdToSet, updatedAt: now });
          updatedLocusItemsCount++;
        }
      }
    }

    // 6) Clone USER MANUAL nexus for every known userId
    // Find a source USER MANUAL nexus (prefer one without owner or the first found)
    const userManualCandidates = allNexi.filter((n) => (n.name || "").toUpperCase() === "USER MANUAL");
    const sourceUserManual = userManualCandidates.find((n) => !n.ownerId) || userManualCandidates[0];

    let clonedForUsers = 0;
    if (sourceUserManual) {
      // Preload source notebooks and their data
      const sourceManualNexusId = sourceUserManual._id as Id<"nexi">;
      const sourceNotebooks = await ctx.db
        .query("notebooks")
        .withIndex("by_nexus", (q) => q.eq("nexusId", sourceManualNexusId))
        .collect();

      // Load content and ordering for notebooks in this nexus
      const sourceNexusItems = await ctx.db
        .query("locusContentItems")
        .withIndex("by_locus_and_type", (q) => q.eq("locusId", sourceManualNexusId).eq("contentType", "notebook"))
        .filter((q) => q.eq(q.field("locusType"), "nexus"))
        .collect();

      for (const userId of Array.from(userIdSet)) {
        // Skip if a USER MANUAL already exists for this user
        const existingForUser = await ctx.db
          .query("nexi")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .filter((q) => q.eq(q.field("name"), "USER MANUAL"))
          .first();
        if (existingForUser) continue;

        // Create new USER MANUAL nexus for this user
        const newNexusId = await ctx.db.insert("nexi", {
          name: sourceUserManual.name,
          description: sourceUserManual.description,
          createdAt: now,
          updatedAt: now,
          order: legacyOrder(sourceUserManual as unknown as LegacyOrdered),
          ownerId: userId,
        });

        // Map old -> new notebook IDs
        const notebookIdMap = new Map<string, Id<"notebooks">>();

        // Clone notebooks
          for (const srcNotebook of sourceNotebooks) {
          const newNotebookId = await ctx.db.insert("notebooks", {
            nexusId: newNexusId,
            name: srcNotebook.name,
            description: srcNotebook.description,
            metaQuestion: srcNotebook.metaQuestion,
            createdAt: now,
            updatedAt: now,
              order: legacyOrder(srcNotebook as unknown as LegacyOrdered),
            ownerId: userId,
          });
          notebookIdMap.set(srcNotebook._id, newNotebookId);
        }

        // Recreate notebook ordering in locusContentItems for the new nexus
        for (const item of sourceNexusItems) {
          const mappedNotebookId = notebookIdMap.get(item.contentId);
          if (!mappedNotebookId) continue;
          await ctx.db.insert("locusContentItems", {
            locusId: newNexusId,
            locusType: "nexus",
            contentType: "notebook",
            contentId: mappedNotebookId,
            position: item.position,
            parentId: undefined,
            createdAt: now,
            updatedAt: now,
            ownerId: userId,
          });
        }

        // For each notebook, clone tags, chunks, and their ordering
        for (const srcNotebook of sourceNotebooks) {
          const newNotebookId = notebookIdMap.get(srcNotebook._id);
          if (!newNotebookId) continue;

          // Load source tags and chunks
          const [srcTags, srcChunks] = await Promise.all([
            ctx.db.query("tags").withIndex("by_notebook", (q) => q.eq("notebookId", srcNotebook._id)).collect(),
            ctx.db.query("chunks").withIndex("by_notebook", (q) => q.eq("notebookId", srcNotebook._id)).collect(),
          ]);

          // Clone tags with parent mapping
          const tagIdMap = new Map<string, Id<"tags">>();
          // Simple two-pass to handle parents-first, then children
          type SourceTag = {
            _id: string;
            name: string;
            description?: string;
            parentTagId?: Id<"tags">;
            color?: string;
            order?: number;
          };
          const createTag = async (t: SourceTag): Promise<void> => {
            const newParentId = t.parentTagId ? tagIdMap.get(t.parentTagId) : undefined;
            const newTagId = await ctx.db.insert("tags", {
              notebookId: newNotebookId,
              name: t.name,
              description: t.description,
              parentTagId: newParentId,
              color: t.color,
              originNotebookId: newNotebookId,
              originNexusId: (await ctx.db.get(newNotebookId))!.nexusId,
              createdAt: now,
              updatedAt: now,
              order: legacyOrder(t as LegacyOrdered),
              ownerId: userId,
            });
            tagIdMap.set(t._id, newTagId);
          };

          // First pass: parents (no parentTagId)
          for (const t of srcTags.filter((t) => !t.parentTagId)) {
            await createTag(t);
          }
          // Second pass: children
          for (const t of srcTags.filter((t) => !!t.parentTagId)) {
            // Only create if parent was created/mapped
            if (t.parentTagId && tagIdMap.has(t.parentTagId)) await createTag(t);
          }

          // Clone chunks
          const chunkIdMap = new Map<string, Id<"chunks">>();
          for (const c of srcChunks) {
            const newChunkId = await ctx.db.insert("chunks", {
              notebookId: newNotebookId,
              title: c.title,
              originalText: c.originalText,
              userEditedText: c.userEditedText,
              source: c.source,
              chunkType: c.chunkType,
              metaTagId: c.metaTagId || undefined,
              createdAt: now,
              updatedAt: now,
              order: legacyOrder(c as unknown as LegacyOrdered),
              ownerId: userId,
            });
            chunkIdMap.set(c._id, newChunkId);
          }

          // Clone chunkTags
          // For each cloned chunk, copy its tag assignments
          for (const [oldChunkId, newChunkId] of chunkIdMap.entries()) {
            const oldChunkTags = await ctx.db
              .query("chunkTags")
              .withIndex("by_chunk", (q) => q.eq("chunkId", oldChunkId as unknown as Id<"chunks">))
              .collect();

            for (const ct of oldChunkTags) {
              const mappedTagId = tagIdMap.get(ct.tagId);
              if (!mappedTagId) continue;
              await ctx.db.insert("chunkTags", {
                chunkId: newChunkId,
                tagId: mappedTagId,
                createdAt: now,
              });
            }
          }

          // Recreate ordering for this notebook's content (chunks and tags)
          const srcNotebookItems = await ctx.db
            .query("locusContentItems")
            .withIndex("by_locus", (q) => q.eq("locusId", srcNotebook._id))
            .collect();

          for (const item of srcNotebookItems) {
            let mappedContentIdStr: string | undefined;
            if (item.contentType === "chunk") {
              const mapped = chunkIdMap.get(item.contentId);
              mappedContentIdStr = mapped ? String(mapped) : undefined;
            } else if (item.contentType === "tag") {
              const mapped = tagIdMap.get(item.contentId);
              mappedContentIdStr = mapped ? String(mapped) : undefined;
            } else if (item.contentType === "conversationMessage") {
              // Skip conversation messages for now
              continue;
            } else if (item.contentType === "notebook") {
              // not expected inside notebook locus
              continue;
            }
            if (!mappedContentIdStr) continue;

            await ctx.db.insert("locusContentItems", {
              locusId: newNotebookId,
              locusType: "notebook",
              contentType: item.contentType,
              contentId: mappedContentIdStr,
              position: item.position,
              parentId: item.parentId ? (tagIdMap.get(item.parentId) ? String(tagIdMap.get(item.parentId)) : undefined) : undefined,
              createdAt: now,
              updatedAt: now,
              ownerId: userId,
            });
          }
        }

        clonedForUsers++;
      }
    }

    return {
      updatedNexiCount,
      updatedNotebookCount,
      updatedChunkCount,
      updatedLocusItemsCount,
      totalUsersDetected: userIdSet.size,
      clonedUserManualForUsers: clonedForUsers,
      fallbackOwnerIdUsed: fallbackOwnerId,
      fallbackUpdatedChunks,
    };
  },
});