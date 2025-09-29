"use client";

import { useEffect, useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import ModelPicker from "@/components/ModelPicker";
import Toggle from "@/components/Toggle";
import { allModels, modelsByCategory, defaultModels, defaultModel } from "@/utils/models";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const me = useQuery(api.queries.getMe, {});
  const shardSummary = useQuery(api.queries.getMyShardSummary, { limit: 10 });
  const updateProfile = useMutation(api.mutations.updateMyProfile);
  const updatePreferences = useMutation(api.mutations.updateMyPreferences);
  const { user } = useUser();
  const { signOut } = useClerk();

  // Profile form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences state
  const [isDarkmode, setIsDarkmode] = useState<boolean | undefined>(undefined);
  const [favModel, setFavModel] = useState<string>("");
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [addPlacement, setAddPlacement] = useState<"top" | "bottom">("top");
  const [importPlacement, setImportPlacement] = useState<"top" | "bottom">("top");
  const [researchPlacement, setResearchPlacement] = useState<"top" | "bottom">("top");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Filtering controls for models
  const [modelFilterMode, setModelFilterMode] = useState<"model" | "task" | "price" | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(modelsByCategory[0]?.key || "");

  const displayedModels = useMemo(() => {
    if (!modelFilterMode) return [];
    let list = allModels.slice();
    if (modelFilterMode === "task") {
      const category = modelsByCategory.find(c => c.key === selectedCategoryKey);
      const ids = new Set(category?.modelIds || []);
      list = list.filter(m => ids.has(m.id));
    }
    return list.sort((a, b) => (a.creditCost - b.creditCost) || a.name.localeCompare(b.name));
  }, [modelFilterMode, selectedCategoryKey]);

  useEffect(() => {
    if (me) {
      setName(me.name || user?.fullName || "");
      setEmail(me.email || user?.primaryEmailAddress?.emailAddress || "");
      setImageUrl(me.imageUrl || user?.imageUrl || "");
      setIsPaid(!!me.isPaid);

      setIsDarkmode(me.isDarkmode);
      
      // Initialize with user's configured models, or default models if none configured
      const userModels = (me.modelPickerList || []).slice(0, 5);
      if (userModels.length > 0) {
        setAllowedModels(userModels);
      } else {
        // Use default models if user hasn't configured any
        setAllowedModels(defaultModels.map(m => m.id));
      }
      
      // Set favorite model after allowed models are set
      if (me.favModel) {
        setFavModel(me.favModel);
      } else if (userModels.length === 0) {
        // Set default model as favorite if no favorite is set and no user models
        setFavModel(defaultModel?.id || "");
      } else {
        setFavModel("");
      }
      
      setAddPlacement(me.addChunkPlacement || "top");
      setImportPlacement(me.importChunkPlacement || "top");
      const meWithResearch = (me as unknown) as { researchChunkPlacement?: "top" | "bottom" };
      setResearchPlacement(meWithResearch?.researchChunkPlacement || "top");
    }
  }, [me, user]);

  const canAddMoreModels = useMemo(() => allowedModels.length < 5, [allowedModels.length]);

  const handleToggleModel = (id: string) => {
    setAllowedModels(prev => {
      const isSelected = prev.includes(id);
      let next = prev;
      if (isSelected) {
        next = prev.filter(m => m !== id);
      } else {
        if (prev.length >= 5) return prev; // enforce max
        next = [...prev, id];
      }

      // Keep favorite in sync with allowed list
      if (!next.includes(favModel)) {
        // If we just added this id and there was no favorite, use it; otherwise use first in list or empty
        const fallback = isSelected ? next[0] || "" : (favModel ? next[0] || "" : id);
        setFavModel(fallback || "");
      }

      return next;
    });
  };

  // Ensure the favorite model is always one of the allowed models
  useEffect(() => {
    if (favModel && !allowedModels.includes(favModel)) {
      setFavModel(allowedModels[0] || "");
    }
  }, [allowedModels, favModel]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), imageUrl: imageUrl.trim() || undefined, isPaid });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await updatePreferences({
        isDarkmode,
        favModel: favModel || undefined,
        modelPickerList: allowedModels,
        addChunkPlacement: addPlacement,
        importChunkPlacement: importPlacement,
        researchChunkPlacement: researchPlacement,
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  // Show loading state while data is being fetched
  if (!me) {
    return (
      <div className="flex-1 flex bg-gray-900 text-white min-h-0 items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-gray-900 text-white min-h-0">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Settings Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === "profile"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
                }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === "account"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
                }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === "preferences"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
                }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeTab === "api"
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
                }`}
            >
              API Keys
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 space-y-6 overflow-y-auto min-h-0">
        {activeTab === "profile" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Avatar URL</label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2" />
              </div>
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
                    {/* Placeholder preview */}
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-300">A</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Plan</div>
                    <div className="text-sm">{isPaid ? "Paid" : "Free"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-300" htmlFor="toggle-paid">Paid</label>
                  <Toggle id="toggle-paid" checked={isPaid} onChange={setIsPaid} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={handleSaveProfile} disabled={savingProfile} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600">{savingProfile ? "Saving..." : "Save"}</button>
              <button
                onClick={async () => {
                  try {
                    await signOut({ redirectUrl: "/" });
                    // Fallback hard redirect in case SPA state lingers blank
                    if (typeof window !== "undefined") {
                      window.location.href = "/";
                    }
                  } catch (e) {
                    console.error("Sign out failed", e);
                    if (typeof window !== "undefined") {
                      window.location.href = "/";
                    }
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            
            {/* Shard Balance Card */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Shard Balance</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-400">Shards</span>
                </div>
              </div>
              
              {shardSummary ? (
                <div className="space-y-4">
                  {/* Current Balance */}
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <div className="text-2xl font-bold text-purple-400">
                        {shardSummary.shardBalance.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">Available Shards</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Monthly Allowance</div>
                      <div className="text-lg font-medium">{shardSummary.monthlyShardAllowance}</div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Purchased</div>
                      <div className="text-lg font-medium">{shardSummary.purchasedShards}</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Next Reset</div>
                      <div className="text-sm">
                        {new Date(shardSummary.lastAllowanceResetDate + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  {shardSummary.recentTransactions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Activity</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {shardSummary.recentTransactions.map((tx, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {tx.reason || tx.type}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className={`text-sm font-medium ${tx.shardAmount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.shardAmount > 0 ? '+' : ''}{tx.shardAmount}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">Loading shard information...</div>
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Account Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Account Type</span>
                  <span className="font-medium">{me?.isPaid ? "Paid" : "Free"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Member Since</span>
                  <span className="font-medium">
                    {me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Active</span>
                  <span className="font-medium">
                    {me?.lastActiveAt ? new Date(me.lastActiveAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Preferences</h2>

            {/* Dark mode placeholder */}
            <div className="bg-gray-800 rounded p-4">
                <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Dark mode</div>
                  <div className="text-xs text-gray-400">We will wire this with a theme library later.</div>
                </div>
                  <Toggle id="toggle-darkmode" checked={!!isDarkmode} onChange={setIsDarkmode} />
              </div>
            </div>

            {/* Model picker grid (max 5) */}
            <div className="bg-gray-800 rounded p-4">
              <div className="mb-2">
                <div className="font-medium">Models</div>
                <div className="text-xs text-gray-400">This is where you pick your active models.</div>
                {allowedModels.length > 0 && allowedModels.every(id => id.includes(':free')) && (
                  <div className="text-xs text-blue-400 mt-1">
                    💡 You&apos;re currently using the default free models. Customize your selection below!
                  </div>
                )}
              </div>
              {/* Filter controls: By model, By task type, By price */}
              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex rounded overflow-hidden border border-gray-600">
                  <button
                    onClick={() => setModelFilterMode(null)}
                    className={`px-3 py-1 text-sm ${modelFilterMode === null ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
                  >None</button>
                  <button
                    onClick={() => setModelFilterMode("model")}
                    className={`px-3 py-1 text-sm ${modelFilterMode === "model" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
                  >By model</button>
                  <button
                    onClick={() => setModelFilterMode("task")}
                    className={`px-3 py-1 text-sm ${modelFilterMode === "task" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
                  >By task type</button>
                  <button
                    onClick={() => setModelFilterMode("price")}
                    className={`px-3 py-1 text-sm ${modelFilterMode === "price" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"}`}
                  >By price</button>
                </div>

                {modelFilterMode === "task" && (
                  <select
                    value={selectedCategoryKey}
                    onChange={(e) => setSelectedCategoryKey(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                  >
                    {modelsByCategory.map((c) => (
                      <option key={c.key} value={c.key}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {!modelFilterMode ? (
                <div className="text-xs text-gray-400">Select a filter to view and pick models.</div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedModels.map((m) => {
                  const selected = allowedModels.includes(m.id);
                  const disabled = !selected && !canAddMoreModels;
                  return (
                    <button
                      key={m.id}
                      onClick={() => !disabled && handleToggleModel(m.id)}
                      title={disabled ? "You can only have 5 active models at once." : undefined}
                      className={`text-left p-3 rounded border ${selected ? "border-purple-500 bg-purple-500/10" : "border-gray-600 bg-gray-700 hover:bg-gray-650"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.provider}</div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-400 line-clamp-2">{m.description}</div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <div>{m.creditCost} credit{m.creditCost !== 1 ? 's' : ''}</div>
                        <Toggle renderAs="div" checked={selected} onChange={() => {}} size="sm" color="teal" />
                      </div>
                    </button>
                  );
                })}
              </div>
              )}
              <div className="mt-3">
                <div className="text-xs text-gray-400 mb-1">Active Models</div>
                <ModelPicker selectedModel={favModel} onModelChange={setFavModel} className="w-60" allowedModels={allowedModels} />
              </div>
            </div>

            {/* Chunk placement options */}
            <div className="bg-gray-800 rounded p-4 space-y-3">
              <div className="mb-1">
                <div className="font-medium">Choose new chunk position</div>
                <div className="text-xs text-gray-400">Control where newly created chunks appear.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-2">Add Chunk button</div>
                  <select
                    value={addPlacement}
                    onChange={(e) => setAddPlacement(e.target.value as "top" | "bottom")}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-2">Imported chunks</div>
                  <select
                    value={importPlacement}
                    onChange={(e) => setImportPlacement(e.target.value as "top" | "bottom")}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-2">Research chunks</div>
                  <select
                    value={researchPlacement}
                    onChange={(e) => setResearchPlacement(e.target.value as "top" | "bottom")}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <button onClick={handleSavePreferences} disabled={savingPrefs} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600">{savingPrefs ? "Saving..." : "Save Preferences"}</button>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">API Keys</h2>
            <p className="text-gray-400">Manage your API keys here.</p>
          </div>
        )}
      </div>
    </div>
  );
}


