import React, { useRef, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import {
  INITIAL_CAMPAIGNS,
  MAX_BRIEF_LENGTH,
  MAX_CAMPAIGN_NAME_LENGTH,
  MAX_REFERENCES_PER_CAMPAIGN,
  THEME,
} from './config';
import type { Campaign, Post, PostDraft, ReferenceFile } from './types';
import Sidebar from './components/Sidebar';
import PostEditorModal from './components/PostEditorModal';
import ConfirmModal from './components/ConfirmModal';
import NewCampaignModal from './components/NewCampaignModal';

const App: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(INITIAL_CAMPAIGNS[0].id);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [campaignPendingDelete, setCampaignPendingDelete] = useState<Campaign | null>(null);
  const [postPendingDelete, setPostPendingDelete] = useState<Post | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // --- Handlers for posts ---

  const handleSavePost = (data: PostDraft) => {
    if (!selectedCampaign) return;

    if (editingPost) {
      // EDIT
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === selectedCampaignId
            ? {
                ...c,
                posts: c.posts.map((p) =>
                  p.id === editingPost.id
                    ? {
                        ...p,
                        title: data.title || p.title,
                        caption: data.text ?? p.caption,
                        images: data.images.length > 0 ? data.images : [],
                      }
                    : p
                ),
              }
            : c
        )
      );
    } else {
      // CREATE
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === selectedCampaignId
            ? {
                ...c,
                posts: [
                  {
                    id: Date.now(),
                    title: data.title || 'Untitled post',
                    caption: data.text,
                    images: data.images,
                  },
                  ...c.posts,
                ],
              }
            : c
        )
      );
    }

    // later: send data.files, data.title, data.text to backend
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const handleDeletePost = (postId: number) => {
    const campaign = campaigns.find((c) => c.id === selectedCampaignId);
    const post = campaign?.posts.find((p) => p.id === postId);
    if (!post) return;
    setPostPendingDelete(post);
  };

  const confirmDeletePost = () => {
    if (!postPendingDelete) return;

    const postId = postPendingDelete.id;

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === selectedCampaignId
          ? { ...c, posts: c.posts.filter((p) => p.id !== postId) }
          : c
      )
    );

    setPostPendingDelete(null);
  };

  // --- Handlers for campaigns ---

  const handleCreateCampaign = (name: string) => {
    const safeName = name.slice(0, MAX_CAMPAIGN_NAME_LENGTH);
    const newId =
      safeName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);

    const newCampaign: Campaign = {
      id: newId,
      name: safeName,
      posts: [],
      references: [],
      brief: '',
    };

    setCampaigns((prev) => [...prev, newCampaign]);
    setSelectedCampaignId(newCampaign.id);
    setIsNewCampaignModalOpen(false);
  };

  const handleRenameCampaign = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const safe = trimmed.slice(0, MAX_CAMPAIGN_NAME_LENGTH);

    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: safe } : c))
    );
  };

  const handleUpdateCampaignBrief = (id: string, value: string) => {
    if (value.length > MAX_BRIEF_LENGTH) {
      alert(`Campaign brief cannot exceed ${MAX_BRIEF_LENGTH} characters.`);
    }
    const safe = value.slice(0, MAX_BRIEF_LENGTH);

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, brief: safe }
          : c
      )
    );
  };

  const handleDeleteCampaign = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;
    setCampaignPendingDelete(campaign);
  };

  const confirmDeleteCampaign = () => {
    if (!campaignPendingDelete) return;
  
    const id = campaignPendingDelete.id;
  
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  
    if (selectedCampaignId === id) {
      const remaining = campaigns.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setSelectedCampaignId(remaining[0].id);
      } else {
        // no campaigns left
        setSelectedCampaignId('');
      }
    }
  
    setCampaignPendingDelete(null);
  };  

  // --- References / files ---

  const handleAddReferences = (fileList: FileList | null) => {
    if (!fileList || !selectedCampaign) return;

    const existingCount = selectedCampaign.references.length;
    if (existingCount >= MAX_REFERENCES_PER_CAMPAIGN) {
      alert(`You can attach up to ${MAX_REFERENCES_PER_CAMPAIGN} reference files per campaign.`);
      return;
    }

    const remaining = MAX_REFERENCES_PER_CAMPAIGN - existingCount;
    const files = Array.from(fileList).slice(0, remaining);

    if (files.length < fileList.length) {
      alert(
        `Only the first ${remaining} files were added (limit is ${MAX_REFERENCES_PER_CAMPAIGN}).`
      );
    }

    const newRefs: ReferenceFile[] = files.map((file, idx) => ({
      id: `${Date.now().toString(36)}-${idx}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === selectedCampaignId
          ? { ...c, references: [...c.references, ...newRefs] }
          : c
      )
    );

    // later: upload actual File objects to backend here
  };

  const postsForSelected = selectedCampaign?.posts ?? [];
  const referenceCount = selectedCampaign?.references.length ?? 0;
  const briefValue = selectedCampaign?.brief ?? '';

  return (
    <div className={`flex w-full h-screen ${THEME.bg} font-sans overflow-hidden`}>
      
      <Sidebar 
        campaigns={campaigns}
        filteredCampaigns={filteredCampaigns}
        selectedCampaignId={selectedCampaignId}
        onSelectCampaign={setSelectedCampaignId}
        onNewCampaign={() => setIsNewCampaignModalOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDeleteCampaign={handleDeleteCampaign}
        onRenameCampaign={handleRenameCampaign}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative">
        {selectedCampaign ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 pb-32">
              {/* Header */}
              <div className="flex justify-between items-end mb-6">
                <h1
                  className={`text-4xl font-bold ${THEME.textMain} truncate`}
                  title={selectedCampaign?.name}
                >
                  {selectedCampaign?.name ?? 'Campaign'}
                </h1>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9C2B5] text-[#6B6359] hover:bg-[#E6E2D8] transition-colors text-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Add References
                    {referenceCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-[#E6E2D8] text-[11px] text-[#6B6359]">
                        {referenceCount} file{referenceCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleAddReferences(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              {/* Brief / Description Box */}
              <div
                className={`w-full border border-[#5A5248] rounded-3xl p-6 mb-8 ${THEME.card} text-[#4A4238]`}
              >
                <div className="space-y-2">
                  <label className="block text-xs font-semibold tracking-wide uppercase text-[#8C857B]">
                    Campaign Brief
                  </label>
                  <textarea
                    value={briefValue}
                    onChange={(e) =>
                      handleUpdateCampaignBrief(selectedCampaign.id, e.target.value)
                    }
                    placeholder="Click here to add a brief for this campaign: goals, key messages, and any constraints (e.g., no pricing, tone, hashtags)."
                    className="w-full bg-transparent border border-[#D1CBC1] rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C27A70] focus:bg-white/80 resize-none min-h-[80px] max-h-40 overflow-y-auto placeholder:text-[#A39D93]"
                  />
                  <div className="text-xs text-right text-[#8C857B]">
                    {briefValue.length}/{MAX_BRIEF_LENGTH}
                  </div>
                </div>
              </div>

              {/* Posts Grid + big "+" card */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {postsForSelected.map((post) => {
                  const hasImages = post.images && post.images.length > 0;
                  const isMultiImage = post.images && post.images.length > 1;

                  return (
                    <div
                      key={post.id}
                      className={`${THEME.card} relative p-3 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow`}
                    >
                      {/* top-right delete button, separated from image */}
                      <div className="flex justify-end mb-1">
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1 rounded-full bg-white/90 hover:bg-white shadow-sm border border-[#E6E1D6]"
                          aria-label={`Delete ${post.title}`}
                        >
                          <X className="w-3 h-3 text-[#8C857B]" />
                        </button>
                      </div>

                      {/* multi-image indicator */}
                      {isMultiImage && (
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/50 text-[10px] text-white flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{post.images.length}</span>
                        </div>
                      )}

                      {/* clicking the body opens editor */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost(post);
                          setIsModalOpen(true);
                        }}
                        className="block text-left w-full"
                      >
                        <div className="aspect-square rounded-[1.5rem] overflow-hidden mb-4 bg-gray-100 flex items-center justify-center">
                          {hasImages ? (
                            <img
                              src={post.images[0]}
                              alt={post.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">No image attached</span>
                          )}
                        </div>
                        <h3
                          className={`text-xl font-semibold ${THEME.textMain} px-2 pb-1 truncate`}
                          title={post.title || 'Untitled post'}
                        >
                          {post.title || 'Untitled post'}
                        </h3>
                        {post.caption && (
                          <p className="text-sm text-[#6B6359] px-2 pb-2 line-clamp-2 break-words">
                            {post.caption}
                          </p>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* Big "+" card to create a new post */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingPost(null);
                    setIsModalOpen(true);
                  }}
                  className={`${THEME.card} p-3 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow flex flex-col`}
                >
                  <div className="aspect-square rounded-[1.5rem] border-2 border-dashed border-[#D1CBC1] flex flex-col items-center justify-center text-[#8C857B] hover:border-[#C27A70] hover:text-[#4A4238] transition-colors">
                    <span className="text-5xl leading-none mb-2">+</span>
                    <span className="text-sm">Create new post</span>
                  </div>
                </button>
              </div>
            </div>
          </>
        ) : (
          // No campaigns state
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-[#8C857B] text-center max-w-sm">
              No campaigns yet. Use the <span className="font-semibold">“New Campaign”</span>{' '}
              button in the left sidebar to create your first campaign.
            </p>
          </div>
        )}
      </main>

      {/* Post Editor Modal */}
      <PostEditorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPost(null);
        }}
        onSave={handleSavePost}
        campaignName={selectedCampaign?.name ?? 'Campaign'}
        existingPost={editingPost}
      />

      {/* New Campaign Modal */}
      <NewCampaignModal
        isOpen={isNewCampaignModalOpen}
        onClose={() => setIsNewCampaignModalOpen(false)}
        onCreate={handleCreateCampaign}
      />

      {/* Confirm delete campaign */}
      <ConfirmModal
        isOpen={!!campaignPendingDelete}
        title="Delete campaign?"
        message={
          campaignPendingDelete
            ? `Delete campaign "${campaignPendingDelete.name}" and all its posts?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteCampaign}
        onCancel={() => setCampaignPendingDelete(null)}
      />

      {/* Confirm delete post */}
      <ConfirmModal
        isOpen={!!postPendingDelete}
        title="Delete post?"
        message={
          postPendingDelete
            ? `Delete post "${postPendingDelete.title || 'Untitled post'}"?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeletePost}
        onCancel={() => setPostPendingDelete(null)}
      />
    </div>
  );
};

export default App;
