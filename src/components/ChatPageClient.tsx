"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Id } from "@convex/_generated/dataModel";
import ChatInterface, { type ChatInterfaceRef } from "@/components/ChatInterface";
import ModelPicker from "@/components/ModelPicker";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { allModels, defaultModels, defaultModel } from "@/utils/models";
import { api } from "@convex/_generated/api";

export default function ChatPageClient({
  nexusId,
  locusId,
}: {
  nexusId: Id<"nexi">;
  locusId: Id<"notebooks">;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const me = useQuery(api.queries.getMe, {});
  const { isSignedIn } = useAuth();
  const freeModelIds = useMemo(() => allModels.filter(m => m.creditCost === 0).map(m => m.id), []);
  
  const allowedModels = useMemo(() => {
    const fromProfile = (me?.modelPickerList || []).slice(0, 5);
    
    // If user has configured models, use those
    if (isSignedIn && fromProfile.length > 0) {
      return fromProfile;
    }
    
    // If user is signed in but has no configured models, use default models
    if (isSignedIn) {
      return defaultModels.map(m => m.id);
    }
    
    // For non-signed in users, use free models
    return freeModelIds;
  }, [me, isSignedIn, freeModelIds]);
  
  const savedFavModel = me?.favModel || "";
  const chatRef = useRef<ChatInterfaceRef | null>(null);

  useEffect(() => {
    const savedLocal = typeof window !== "undefined" ? localStorage.getItem("selectedModel") : null;
    
    // Determine initial model selection
    let initial = "";
    
    // First priority: user's saved favorite model (if it's in allowed models)
    if (savedFavModel && allowedModels.includes(savedFavModel)) {
      initial = savedFavModel;
    }
    // Second priority: locally saved model (if it's in allowed models)
    else if (savedLocal && allowedModels.includes(savedLocal)) {
      initial = savedLocal;
    }
    // Third priority: default model (if it's in allowed models)
    else if (allowedModels.includes(defaultModel.id)) {
      initial = defaultModel.id;
    }
    // Fallback: first available model
    else if (allowedModels.length > 0) {
      initial = allowedModels[0];
    }
    
    setSelectedModel(initial);
  }, [savedFavModel, allowedModels]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  // Load preserved answer from ConversationHistory into chat
  useEffect(() => {
    if (typeof window === "undefined") return;
    const preserved = sessionStorage.getItem("preservedAnswer");
    if (preserved && chatRef.current?.processResponse) {
      chatRef.current.processResponse(preserved);
      try {
        sessionStorage.removeItem("preservedAnswer");
      } catch {}
    }
  }, [selectedModel]);

  // Handle research parameter from guest card
  useEffect(() => {
    const researchQuery = searchParams.get("research");
    if (researchQuery && chatRef.current && selectedModel) {
      // Decode the research query
      const decodedQuery = decodeURIComponent(researchQuery);
      
      // Use setTimeout to ensure the chat interface is fully loaded
      setTimeout(() => {
        if (chatRef.current?.sendMessage) {
          chatRef.current.sendMessage(decodedQuery);
        }
      }, 100);
      
      // Remove the research parameter from the URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("research");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, selectedModel, router]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/nexi/${nexusId}/loci/${locusId}`)} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold">Back to Locus</h2>
          </div>
        </div>
        <ModelPicker selectedModel={selectedModel} onModelChange={setSelectedModel} className="w-48" allowedModels={allowedModels} />
      </div>

      {/* Context header rendered on the server page as an RSC */}

      <ChatInterface
        ref={chatRef}
        selectedModel={selectedModel || defaultModel.id}
        nexusId={nexusId}
        notebookId={locusId}
        selectedTagId={null}
        className="flex-1 min-h-0"
        onSwitchToChat={() => {}}
        onNavigateToChunk={(notebook, chunk) => {
          router.push(`/nexi/${nexusId}/loci/${notebook}?scrollTo=${chunk}`);
        }}
      />
    </div>
  );
}


