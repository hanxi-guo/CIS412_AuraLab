import React, { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import {
  INITIAL_CAMPAIGNS,
  MAX_BRIEF_LENGTH,
  MAX_CAMPAIGN_NAME_LENGTH,
  MAX_BRAND_VOICE_TAGS,
  THEME,
} from './config';
import type { Campaign, Post, PostDraft } from './types';
import Sidebar from './components/Sidebar';
import PostEditorModal from './components/PostEditorModal';
import ConfirmModal from './components/ConfirmModal';
import NewCampaignModal from './components/NewCampaignModal';

const App: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    INITIAL_CAMPAIGNS[0]?.id ?? ''
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [campaignPendingDelete, setCampaignPendingDelete] = useState<Campaign | null>(
    null
  );
  const [postPendingDelete, setPostPendingDelete] = useState<Post | null>(null);
  const [brandVoiceInput, setBrandVoiceInput] = useState<string>('');

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    setBrandVoiceInput('');
  };

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
      brief: {
        overview: '',
        targetAudience: '',
        brandVoice: [],
        guardrails: '',
      },
    };

    setCampaigns((prev) => [...prev, newCampaign]);
    handleSelectCampaign(newCampaign.id);
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

  const handleUpdateCampaignBriefField = (
    id: string,
    field: keyof Campaign['brief'],
    value: string
  ) => {
    if (value.length > MAX_BRIEF_LENGTH) {
      alert(`This field cannot exceed ${MAX_BRIEF_LENGTH} characters.`);
    }
    const safe = value.slice(0, MAX_BRIEF_LENGTH);

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              brief: {
                ...c.brief,
                [field]: safe,
              },
            }
          : c
      )
    );
  };

  const handleAddBrandVoiceTag = () => {
    if (!selectedCampaign) return;

    const raw = brandVoiceInput.trim();
    if (!raw) return;

    const existingTags = selectedCampaign.brief.brandVoice;
    if (existingTags.length >= MAX_BRAND_VOICE_TAGS) {
      alert(`You can add up to ${MAX_BRAND_VOICE_TAGS} brand-voice tags.`);
      return;
    }

    const exists = existingTags.some(
      (tag) => tag.toLowerCase() === raw.toLowerCase()
    );
    if (exists) {
      alert('This brand-voice tag is already added.');
      return;
    }

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === selectedCampaign.id
          ? {
              ...c,
              brief: {
                ...c.brief,
                brandVoice: [...c.brief.brandVoice, raw],
              },
            }
          : c
      )
    );

    setBrandVoiceInput('');
  };

  const handleRemoveBrandVoiceTag = (tagToRemove: string) => {
    if (!selectedCampaign) return;

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === selectedCampaign.id
          ? {
              ...c,
              brief: {
                ...c.brief,
                brandVoice: c.brief.brandVoice.filter((tag) => tag !== tagToRemove),
              },
            }
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
        handleSelectCampaign(remaining[0].id);
      } else {
        // no campaigns left
        handleSelectCampaign('');
      }
    }

    setCampaignPendingDelete(null);
  };

  // --- Derived data ---

  const postsForSelected = selectedCampaign?.posts ?? [];
  const brief = selectedCampaign?.brief;

  return (
    <div className={`flex w-full h-screen ${THEME.bg} font-sans overflow-hidden`}>
      <Sidebar
        campaigns={campaigns}
        filteredCampaigns={filteredCampaigns}
        selectedCampaignId={selectedCampaignId}
        onSelectCampaign={handleSelectCampaign}
        onNewCampaign={() => setIsNewCampaignModalOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDeleteCampaign={handleDeleteCampaign}
        onRenameCampaign={handleRenameCampaign}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative">
        {selectedCampaign && brief ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 pb-32">
              {/* Header */}
              <div className="flex justify-between items-end mb-6">
                <h1
                  className={`text-4xl font-bold ${THEME.textMain} truncate leading-[1.15] pb-1`}
                  title={selectedCampaign?.name}
                >
                  {selectedCampaign?.name ?? 'Campaign'}
                </h1>
              </div>

              {/* Structured Campaign Brief */}
              <div
                className={`w-full border border-[#5A5248] rounded-2xl p-3 mb-4 ${THEME.card} text-[#4A4238]`}
              >
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold tracking-wide uppercase text-[#8C857B]">
                        Campaign Brief
                      </h2>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase text-[#8C857B]">
                      Overview / Objective
                    </label>
                    <textarea
                    value={brief.overview}
                    onChange={(e) =>
                      handleUpdateCampaignBriefField(
                        selectedCampaign.id,
                        'overview',
                        e.target.value
                      )
                    }
                    placeholder="What is this campaign trying to achieve? (e.g., launch a new collection, drive newsletter signups, build awareness, etc.)"
                    className="w-full bg-transparent border border-[#D1CBC1] rounded-2xl px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C27A70] focus:bg-white/80 resize-none min-h-[60px] max-h-28 overflow-y-auto placeholder:text-[#A39D93]"
                  />
                    <div className="text-[11px] text-right text-[#8C857B]">
                      {brief.overview.length}/{MAX_BRIEF_LENGTH}
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase text-[#8C857B]">
                      Target Audience
                    </label>
                    <textarea
                    value={brief.targetAudience}
                    onChange={(e) =>
                      handleUpdateCampaignBriefField(
                        selectedCampaign.id,
                        'targetAudience',
                        e.target.value
                      )
                    }
                    placeholder="Who are we talking to? Include age range, lifestyle, motivations, and what problem we solve for them."
                    className="w-full bg-transparent border border-[#D1CBC1] rounded-2xl px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C27A70] focus:bg-white/80 resize-none min-h-[56px] max-h-32 overflow-y-auto placeholder:text-[#A39D93]"
                  />
                    <div className="text-[11px] text-right text-[#8C857B]">
                      {brief.targetAudience.length}/{MAX_BRIEF_LENGTH}
                    </div>
                  </div>

                  {/* Brand Voice (tags) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase text-[#8C857B]">
                      Brand Voice (Tags)
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {brief.brandVoice.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleRemoveBrandVoiceTag(tag)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#DED9CD] text-[11px] text-[#4A4238] hover:bg-[#CFC8BA] transition-colors"
                        >
                          <span>{tag}</span>
                          <span className="text-[10px] text-[#6B6359]">×</span>
                        </button>
                      ))}
                      {brief.brandVoice.length === 0 && (
                        <span className="text-[11px] text-[#A39D93] italic">
                          No tags yet — start by adding a few tone keywords.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 max-w-md">
                      <input
                        type="text"
                        value={brandVoiceInput}
                        onChange={(e) => setBrandVoiceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddBrandVoiceTag();
                          }
                        }}
                        placeholder="e.g. warm, aspirational, playful"
                        className="flex-1 bg-white/80 border border-[#D1CBC1] rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C27A70]"
                      />
                      <button
                        type="button"
                        onClick={handleAddBrandVoiceTag}
                        className={`px-3 py-2 rounded-full text-xs font-medium text-white ${
                          brief.brandVoice.length >= MAX_BRAND_VOICE_TAGS
                            ? 'bg-[#CFC8BA] cursor-not-allowed'
                            : 'bg-[#C27A70] hover:bg-[#A6655C]'
                        }`}
                        disabled={brief.brandVoice.length >= MAX_BRAND_VOICE_TAGS}
                      >
                        + Add
                      </button>
                    </div>

                    <div className="text-[10px] text-[#8C857B]">
                      {brief.brandVoice.length}/{MAX_BRAND_VOICE_TAGS} tags
                    </div>
                  </div>

                  {/* Guardrails / Do & Don't */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase text-[#8C857B]">
                      Guardrails (Do / Don&apos;t)
                    </label>
                    <textarea
                      value={brief.guardrails}
                      onChange={(e) =>
                        handleUpdateCampaignBriefField(
                          selectedCampaign.id,
                          'guardrails',
                          e.target.value
                        )
                      }
                      placeholder="Any hard rules? (e.g., no pricing, avoid slang, always credit the artist, specific hashtags to use or avoid.)"
                      className="w-full bg-transparent border border-[#D1CBC1] rounded-2xl px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C27A70] focus:bg-white/80 resize-none min-h-[56px] max-h-32 overflow-y-auto placeholder:text-[#A39D93]"
                    />
                    <div className="text-[11px] text-right text-[#8C857B]">
                      {brief.guardrails.length}/{MAX_BRIEF_LENGTH}
                    </div>
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
                          className="p-1 rounded-full bg-white/90 hover:bg:white shadow-sm border border-[#E6E1D6]"
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
                            <span className="text-xs text-gray-400">
                              No image attached
                            </span>
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
      {isModalOpen && (
        <PostEditorModal
          key={editingPost ? `edit-${editingPost.id}` : 'new'}
          isOpen
          onClose={() => {
            setIsModalOpen(false);
            setEditingPost(null);
          }}
          onSave={handleSavePost}
          campaignName={selectedCampaign?.name ?? 'Campaign'}
          existingPost={editingPost}
        />
      )}

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
