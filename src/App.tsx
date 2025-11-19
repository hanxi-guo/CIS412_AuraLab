import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  ArrowUp, 
  FileText, 
  Image as ImageIcon, 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  X,
} from 'lucide-react';

// --- Limits & Config ---

const MAX_CAMPAIGN_NAME_LENGTH = 50;
const MAX_TITLE_LENGTH = 40;
const MAX_CAPTION_LENGTH = 500;
const MAX_BRIEF_LENGTH = 800;
const MAX_IMAGES_PER_POST = 10;
const MAX_REFERENCES_PER_CAMPAIGN = 5;

// --- Types & Interfaces ---

interface Post {
  id: number;
  title: string;
  images: string[];
  caption?: string;
}

interface PostDraft {
  title: string;
  text: string;
  images: string[];
  files: File[];
}

interface ReferenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface ThemeConfig {
  bg: string;
  sidebar: string;
  card: string;
  accent: string;
  accentHover: string;
  textMain: string;
  textSec: string;
  border: string;
  inputBg: string;
}

type TabType = 'preview' | 'analysis';

interface Campaign {
  id: string;
  name: string;
  posts: Post[];
  references: ReferenceFile[];
  brief?: string;
}

interface SidebarProps {
  campaigns: Campaign[];
  filteredCampaigns: Campaign[];
  selectedCampaignId: string;
  onSelectCampaign: (id: string) => void;
  onNewCampaign: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDeleteCampaign: (id: string) => void;
  onRenameCampaign: (id: string, newName: string) => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PostDraft) => void;
  campaignName: string;
  existingPost?: Post | null;
}

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// --- Data & Constants ---

const THEME: ThemeConfig = {
  bg: 'bg-[#EBE7DE]', // Main background
  sidebar: 'bg-[#DED9CD]', // Sidebar slightly darker
  card: 'bg-[#F4F1EA]', // Card/Modal background
  accent: 'bg-[#C27A70]', // Reddish/Brown button
  accentHover: 'hover:bg-[#A6655C]',
  textMain: 'text-[#4A4238]',
  textSec: 'text-[#8C857B]',
  border: 'border-[#D1CBC1]',
  inputBg: 'bg-[#FDFCF8]',
};

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'scenery',
    name: 'Scenery Campaign',
    posts: [],
    references: [],
    brief:
      "This campaign markets a series of seaside scenery paintings. Highlight the beauty of the artwork and the hand-made quality. Do not mention price in any posts.",
  },
  {
    id: 'shoe',
    name: 'Shoe Campaign',
    posts: [],
    references: [],
    brief: '',
  },
  {
    id: 'personal',
    name: 'Personal Posts',
    posts: [],
    references: [],
    brief: '',
  },
];

// --- Components ---

const Sidebar: React.FC<SidebarProps> = ({
  campaigns,
  filteredCampaigns,
  selectedCampaignId,
  onSelectCampaign,
  onNewCampaign,
  searchTerm,
  onSearchChange,
  onDeleteCampaign,
  onRenameCampaign,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const showEmptyState = filteredCampaigns.length === 0 && campaigns.length > 0;

  useEffect(() => {
    // Reset menus when search changes to avoid weird states
    setMenuOpenId(null);
    setRenamingId(null);
    setRenameValue('');
  }, [searchTerm]);

  const startRename = (campaign: Campaign) => {
    setRenamingId(campaign.id);
    setRenameValue(campaign.name);
    setMenuOpenId(null);
  };

  const commitRename = (campaignId: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) {
      setRenameValue('');
      return;
    }
    if (trimmed.length > MAX_CAMPAIGN_NAME_LENGTH) {
      alert(`Campaign name is limited to ${MAX_CAMPAIGN_NAME_LENGTH} characters.`);
    }
    const safe = trimmed.slice(0, MAX_CAMPAIGN_NAME_LENGTH);
    onRenameCampaign(campaignId, safe);
  };

  return (
    <div className={`w-64 h-screen flex-shrink-0 ${THEME.sidebar} flex flex-col p-6 font-sans`}>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          type="text" 
          placeholder="Search campaigns" 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-full bg-[#EDEAE3] border border-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#C27A70] text-sm placeholder-gray-500 transition-all"
        />
      </div>

      {/* New Campaign Button */}
      <button 
        onClick={onNewCampaign}
        className={`${THEME.accent} ${THEME.accentHover} text-white rounded-xl py-3 px-4 flex items-center justify-between shadow-sm mb-4 transition-colors`}
      >
        <span className="font-medium">New Campaign</span>
        <Plus className="w-5 h-5" />
      </button>

      {/* Campaign List (scrollable) */}
      <nav className="mt-2 flex-1 overflow-y-auto space-y-2 pr-1">
        {showEmptyState && (
          <div className="text-xs text-[#8C857B] italic px-1">
            No campaigns match “{searchTerm}”.
          </div>
        )}

        {filteredCampaigns.map((campaign) => {
          const isActive = campaign.id === selectedCampaignId;

          return (
            <div
              key={campaign.id}
              className={`relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl shadow-sm ${
                isActive
                  ? 'bg-[#F4F1EA] text-[#4A4238] font-medium'
                  : 'text-[#6B6359] hover:bg-[#E6E2D8]'
              }`}
            >
              {/* Name / Rename */}
              {renamingId === campaign.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > MAX_CAMPAIGN_NAME_LENGTH) {
                      alert(
                        `Campaign name cannot exceed ${MAX_CAMPAIGN_NAME_LENGTH} characters.`
                      );
                    }
                    setRenameValue(value.slice(0, MAX_CAMPAIGN_NAME_LENGTH));
                  }}
                  onBlur={() => commitRename(campaign.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename(campaign.id);
                    } else if (e.key === 'Escape') {
                      setRenamingId(null);
                      setRenameValue('');
                    }
                  }}
                  className="flex-1 bg-white/80 border border-[#D1CBC1] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#C27A70]"
                />
              ) : (
                <button
                  onClick={() => onSelectCampaign(campaign.id)}
                  className="flex-1 text-left px-1 py-1 rounded-lg focus:outline-none truncate"
                  title={campaign.name}
                >
                  {campaign.name}
                </button>
              )}

              {/* Options menu trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId((prev) => (prev === campaign.id ? null : campaign.id));
                }}
                className="p-1 rounded-full hover:bg-black/5 text-[#8C857B]"
                aria-label={`Options for ${campaign.name}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Options menu */}
              {menuOpenId === campaign.id && (
                <div className="absolute right-2 top-10 z-30 bg-white rounded-xl shadow-lg border border-[#E6E2D8] text-xs py-1">
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 hover:bg-[#F4F1EA]"
                    onClick={() => startRename(campaign)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 hover:bg-[#F4F1EA] text-red-600"
                    onClick={() => {
                      setMenuOpenId(null);
                      onDeleteCampaign(campaign.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );          
        })}
      </nav>
    </div>
  );
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSave,
  campaignName,
  existingPost,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTitle(existingPost?.title ?? '');
      setText(existingPost?.caption ?? '');
      setImagePreviewUrls(existingPost?.images ?? []);
      setFiles([]);
      setCurrentImageIndex(0);
      setActiveTab('preview');
    }
  }, [isOpen, existingPost]);

  useEffect(() => {
    if (currentImageIndex >= imagePreviewUrls.length) {
      setCurrentImageIndex(0);
    }
  }, [imagePreviewUrls, currentImageIndex]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const existingCount = imagePreviewUrls.length;
    if (existingCount >= MAX_IMAGES_PER_POST) {
      alert(`You can upload up to ${MAX_IMAGES_PER_POST} images per post.`);
      return;
    }

    const remaining = MAX_IMAGES_PER_POST - existingCount;
    const selectedFiles = Array.from(fileList).slice(0, remaining);

    if (selectedFiles.length < fileList.length) {
      alert(`Only the first ${remaining} images were added (limit is ${MAX_IMAGES_PER_POST}).`);
    }

    const newUrls: string[] = [];
    selectedFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      newUrls.push(url);
    });

    setFiles((prev) => [...prev, ...selectedFiles]);
    setImagePreviewUrls((prev) => [...prev, ...newUrls]);
    setCurrentImageIndex(0);

    // Reset input so selecting the same file again works
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setCurrentImageIndex(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

    // Basic validation: avoid empty posts
    if (!trimmedTitle && !trimmedText && imagePreviewUrls.length === 0) {
      alert('Please add a title, caption, or at least one image before saving.');
      return;
    }

    onSave({
      title: trimmedTitle,
      text: trimmedText,
      images: imagePreviewUrls,
      files,
    });
  };

  const canSave = !!title.trim() || !!text.trim() || imagePreviewUrls.length > 0;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > MAX_TITLE_LENGTH) {
      alert(`Title cannot exceed ${MAX_TITLE_LENGTH} characters.`);
    }
    setTitle(value.slice(0, MAX_TITLE_LENGTH));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > MAX_CAPTION_LENGTH) {
      alert(`Caption cannot exceed ${MAX_CAPTION_LENGTH} characters.`);
    }
    setText(value.slice(0, MAX_CAPTION_LENGTH));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className={`${THEME.card} w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl flex overflow-hidden relative`}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>

        {/* Left Panel: Editor */}
        <form
          onSubmit={handleSubmit}
          className="w-1/2 p-10 border-r border-[#E6E1D6] flex flex-col overflow-y-auto"
        >
          <h2 className={`text-3xl font-semibold ${THEME.textMain} mb-8`}>
            {campaignName}
          </h2>
                  
          {/* Title Input */}
          <div className="mb-2">
            <input 
              type="text" 
              placeholder="Title" 
              value={title}
              onChange={handleTitleChange}
              className={`w-full text-2xl font-medium bg-transparent border-2 ${THEME.border} rounded-xl px-4 py-3 focus:outline-none focus:border-[#C27A70] placeholder-[#A39D93]`}
            />
            <div className="mt-1 text-xs text-right text-[#8C857B]">
              {title.length}/{MAX_TITLE_LENGTH}
            </div>
          </div>

          {/* Text Area */}
          <div className="flex-1 mb-6 min-h-[200px]">
            <div className={`w-full h-full border-2 ${THEME.border} rounded-2xl p-4 bg-white`}>
              <textarea 
                placeholder="Text" 
                value={text}
                onChange={handleTextChange}
                className="w-full h-full resize-none focus:outline-none text-lg placeholder-[#A39D93]"
              ></textarea>
            </div>
            <div className="mt-1 text-xs text-right text-[#8C857B]">
              {text.length}/{MAX_CAPTION_LENGTH}
            </div>
          </div>

          {/* Media Attachments */}
          <div className="h-48">
            <div className={`w-full h-full border-2 ${THEME.border} rounded-2xl p-4 bg-white flex flex-col`}>
              <span className="text-[#A39D93] mb-2 block">Media attachments</span>
              <label className="flex-1 border-2 border-dashed border-[#E6E1D6] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-8 h-8 text-[#D1CBC1] mx-auto mb-2" />
                <span className="text-sm text-[#A39D93]">
                  {imagePreviewUrls.length > 0
                    ? `Add more images (${imagePreviewUrls.length}/${MAX_IMAGES_PER_POST})`
                    : `Click to upload up to ${MAX_IMAGES_PER_POST} images`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>

              {/* Small thumbnail strip for removing images */}
              {imagePreviewUrls.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {imagePreviewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                      <img
                        src={url}
                        alt={`preview-${idx}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={!canSave}
              className={`px-5 py-2 text-sm rounded-full text-white ${THEME.accent} ${THEME.accentHover} disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              Save Post
            </button>
          </div>
        </form>

        {/* Right Panel: Preview / Analysis */}
        <div className={`w-1/2 p-10 ${THEME.sidebar} flex flex-col`}>
          
          {/* Toggle Switch */}
          <div className="flex justify-center mb-8">
            <div className="bg-[#EBE7DE] p-1 rounded-full flex shadow-inner">
              <button 
                onClick={() => setActiveTab('preview')}
                className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-[#8C857B] text-white shadow-sm' : 'text-[#8C857B] hover:text-[#4A4238]'}`}
              >
                Preview
              </button>
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'analysis' ? 'bg-[#8C857B] text-white shadow-sm' : 'text-[#8C857B] hover:text-[#4A4238]'}`}
              >
                Analysis
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'preview' ? (
              // PREVIEW TAB
              <div className="bg-white rounded-xl shadow-sm max-w-md mx-auto overflow-hidden">
                {/* Post Header */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D1CBC1] flex items-center justify-center text-[11px] font-semibold text-white">
                      Y
                    </div>
                    <span className="text-sm font-semibold">you</span>
                  </div>
                  <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </div>
                
                {/* Post Image Carousel */}
                <div className="relative aspect-square bg-gray-100">
                  {imagePreviewUrls.length > 0 ? (
                    <>
                      <img
                        src={imagePreviewUrls[currentImageIndex]}
                        alt={`preview-${currentImageIndex}`}
                        className="w-full h-full object-cover"
                      />
                      {imagePreviewUrls.length > 1 && (
                        <>
                          {/* Left/Right controls */}
                          <button
                            type="button"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === 0 ? imagePreviewUrls.length - 1 : prev - 1
                              )
                            }
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
                            onClick={() =>
                              setCurrentImageIndex((prev) =>
                                prev === imagePreviewUrls.length - 1 ? 0 : prev + 1
                              )
                            }
                          >
                            ›
                          </button>

                          {/* Dots */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {imagePreviewUrls.map((_, idx) => (
                              <span
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  idx === currentImageIndex ? 'bg-white' : 'bg-white/40'
                                }`}
                              ></span>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 px-4 text-center">
                      No image selected — upload images on the left to see them here.
                    </div>
                  )}
                </div>

                {/* Actions & Caption */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-4">
                      <Heart className="w-6 h-6 text-gray-800" />
                      <MessageCircle className="w-6 h-6 text-gray-800" />
                      <Send className="w-6 h-6 text-gray-800" />
                    </div>
                    <Bookmark className="w-6 h-6 text-gray-800" />
                  </div>
                  
                  <div className="text-sm font-semibold mb-1">0 likes</div>
                  <div className="text-sm break-words max-h-32 overflow-y-auto pr-1">
                    <span className="font-semibold mr-2">you</span>
                    {text || <span className="text-gray-400">Caption will appear here…</span>}
                  </div>
                  
                  <div className="text-[10px] text-gray-400 uppercase mt-3">
                    draft • not posted
                  </div>
                </div>
              </div>
            ) : (
              // ANALYSIS TAB (still static placeholder for now)
              <div className="bg-[#EBE7DE] rounded-2xl p-8 shadow-sm h-full">
                <p className="text-[#4A4238] font-medium text-lg mb-6">
                  Overall Sentiment is good. Could improve in:
                </p>
                
                <ol className="list-decimal list-inside space-y-4 text-[#6B6359]">
                  <li className="pl-2">Engagement rate may be lower than average for similar posts.</li>
                  <li className="pl-2">Color contrast could be higher to stand out in feed.</li>
                  <li className="pl-2">Caption length is good; experiment with more emotive language.</li>
                </ol>

                <div className="mt-8 pt-8 border-t border-[#D1CBC1]">
                  <p className="text-[#4A4238] mb-2">Image clarity</p>
                  <div className="h-2 w-full bg-[#D1CBC1] rounded-full overflow-hidden">
                     <div className="h-full w-[70%] bg-[#C27A70]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      ></div>

      <div className={`${THEME.card} relative w-full max-w-sm rounded-2xl shadow-xl p-6`}>
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <h2 className={`text-lg font-semibold mb-3 ${THEME.textMain}`}>{title}</h2>
        <p className={`text-sm mb-6 ${THEME.textSec}`}>{message}</p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-full border border-[#D1CBC1] text-[#6B6359] hover:bg-[#E6E2D8] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-full text-white ${THEME.accent} ${THEME.accentHover}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const NewCampaignModal: React.FC<NewCampaignModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CAMPAIGN_NAME_LENGTH) {
      alert(`Campaign name cannot exceed ${MAX_CAMPAIGN_NAME_LENGTH} characters.`);
    }
    onCreate(trimmed.slice(0, MAX_CAMPAIGN_NAME_LENGTH));
    setName('');
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      <form
        onSubmit={handleSubmit}
        className={`${THEME.card} relative w-full max-w-md rounded-2xl shadow-xl p-6`}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <h2 className={`text-xl font-semibold mb-4 ${THEME.textMain}`}>
          New Campaign
        </h2>

        <label className="block text-sm mb-2 text-[#6B6359]">
          Campaign name
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length > MAX_CAMPAIGN_NAME_LENGTH) {
              alert(`Campaign name cannot exceed ${MAX_CAMPAIGN_NAME_LENGTH} characters.`);
            }
            setName(value.slice(0, MAX_CAMPAIGN_NAME_LENGTH));
          }}
          placeholder="e.g. Spring 2025 Launch"
          className="w-full rounded-xl border border-[#D1CBC1] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C27A70]/40 bg-white text-sm"
        />
        <div className="mt-1 text-xs text-right text-[#8C857B]">
          {name.length}/{MAX_CAMPAIGN_NAME_LENGTH}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-full border border-[#D1CBC1] text-[#6B6359] hover:bg-[#E6E2D8] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className={`px-5 py-2 text-sm rounded-full text-white ${THEME.accent} ${THEME.accentHover} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Main App Component ---

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

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0];

  const handleSavePost = (data: PostDraft) => {
    if (!selectedCampaign) return;

    // EDIT mode
    if (editingPost) {
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
      // CREATE mode
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

  const handleDeleteCampaign = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;
    setCampaignPendingDelete(campaign);
  };

  const confirmDeleteCampaign = () => {
    if (!campaignPendingDelete) return;

    const id = campaignPendingDelete.id;

    if (campaigns.length <= 1) {
      alert('You need at least one campaign.');
      setCampaignPendingDelete(null);
      return;
    }

    setCampaigns((prev) => prev.filter((c) => c.id !== id));

    if (selectedCampaignId === id) {
      const remaining = campaigns.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setSelectedCampaignId(remaining[0].id);
      }
    }

    setCampaignPendingDelete(null);
  };

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
        <div className="flex-1 overflow-y-auto p-8 pb-32">
          
          {/* Header */}
          <div className="flex justify-between items-end mb-6">
            <h1 className={`text-4xl font-bold ${THEME.textMain} truncate`} title={selectedCampaign?.name}>
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
                  // reset so re-selecting same file works
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Brief / Description Box */}
          <div className={`w-full border border-[#5A5248] rounded-3xl p-6 mb-8 ${THEME.card} text-[#4A4238]`}>
            {selectedCampaign && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wide uppercase text-[#8C857B]">
                  Campaign Brief
                </label>
                <textarea
                  value={briefValue}
                  onChange={(e) => handleUpdateCampaignBrief(selectedCampaign.id, e.target.value)}
                  placeholder="Click here to add a brief for this campaign: goals, key messages, and any constraints (e.g., no pricing, tone, hashtags)."
                  className="w-full bg-transparent border border-[#D1CBC1] rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#C27A70] focus:bg-white/80 resize-none min-h-[80px] max-h-40 overflow-y-auto placeholder:text-[#A39D93]"
                />
                <div className="text-xs text-right text-[#8C857B]">
                  {briefValue.length}/{MAX_BRIEF_LENGTH}
                </div>
              </div>
            )}
          </div>

          {/* Posts Grid */}
          {postsForSelected.length === 0 ? (
            <div className="text-center text-[#8C857B] text-sm mt-12">
              <p>No posts yet in this campaign.</p>
              <p className="mt-1">Click the bottom composer to start drafting a new post using the editor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {postsForSelected.map((post) => {
                const hasImages = post.images && post.images.length > 0;
                const isMultiImage = post.images && post.images.length > 1;

                return (
                  <div 
                    key={post.id} 
                    className={`${THEME.card} relative p-3 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow`}
                  >
                    {/* delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="absolute top-3 right-3 p-1 rounded-full bg-white/80 hover:bg-white shadow-sm"
                      aria-label={`Delete ${post.title}`}
                    >
                      <X className="w-3 h-3 text-[#8C857B]" />
                    </button>

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
            </div>
          )}
        </div>

        {/* Floating Bottom Input */}
        <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-center pointer-events-none">
          <div className="w-full max-w-2xl pointer-events-auto">
            <div className="relative">
               <input 
                type="text"
                placeholder="Make a new post here"
                className="w-full pl-6 pr-14 py-4 rounded-full bg-white/90 backdrop-blur shadow-lg border border-[#E6E1D6] focus:outline-none focus:ring-2 focus:ring-[#C27A70]/20 placeholder-gray-400"
                onClick={() => {
                  setEditingPost(null);
                  setIsModalOpen(true);
                }}
               />
               <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-[#8C857B] text-white flex items-center justify-center hover:bg-[#6B6359] transition-colors"
                onClick={() => {
                  setEditingPost(null);
                  setIsModalOpen(true);
                }}
               >
                 <ArrowUp className="w-5 h-5" />
               </button>
            </div>
          </div>
        </div>

      </main>

      {/* Post Editor Modal */}
      <Modal
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
