"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CreateNexusModal from "@/components/CreateNexusModal";
import ContextMenu from "@/components/ContextMenu";
import CustomModal, { ModalAction, ModalField } from "@/components/CustomModal";
import InfoModal from "@/components/InfoModal";
import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useGuestSessionId } from "@/utils/guestSession";

export default function NexiListClient() {
  const router = useRouter();
  const { userId, isSignedIn, isLoaded } = useAuth();
  const guestSessionId = useGuestSessionId();
  
  const nexi = useQuery(
    api.queries.getNexi, 
    isSignedIn 
      ? { ownerId: userId } 
      : guestSessionId 
        ? { guestSessionId } 
        : { guestSessionId: undefined } // Allow query to run for unauthenticated users without guest session
  );

  const [isCreateNexusModalOpen, setIsCreateNexusModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: { x: number; y: number }; nexusId: Id<"nexi"> | null }>({ isOpen: false, position: { x: 0, y: 0 }, nexusId: null });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; nexusId: Id<"nexi"> | null }>({ isOpen: false, nexusId: null });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; nexusId: Id<"nexi"> | null; nexusName: string }>({ isOpen: false, nexusId: null, nexusName: "" });
  
  // Research input state
  const [researchInput, setResearchInput] = useState("");
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const researchTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Guest nexus creation logic
  const canGuestCreateNexus = useMemo(() => {
    if (isSignedIn) return true;
    if (!nexi) return false;
    // Guests can only create one nexus (excluding USER MANUAL)
    return nexi.filter(n => n.name !== "USER MANUAL").length === 0;
  }, [isSignedIn, nexi]);

  // Get a random placeholder greeting
  const randomPlaceholder = useMemo(() => {
    const placeholderGreetings = [
      // General & Welcoming
      "How can I assist you today?",
      "What's on your mind?",
      "Ready to explore? Ask me anything!",
      "How can I help you get started?",
      "Welcome! What can I do for you?",
      "What would you like to know?",
      "Let's begin. What's your question?",
      "Looking for something specific?",
      "How can I help you today?",
      "Hi there! What can I assist you with?",
      // Action-Oriented & Suggestive
      "Ask me about AI or research!",
      "Discover new insights. Ask away!",
      "Need help classifying data?",
      "Curious about LLMs? Ask me!",
      "Ask me to save some data!",
      "What kind of research are you doing?",
      "Let's create a Nexus. What's your topic?",
      "Ask about data saving features.",
      "Want to classify your findings?",
      "How can I help you organize your research?",
      // Playful & Engaging
      "Got a burning question?",
      "What's your research superpower?",
      "Let's dive into data!",
      "Unleash your research potential!",
      "Ready for some AI magic?",
      "What research mysteries can we solve?",
      "Challenge me with a question!",
      "Let's make some research waves!",
      "What's your data quest?",
      "Time to level up your research!",
      // Benefit-Oriented
      "Get instant answers to your questions.",
      "Simplify your research process.",
      "Organize your knowledge efficiently.",
      "Unlock advanced data capabilities.",
      "Enhance your research with AI.",
      "Save time, find answers.",
      "Make your data work for you.",
      "Improve your research workflow.",
      "Gain deeper insights.",
      "Maximize your research potential."
    ];
    const randomIndex = Math.floor(Math.random() * placeholderGreetings.length);
    return placeholderGreetings[randomIndex];
  }, []);

  const updateNexus = useMutation(api.mutations.updateNexus);
  const deleteNexus = useMutation(api.mutations.deleteNexus);

  const selectedNexus = useMemo(() => {
    if (!nexi || !editModal.nexusId) return null;
    return nexi.find(n => n._id === editModal.nexusId) || null;
  }, [nexi, editModal.nexusId]);

  const handleCardContextMenu = useCallback((e: React.MouseEvent, nexusId: Id<"nexi">) => {
    e.preventDefault();
    // Only show context menu for authenticated users or guest-created nexi
    if (!isSignedIn) {
      const nexus = nexi?.find(n => n._id === nexusId);
      if (!nexus || nexus.ownerId) return; // Don't show context menu for shared nexi to guests
    }
    setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, nexusId });
  }, [isSignedIn, nexi]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  const openEditForSelected = useCallback(() => {
    if (!contextMenu.nexusId) return;
    setEditModal({ isOpen: true, nexusId: contextMenu.nexusId });
    closeContextMenu();
  }, [contextMenu.nexusId, closeContextMenu]);

  const handleDeleteForSelected = useCallback(() => {
    if (!contextMenu.nexusId || !nexi) return;
    const nx = nexi.find(n => n._id === contextMenu.nexusId);
    if (!nx) return;
    setDeleteModal({ isOpen: true, nexusId: nx._id, nexusName: nx.name });
  }, [contextMenu.nexusId, nexi]);

  // Research input handlers
  const handleResearchInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResearchInput(e.target.value);
  }, []);

  // Auto-resize textarea when research input changes
  useEffect(() => {
    if (researchTextareaRef.current) {
      researchTextareaRef.current.style.height = 'auto';
      researchTextareaRef.current.style.height = `${researchTextareaRef.current.scrollHeight}px`;
    }
  }, [researchInput]);

  const handleResearchSubmit = useCallback(async () => {
    if (!researchInput.trim() || isResearchLoading) return;
    
    setIsResearchLoading(true);
    try {
      // TODO: Implement research submission logic
      console.log('Research submitted:', researchInput);
      setResearchInput('');
    } catch (error) {
      console.error('Research submission failed:', error);
    } finally {
      setIsResearchLoading(false);
    }
  }, [researchInput, isResearchLoading]);

  const handleResearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleResearchSubmit();
    }
  }, [handleResearchSubmit]);

  // Context menu items
  const getContextMenuItems = useCallback(() => {
    const items = [];
    
    if (contextMenu.nexusId) {
      items.push({
        label: "Edit",
        onClick: openEditForSelected,
      });
      items.push({
        label: "Delete",
        onClick: handleDeleteForSelected,
        variant: "danger" as const,
      });
    }
    
    return items;
  }, [contextMenu.nexusId, openEditForSelected, handleDeleteForSelected]);

  const editFields: ModalField[] = useMemo(() => [
    { name: "name", label: "Nexus Name", type: "text", placeholder: "Enter nexus name...", required: true, maxLength: 100, defaultValue: selectedNexus?.name || "" },
    { name: "description", label: "Description", type: "textarea", placeholder: "Describe what this nexus is about...", maxLength: 500, defaultValue: selectedNexus?.description || "" },
  ], [selectedNexus]);

  const editActions: ModalAction[] = [
    { label: "Cancel", onClick: () => setEditModal({ isOpen: false, nexusId: null }), variant: "secondary" },
    { label: "Save Changes", onClick: () => {}, variant: "primary", disabled: isSubmittingEdit },
  ];

  const handleEditSubmit = useCallback(async (data: Record<string, string>) => {
    if (!editModal.nexusId) return;
    const name = (data.name || "").trim();
    const description = (data.description || "").trim();
    if (!name) return;
    setIsSubmittingEdit(true);
    try {
      await updateNexus({ nexusId: editModal.nexusId, name, description: description || undefined });
      setEditModal({ isOpen: false, nexusId: null });
    } catch (err) {
      console.error("Failed to update nexus:", err);
    } finally {
      setIsSubmittingEdit(false);
    }
  }, [editModal.nexusId, updateNexus]);

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex-1 p-5 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex-1 p-5 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Nexus Tech</h2>
              <p className="text-gray-300 mb-6">Sign in to access your research hub and start organizing your knowledge</p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              Sign In
            </button>
            <p className="text-sm text-gray-400">Don&apos;t have an account? <span className="text-purple-400">Sign up for free</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 overflow-y-auto min-h-0">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold">Your Nexus Hub</h1>
          {isSignedIn ? (
            <button
              onClick={() => setIsCreateNexusModalOpen(true)}
              className="bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Create Nexus
            </button>
          ) : canGuestCreateNexus ? (
            <button
              onClick={() => setIsCreateNexusModalOpen(true)}
              className="bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Create Nexus
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              disabled={!canGuestCreateNexus && nexi && nexi.filter(n => n.name !== "USER MANUAL").length >= 1}
              className={`px-4 py-2 rounded-lg transition-all duration-300 shadow-lg ${
                !canGuestCreateNexus && nexi && nexi.filter(n => n.name !== "USER MANUAL").length >= 1
                  ? "bg-gray-500 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white hover:shadow-xl"
              }`}
            >
              Create Nexus
            </button>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-gray-300 mb-6">
          <div className="text-xl font-semibold mb-2">
            {isSignedIn ? "Welcome Back" : "Welcome, Guest"}
          </div>
          <p className="text-sm mb-3">
            {isSignedIn 
              ? "Ask AI a question to get started or create a Nexus to expand and classify your research"
              : "Guest mode is still in development. Please sign in for the full experience."
            }
          </p>
          
          {isSignedIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                                     <textarea
                     ref={researchTextareaRef}
                     value={researchInput}
                     onChange={handleResearchInputChange}
                     onKeyDown={handleResearchKeyPress}
                     placeholder={randomPlaceholder}
                     className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent overflow-hidden placeholder-gray-400"
                     rows={1}
                     disabled={isResearchLoading}
                     style={{ minHeight: '44px', maxHeight: '200px' }}
                   />
                </div>
                <button
                  onClick={handleResearchSubmit}
                  disabled={!researchInput.trim() || isResearchLoading}
                  className="bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {isResearchLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-400">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm"
            >
              Sign in
            </button>
          )}
        </div>

        {!nexi ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="h-3 bg-gray-700 rounded mb-2"></div>
                <div className="h-2 bg-gray-700 rounded mb-2"></div>
                <div className="h-2 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nexi.map((nexus) => (
              <Link
                href={`/nexi/${nexus._id}`}
                prefetch
                key={nexus._id}
                onContextMenu={(e) => handleCardContextMenu(e, nexus._id as Id<"nexi">)}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:bg-gray-700 cursor-pointer block"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white line-clamp-2">{nexus.name}</h3>
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                {nexus.description && (
                  <p className="text-gray-300 text-xs mb-3 line-clamp-2">{nexus.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(nexus.createdAt).toLocaleDateString()}</span>
                  <span>{new Date(nexus.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateNexusModal
        isOpen={isCreateNexusModalOpen}
        onClose={() => setIsCreateNexusModalOpen(false)}
        onNexusCreated={(nexusId: Id<"nexi">) => {
          setIsCreateNexusModalOpen(false);
          router.push(`/nexi/${nexusId}`);
        }}
        isGuest={!isSignedIn}
        guestSessionId={guestSessionId || undefined}
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        items={getContextMenuItems()}
      />

      <CustomModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, nexusId: null })}
        title={selectedNexus ? `Edit "${selectedNexus.name}"` : "Edit Nexus"}
        fields={editFields}
        actions={editActions}
        onSubmit={handleEditSubmit}
        loading={isSubmittingEdit}
      />

      <InfoModal
        isOpen={deleteModal.isOpen}
        title="Delete Nexus"
        message={`Are you sure you want to delete "${deleteModal.nexusName}"? This cannot be undone and will remove all related content.`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmVariant="danger"
        onClose={() => setDeleteModal({ isOpen: false, nexusId: null, nexusName: "" })}
        onConfirm={async () => {
          if (!deleteModal.nexusId) return;
          try {
            await deleteNexus({ nexusId: deleteModal.nexusId });
          } catch (err) {
            console.error("Failed to delete nexus:", err);
          } finally {
            setDeleteModal({ isOpen: false, nexusId: null, nexusName: "" });
            closeContextMenu();
          }
        }}
      />
    </div>
  );
}


