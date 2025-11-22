import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  RefreshCw,
  X,
} from 'lucide-react';
import type { Post, PostDraft, TabType } from '../types';
import {
  MAX_CAPTION_LENGTH,
  MAX_IMAGES_PER_POST,
  MAX_TITLE_LENGTH,
  THEME,
} from '../config';

type PreviewPlatform = 'instagram' | 'facebook' | 'twitter';

interface PostEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PostDraft) => void;
  campaignName: string;
  existingPost?: Post | null;
}

const PostEditorModal: React.FC<PostEditorModalProps> = ({
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
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('instagram');
  const [analysisVersion, setAnalysisVersion] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTitle(existingPost?.title ?? '');
      setText(existingPost?.caption ?? '');
      setImagePreviewUrls(existingPost?.images ?? []);
      setFiles([]);
      setCurrentImageIndex(0);
      setActiveTab('preview');
      setPreviewPlatform('instagram');
      setAnalysisVersion(0);
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
        {/* Preview platform selector */}
        <div className="mb-4">
        <span className="block text-xs font-semibold tracking-wide uppercase text-[#8C857B] mb-2">
            Preview as
        </span>
        <div className="inline-flex rounded-full bg-[#EBE7DE] p-1 gap-1">
            {(['instagram', 'facebook', 'twitter'] as PreviewPlatform[]).map((platform) => {
            const label =
                platform === 'instagram'
                ? 'Instagram'
                : platform === 'facebook'
                ? 'Facebook'
                : 'Twitter';
            const isActive = previewPlatform === platform;
            return (
                <button
                key={platform}
                type="button"
                onClick={() => setPreviewPlatform(platform)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    isActive
                    ? 'bg-[#8C857B] text-white shadow-sm'
                    : 'text-[#6B6359] hover:text-[#4A4238]'
                }`}
                >
                {label}
                </button>
            );
            })}
        </div>
        </div>

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
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'preview'
                    ? 'bg-[#8C857B] text-white shadow-sm'
                    : 'text-[#8C857B] hover:text-[#4A4238]'
                }`}
              >
                Preview
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('analysis')}
                className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'analysis'
                    ? 'bg-[#8C857B] text-white shadow-sm'
                    : 'text-[#8C857B] hover:text-[#4A4238]'
                }`}
              >
                Analysis
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
          {activeTab === 'preview' ? (
            // PREVIEW TAB
            <div className="max-w-md mx-auto">
                {previewPlatform === 'instagram' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* IG header */}
                    <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#D1CBC1] flex items-center justify-center text-[11px] font-semibold text-white">
                        Y
                        </div>
                        <span className="text-sm font-semibold">you</span>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                    </div>

                    {/* IG carousel */}
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

                    {/* IG actions & caption */}
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
                    <div className="text-sm break-words whitespace-pre-wrap max-h-32 overflow-y-auto pr-1">
                        <span className="font-semibold mr-2">you</span>
                        {text || <span className="text-gray-400">Caption will appear here…</span>}
                    </div>
                    </div>
                </div>
                )}

                {previewPlatform === 'facebook' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* FB header */}
                    <div className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#D1CBC1] flex items-center justify-center text-[11px] font-semibold text-white">
                        Y
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">You</span>
                        <span className="text-[11px] text-gray-400">Just now · Public</span>
                    </div>
                    </div>

                    {/* FB text */}
                    <div className="px-3 pb-3 text-sm whitespace-pre-wrap break-words">
                    {text || <span className="text-gray-400">Write something for your post…</span>}
                    </div>

                    {/* FB image(s) */}
                    <div className="relative bg-gray-100 max-h-80 overflow-hidden flex items-center justify-center">
                    {imagePreviewUrls.length > 0 ? (
                        <>
                        <img
                            src={imagePreviewUrls[currentImageIndex]}
                            alt={`facebook-preview-${currentImageIndex}`}
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

                </div>
                )}

                {previewPlatform === 'twitter' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#E6E1D6]">
                    {/* Twitter header */}
                    <div className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#D1CBC1] flex items-center justify-center text-[11px] font-semibold text-white">
                        Y
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">you</span>
                        <span className="text-[11px] text-gray-400">@yourhandle · now</span>
                    </div>
                    </div>

                    {/* Tweet text */}
                    <div className="px-3 pb-3 text-sm whitespace-pre-wrap break-words">
                    {text || (
                        <span className="text-gray-400">
                        Your tweet copy will appear here…
                        </span>
                    )}
                    </div>

                    {/* Tweet image(s) */}
                    <div className="relative bg-gray-100 max-h-80 overflow-hidden flex items-center justify-center">
                    {imagePreviewUrls.length > 0 ? (
                        <>
                        <img
                            src={imagePreviewUrls[currentImageIndex]}
                            alt={`twitter-preview-${currentImageIndex}`}
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
                </div>
                )}
            </div>
            ) : (
            // ANALYSIS TAB
            <div className="bg-[#EBE7DE] rounded-2xl p-8 shadow-sm h-full">
                <div className="flex items-center justify-between mb-4">
                <p className="text-[#4A4238] font-medium text-lg">
                    Caption analysis (placeholder)
                </p>
                <button
                    type="button"
                    onClick={() => setAnalysisVersion((v) => v + 1)}
                    className="p-2 rounded-full hover:bg-black/5 text-[#6B6359]"
                    aria-label="Refresh analysis"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                </div>

                <ol className="list-decimal list-inside space-y-4 text-[#6B6359] text-sm">
                <li className="pl-2">
                    Opening line is clear and positive. Consider adding one more concrete detail to
                    make the scene more vivid.
                </li>
                <li className="pl-2">
                    Tone is friendly and descriptive. Try a short call-to-action for higher
                    engagement (e.g., “Which view would you hang above your desk?”).
                </li>
                <li className="pl-2">
                    Length is within a comfortable range for mobile reading. Hashtags and emojis can
                    be added later per channel guidelines.
                </li>
                </ol>

                <p className="mt-6 text-[11px] text-[#8C857B]">
                Analysis version #{analysisVersion + 1} · In a real system this would refresh based
                on your latest caption and media.
                </p>
            </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PostEditorModal;
