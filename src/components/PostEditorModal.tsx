import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import type { Post, PostDraft } from '../types';
import {
  MAX_CAPTION_LENGTH,
  MAX_IMAGES_PER_POST,
  MAX_TITLE_LENGTH,
  THEME,
} from '../config';
import SocialPreview from './SocialPreview';
import type { PreviewPlatform } from './SocialPreview';

type UnderlineLevel = 'minor' | 'major';

interface AnalyzedSentence {
  id: number;
  text: string;
  level: UnderlineLevel;
}

interface PostEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PostDraft) => void;
  campaignName: string;
  existingPost?: Post | null;
}

const PLACEHOLDER_CONTENT: Record<UnderlineLevel, { analysis: string; suggestions: string[] }> = {
  minor: {
    analysis:
      'Minor error: this sentence could be sharper, more specific, or more on-brand.',
    suggestions: [
      'Placeholder orange suggestion 1: a slightly punchier version of this sentence.',
      'Placeholder orange suggestion 2: a clearer, more concise rewrite for mid-level tone.',
      'Placeholder orange suggestion 3: a more engaging, audience-focused version.',
    ],
  },
  major: {
    analysis:
      'Major error: this sentence feels off-tone, unclear, or weak. It likely needs a stronger rewrite.',
    suggestions: [
      'Placeholder red suggestion 1: a bold, concise alternative with a clearer message.',
      'Placeholder red suggestion 2: a more confident and direct rewrite for this idea.',
      'Placeholder red suggestion 3: a more audience-centric phrasing with a clear hook.',
    ],
  },
};

const PostEditorModal: React.FC<PostEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  campaignName,
  existingPost,
}) => {
  const [title, setTitle] = useState(existingPost?.title ?? '');
  const [text, setText] = useState(existingPost?.caption ?? '');
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(existingPost?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] =
    useState<PreviewPlatform>('instagram');

  // sentence-level “analysis”
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [sentences, setSentences] = useState<AnalyzedSentence[]>([]);
  const [hoveredSentenceId, setHoveredSentenceId] = useState<number | null>(
    null
  );
  const [selectedSentenceId, setSelectedSentenceId] = useState<number | null>(
    null
  );
  const idleTimerRef = useRef<number | null>(null);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  // --- sentence splitting + fake analysis ---
  const splitIntoSentences = (input: string): string[] => {
    const result: string[] = [];
    let current = '';

    const separators = new Set(['.', '!', '?', '\n']);

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      current += ch;

      if (separators.has(ch)) {
        // look ahead to swallow consecutive separators/spaces/newlines
        while (
          i + 1 < input.length &&
          (separators.has(input[i + 1]) || input[i + 1] === ' ')
        ) {
          i++;
          current += input[i];
        }
        result.push(current);
        current = '';
      }
    }

    if (current.trim().length > 0) {
      result.push(current);
    }

    if (result.length === 0 && input.trim().length > 0) {
      return [input];
    }

    return result;
  };

  const runSentenceAnalysis = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setHasAnalysis(false);
      setSentences([]);
      setSelectedSentenceId(null);
      return;
    }

    const rawSentences = splitIntoSentences(text);
    const levels: UnderlineLevel[] = ['minor', 'major'];

    const analyzed: AnalyzedSentence[] = rawSentences.map((s, idx) => {
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];
      return {
        id: idx,
        text: s,
        level: randomLevel,
      };
    });

    setSentences(analyzed);
    setHasAnalysis(true);
    setSelectedSentenceId(null);
  };

  const scheduleIdleAnalysis = () => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      runSentenceAnalysis();
    }, 10000); // 10 seconds
  };

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
      alert(
        `Only the first ${remaining} images were added (limit is ${MAX_IMAGES_PER_POST}).`
      );
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

    // user is typing → clear existing analysis and schedule a new one
    setHasAnalysis(false);
    setSentences([]);
    setHoveredSentenceId(null);
    setSelectedSentenceId(null);
    scheduleIdleAnalysis();
  };

  const handleCaptionBlur = () => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    runSentenceAnalysis();
  };

  const colorForLevel = (level: UnderlineLevel): string => {
    if (level === 'minor') return '#f59e0b';
    return '#dc2626';
  };

  const bgForLevel = (level: UnderlineLevel): string => {
    if (level === 'minor') return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(220, 38, 38, 0.12)';
  };

  const labelForLevel = (level: UnderlineLevel): string =>
    level === 'minor' ? 'Minor error' : 'Major error';

  const handleHighlightedClick = () => {
    // clicking the analyzed area (but not a specific sentence) goes back to raw textarea
    setHasAnalysis(false);
    setHoveredSentenceId(null);
    setSelectedSentenceId(null);
  };

  const handleSentenceClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    sentenceId: number
  ) => {
    e.stopPropagation(); // prevent closing analysis view
    setSelectedSentenceId(sentenceId);
  };

  const selectedSentence =
    selectedSentenceId !== null
      ? sentences.find((s) => s.id === selectedSentenceId) ?? null
      : null;

  const handleSuggestionClick = (suggestion: string) => {
    if (!selectedSentence) return;

    const updated: AnalyzedSentence[] = sentences.map(
      (s): AnalyzedSentence =>
        s.id === selectedSentence.id
          ? {
              ...s,
              text: suggestion,
              level: 'minor', // after choosing a suggestion, mark as improved
            }
          : s
    );
    setSentences(updated);

    // sync back to main text; here we just join with a space
    const newText = updated.map((s) => s.text).join(' ');
    setText(newText);

    setSelectedSentenceId(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div
        className={`${THEME.card} w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl flex overflow-hidden relative`}
      >
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
          <h2 className={`text-3xl font-semibold ${THEME.textMain} leading-[1.2] pb-1 mb-8`}>
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

          {/* Text Area + Highlighted Sentences */}
          <div className="flex-1 mb-6 min-h-[200px]">
            <div
              className={`relative w-full h-full border-2 ${THEME.border} rounded-2xl bg-white`}
            >
              {!hasAnalysis && (
                <textarea
                  placeholder="Text"
                  value={text}
                  onChange={handleTextChange}
                  onBlur={handleCaptionBlur}
                  className="w-full h-full resize-none focus:outline-none text-lg placeholder-[#A39D93] px-4 py-4"
                ></textarea>
              )}

              {hasAnalysis && (
                <div
                  className="absolute inset-0 px-4 py-4 text-lg whitespace-pre-wrap overflow-auto cursor-text"
                  onClick={handleHighlightedClick}
                >
                  {sentences.length > 0
                    ? sentences.map((s) => {
                        const underlineColor = colorForLevel(s.level);
                        const isHovered = hoveredSentenceId === s.id;
                        return (
                          <span
                            key={s.id}
                            onMouseEnter={() => setHoveredSentenceId(s.id)}
                            onMouseLeave={() => setHoveredSentenceId(null)}
                            onClick={(e) => handleSentenceClick(e, s.id)}
                            style={{
                              textDecorationLine: 'underline',
                              textDecorationStyle: 'wavy',
                              textDecorationColor: underlineColor,
                              backgroundColor: isHovered
                                ? bgForLevel(s.level)
                                : 'transparent',
                              transition: 'background-color 120ms ease-out',
                              cursor: 'pointer',
                            }}
                          >
                            {s.text}
                          </span>
                        );
                      })
                    : text}
                </div>
              )}
            </div>
            <div className="mt-1 text-xs text-right text-[#8C857B]">
              {text.length}/{MAX_CAPTION_LENGTH}
            </div>
          </div>

          {/* Media Attachments */}
          <div className="h-48">
            <div
              className={`w-full h-full border-2 ${THEME.border} rounded-2xl p-4 bg-white flex flex-col`}
            >
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

              {imagePreviewUrls.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {imagePreviewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0"
                    >
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

        {/* Right Panel: Platform Preview (split out) */}
        <SocialPreview
          previewPlatform={previewPlatform}
          onChangePlatform={setPreviewPlatform}
          text={text}
          imagePreviewUrls={imagePreviewUrls}
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
        />

        {/* Sentence Analysis Popup */}
        {selectedSentence && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            {/* Popup backdrop (inside the card) */}
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setSelectedSentenceId(null)}
            />
            <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Sentence feedback
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSentenceId(null)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-3">
                “{selectedSentence.text.trim()}”
              </p>
              <div className="mb-3">
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full ${
                    selectedSentence.level === 'minor'
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-[#FEE2E2] text-[#991B1B]'
                  }`}
                >
                  {labelForLevel(selectedSentence.level)}
                </span>
              </div>

              <p className="text-sm text-gray-800 mb-4">
                {PLACEHOLDER_CONTENT[selectedSentence.level].analysis}
              </p>

              {PLACEHOLDER_CONTENT[selectedSentence.level].suggestions.length >
                0 && (
                <>
                  <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2 uppercase">
                    Try one of these rewrites:
                  </p>
                  <div className="flex flex-col gap-2">
                    {PLACEHOLDER_CONTENT[selectedSentence.level].suggestions.map(
                      (sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSuggestionClick(sug)}
                          className="w-full text-left text-sm border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          {sug}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostEditorModal;
