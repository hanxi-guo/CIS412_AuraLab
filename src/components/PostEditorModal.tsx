import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import type { CampaignBrief, Post, PostDraft, AnalysisSpan, AnalysisSuggestion } from '../types';
import {
  MAX_CAPTION_LENGTH,
  MAX_IMAGES_PER_POST,
  MAX_TITLE_LENGTH,
  THEME,
} from '../config';
import SocialPreview from './SocialPreview';
import type { PreviewPlatform } from './SocialPreview';
import { runDraftAnalysis } from '../api';

type Severity = 'minor' | 'major' | 'blocker';

interface MappedSpan extends AnalysisSpan {
  start: number;
  end: number;
}

interface PostEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PostDraft) => void;
  campaignName: string;
  campaignBrief?: CampaignBrief;
  existingPost?: Post | null;
}

// TipTap-style highlight colors
const bgForSeverity = (level: Severity): string => {
  if (level === 'minor') {
    // Standard orange
    return 'rgba(255, 165, 0, 0.6)';
  }
  // Red/pink for major issues
  return 'rgba(254, 202, 202, 0.6)';
};


const labelForSeverity = (level: Severity): string =>
  level === 'minor' ? 'Minor issue' : level === 'major' ? 'Major issue' : 'Blocker';

const mapSpansToRanges = (text: string, spans: AnalysisSpan[]): MappedSpan[] => {
  const used: Array<[number, number]> = [];
  const results: MappedSpan[] = [];

  const overlaps = (start: number, end: number): boolean =>
    used.some(([s, e]) => !(end <= s || start >= e));

  const findSlot = (needle: string): { start: number; end: number } | null => {
    if (!needle) return null;
    let idx = 0;
    while (idx < text.length) {
      const found = text.indexOf(needle, idx);
      if (found === -1) return null;
      const end = found + needle.length;
      if (!overlaps(found, end)) {
        used.push([found, end]);
        return { start: found, end };
      }
      idx = found + 1;
    }
    return null;
  };

  spans.forEach((span) => {
    const startOffset = span.start_offset;
    const endOffset = span.end_offset;
    
    // Verify that the offset matches the actual text content
    if (
      typeof startOffset === 'number' &&
      typeof endOffset === 'number' &&
      startOffset >= 0 &&
      endOffset > startOffset &&
      endOffset <= text.length &&
      !overlaps(startOffset, endOffset)
    ) {
      // Check if the text at this offset actually matches what we expect
      const textAtOffset = text.slice(startOffset, endOffset);
      const spanText = span.text || '';
      
      // If the text matches, use the offset
      if (textAtOffset === spanText) {
        used.push([startOffset, endOffset]);
        results.push({
          ...span,
          severity: (span.severity as Severity) || 'minor',
          start: startOffset,
          end: endOffset,
        });
        return;
      }
    }

    // If offset doesn't match or isn't available, search for the text
    const slot = findSlot(span.text || '');
    if (!slot) return;
    results.push({
      ...span,
      severity: (span.severity as Severity) || 'minor',
      start: slot.start,
      end: slot.end,
    });
  });

  return results.sort((a, b) => a.start - b.start);
};

const buildFragments = (text: string, spans: MappedSpan[]) => {
  const fragments: Array<{ key: string; text: string; span?: MappedSpan }> = [];
  let cursor = 0;
  spans.forEach((span) => {
    if (span.start > cursor) {
      fragments.push({ key: `plain-${cursor}`, text: text.slice(cursor, span.start) });
    }
    fragments.push({
      key: `span-${span.id}-${span.start}`,
      text: text.slice(span.start, span.end),
      span,
    });
    cursor = span.end;
  });
  if (cursor < text.length) {
    fragments.push({ key: `plain-tail`, text: text.slice(cursor) });
  }
  return fragments;
};

const PostEditorModal: React.FC<PostEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  campaignName,
  campaignBrief,
  existingPost,
}) => {
  const [title, setTitle] = useState(existingPost?.title ?? '');
  const [text, setText] = useState(existingPost?.caption ?? '');
  
  // Helper function to validate and filter image URLs
  const validateImageUrls = (urls: string[]): string[] => {
    const validated = urls.filter((url) => {
      if (!url || typeof url !== 'string') {
        return false;
      }
      
      // Check if it's just a UUID (invalid)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(url.trim())) {
        return false;
      }
      
      // Check if it's a valid blob URL
      if (url.startsWith('blob:')) {
        // Blob URLs should have format: blob:http://host/uuid or blob:https://host/uuid
        const blobUrlPattern = /^blob:https?:\/\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!blobUrlPattern.test(url)) {
          return false;
        }
        return true;
      }
      
      // Check if it's a valid HTTP/HTTPS URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          new URL(url);
          return true;
        } catch (e) {
          return false;
        }
      }
      
      // Check if it's a valid relative path
      if (url.startsWith('/')) {
        return true;
      }
      
      return false;
    });
    
    return validated;
  };
  
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(() => {
    const initial = existingPost?.images ?? [];
    return validateImageUrls(initial);
  });
  const [files, setFiles] = useState<File[]>([]);

  // Sync imagePreviewUrls when existingPost changes (e.g., after save)
  useEffect(() => {
    if (existingPost?.images) {
      const validated = validateImageUrls(existingPost.images);
      setImagePreviewUrls(validated);
    } else if (!existingPost) {
      // New post - clear images
      setImagePreviewUrls([]);
      setFiles([]);
    }
  }, [existingPost?.id, existingPost?.images?.join(',')]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('instagram');
  const previousPlatformRef = useRef<PreviewPlatform>('instagram');

  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [rawSpans, setRawSpans] = useState<AnalysisSpan[]>([]); // Original spans from API
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [triggerApplyAll, setTriggerApplyAll] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  const initialStateRef = useRef({
    title: existingPost?.title ?? '',
    text: existingPost?.caption ?? '',
    images: existingPost?.images ?? [],
  });
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastAnalyzedTextRef = useRef<string>(existingPost?.caption ?? '');
  const isViewingSpanRef = useRef(false);
  // Cache to avoid re-analyzing same content
  const analysisCacheRef = useRef<Map<string, AnalysisSpan[]>>(new Map());
  // Track all blob URLs we've created to clean them up on unmount
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Undo/Redo state
  const [textHistory, setTextHistory] = useState<string[]>([existingPost?.caption ?? '']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Keyboard shortcuts for undo/redo and apply all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Tab' && !modifier && !e.shiftKey) {
        // Tab: Apply all suggestions
        if (hasAnalysis && rawSpans.length > 0) {
          e.preventDefault();
          setTriggerApplyAll(true);
        }
      } else if (modifier && e.key === 'z' && !e.shiftKey) {
        // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setText(textHistory[newIndex]);
          setSelectedSpanId(null);
          isViewingSpanRef.current = false;
          setHasAnalysis(false);
          setRawSpans([]);
        }
      } else if (modifier && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows)
        e.preventDefault();
        if (historyIndex < textHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setText(textHistory[newIndex]);
          setSelectedSpanId(null);
          isViewingSpanRef.current = false;
          setHasAnalysis(false);
          setRawSpans([]);
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, historyIndex, textHistory, hasAnalysis, rawSpans, text]);

  // Cleanup: release object URLs and abort pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      if (historyTimerRef.current) {
        window.clearTimeout(historyTimerRef.current);
      }
      // Abort any pending analysis request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Release all tracked blob URLs to prevent memory leaks
      // Only clean up on component unmount, not when imagePreviewUrls changes
      blobUrlsRef.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      blobUrlsRef.current.clear();
    };
  }, []); // Empty deps - only run on mount/unmount

  // Sync scroll position between textarea and overlay
  useEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    
    if (!textarea || !overlay) return;
    
    const handleScroll = () => {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    };
    
    textarea.addEventListener('scroll', handleScroll);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, [hasAnalysis]);

  // Re-analyze when platform changes
  useEffect(() => {
    // Skip on initial mount
    if (previousPlatformRef.current === previewPlatform) {
      return;
    }
    
    // Platform changed - trigger re-analysis if there's text
    if (text.trim() && hasAnalysis) {
      // Clear current analysis
      setHasAnalysis(false);
      setRawSpans([]);
      closeSpanPopup();
      
      // Trigger new analysis with new platform
      scheduleAnalysis();
    }
    
    previousPlatformRef.current = previewPlatform;
  }, [previewPlatform, text, hasAnalysis]);

  // Map raw spans to positions in current text (memoized for performance)
  const mappedSpans = useMemo(() => {
    return hasAnalysis ? mapSpansToRanges(text, rawSpans) : [];
  }, [hasAnalysis, text, rawSpans]);

  const fragments = useMemo(() => {
    return hasAnalysis ? buildFragments(text, mappedSpans) : [];
  }, [hasAnalysis, text, mappedSpans]);

  // Effect to handle apply all trigger
  useEffect(() => {
    if (triggerApplyAll && hasAnalysis && mappedSpans.length > 0) {
      // Cancel any pending history push
      if (historyTimerRef.current) {
        window.clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
      
      // Save current state before applying (only once)
      const newHistory = textHistory.slice(0, historyIndex + 1);
      if (newHistory[newHistory.length - 1] !== text) {
        newHistory.push(text);
        setTextHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
      
      // Sort spans by position (reverse order to maintain offsets)
      const sortedSpans = [...mappedSpans].sort((a, b) => b.start - a.start);
      
      let newText = text;
      let appliedCount = 0;
      
      // Apply first suggestion from each span, starting from the end
      for (const span of sortedSpans) {
        if (span.suggestions && span.suggestions.length > 0) {
          const suggestion = span.suggestions[0];
          newText = newText.slice(0, span.start) + suggestion.text + newText.slice(span.end);
          appliedCount++;
        }
      }
      
      if (appliedCount > 0) {
        setText(newText);
        // Save the new text to history immediately after applying
        setTimeout(() => {
          const finalHistory = textHistory.slice(0, historyIndex + 1);
          finalHistory.push(newText);
          setTextHistory(finalHistory);
          setHistoryIndex(finalHistory.length - 1);
        }, 0);
        setSelectedSpanId(null);
        isViewingSpanRef.current = false;
        setHasAnalysis(false);
        setRawSpans([]);
        
        // Schedule analysis - inline to avoid adding runAnalysis to dependencies
        if (idleTimerRef.current) {
          window.clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = window.setTimeout(() => {
          // Re-run analysis after applying suggestions
          const trimmed = newText.trim();
          if (!trimmed) return;
          
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          
          const abortController = new AbortController();
          abortControllerRef.current = abortController;
          
          const reqId = requestCounterRef.current + 1;
          requestCounterRef.current = reqId;
          setIsAnalyzing(true);
          setAnalysisError(null);
          
          runDraftAnalysis({
            title,
            caption: trimmed,
            platform: previewPlatform,
            campaignContext: campaignBrief
              ? {
                  overview: campaignBrief.overview,
                  target_audience: campaignBrief.targetAudience,
                  brand_voice: campaignBrief.brandVoice,
                  guardrails: campaignBrief.guardrails,
                }
              : undefined,
          }, abortController.signal).then(res => {
            if (reqId !== requestCounterRef.current) return;
            const spans = res.spans || [];
            setRawSpans(spans);
            setHasAnalysis(spans.length > 0);
            lastAnalyzedTextRef.current = trimmed;
            if (reqId === requestCounterRef.current) {
              setIsAnalyzing(false);
            }
          }).catch(err => {
            if ((err as Error).name === 'AbortError') return;
            if (reqId !== requestCounterRef.current) return;
            setAnalysisError((err as Error).message);
            setHasAnalysis(false);
            setRawSpans([]);
            lastAnalyzedTextRef.current = trimmed;
            if (reqId === requestCounterRef.current) {
              setIsAnalyzing(false);
            }
          });
        }, 800);
      }
      setTriggerApplyAll(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerApplyAll, hasAnalysis, mappedSpans, text, historyIndex, textHistory]);

  if (!isOpen) return null;

  const isDirty = () => {
    const init = initialStateRef.current;
    const imagesChanged =
      imagePreviewUrls.length !== init.images.length ||
      imagePreviewUrls.some((img, idx) => img !== init.images[idx]);

    return (
      title.trim() !== init.title.trim() ||
      text.trim() !== init.text.trim() ||
      imagesChanged
    );
  };

  // Add to history when making important changes (like AI suggestions)
  const pushToHistory = (newText: string) => {
    // Don't add duplicate entries
    if (textHistory[historyIndex] === newText) {
      return;
    }
    
    const newHistory = textHistory.slice(0, historyIndex + 1);
    newHistory.push(newText);
    setTextHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Schedule saving to history after user stops typing
  const scheduleHistoryPush = (newText: string) => {
    if (historyTimerRef.current) {
      window.clearTimeout(historyTimerRef.current);
    }
    historyTimerRef.current = window.setTimeout(() => {
      pushToHistory(newText);
    }, 1000); // Save to history after 1 second of no typing
  };

  const scheduleAnalysis = () => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    // Fast delay for better responsiveness
    idleTimerRef.current = window.setTimeout(() => {
      runAnalysis();
    }, 500);
  };

  const runAnalysis = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setHasAnalysis(false);
      setRawSpans([]);
      closeSpanPopup();
      lastAnalyzedTextRef.current = '';
      return;
    }

    // Create cache key from content
    const cacheKey = `${trimmed}|${title}|${previewPlatform}`;
    
    // Check cache first
    const cached = analysisCacheRef.current.get(cacheKey);
    if (cached) {
      setRawSpans(cached);
      setHasAnalysis(cached.length > 0);
      lastAnalyzedTextRef.current = trimmed;
      setIsAnalyzing(false);
      return;
    }

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const reqId = requestCounterRef.current + 1;
    requestCounterRef.current = reqId;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisError(null);
    
    // Estimate time based on input tokens
    // Conservative estimate: 3.5 chars = 1 token, ~20ms per token (includes network latency)
    const estimatedTokens = Math.ceil((trimmed.length + title.length) / 3.5);
    const baseTimeMs = estimatedTokens * 20; // 20ms per token (conservative)
    const estimatedTimeMs = Math.max(baseTimeMs, 3000); // Minimum 3 seconds
    const startTime = Date.now();
    
    // Simulate progress with smooth easing
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const linearProgress = (elapsed / estimatedTimeMs) * 100;
      
      // Ease out: fast at start, slow near end
      let progress;
      if (linearProgress < 60) {
        // Fast progress for first 60%
        progress = linearProgress;
      } else if (linearProgress < 85) {
        // Slower for 60-85%
        progress = 60 + (linearProgress - 60) * 0.7;
      } else {
        // Very slow for final 15%, asymptotically approach 95%
        const remaining = 95 - 77.5; // 95 - (60 + 25*0.7)
        progress = 77.5 + remaining * (1 - Math.exp(-(linearProgress - 85) / 30));
      }
      
      setAnalysisProgress(Math.min(progress, 95)); // Cap at 95% until complete
    }, 50); // Update every 50ms for smoother animation

    try {
      const res = await runDraftAnalysis({
        title,
        caption: trimmed,
        platform: previewPlatform,
        campaignContext: campaignBrief
          ? {
              overview: campaignBrief.overview,
              target_audience: campaignBrief.targetAudience,
              brand_voice: campaignBrief.brandVoice,
              guardrails: campaignBrief.guardrails,
            }
          : undefined,
      }, abortController.signal);

      if (reqId !== requestCounterRef.current) {
        clearInterval(progressInterval);
        return;
      }

      // Complete progress animation
      setAnalysisProgress(100);
      
      // Save raw spans (will be mapped to positions on each render)
      const spans = res.spans || [];
      
      // Cache the result
      analysisCacheRef.current.set(cacheKey, spans);
      // Limit cache size to 10 entries
      if (analysisCacheRef.current.size > 10) {
        const firstKey = analysisCacheRef.current.keys().next().value;
        if (firstKey) {
          analysisCacheRef.current.delete(firstKey);
        }
      }
      
      setRawSpans(spans);
      setHasAnalysis(spans.length > 0);
      // Remember the text we just analyzed
      lastAnalyzedTextRef.current = trimmed;
      // Don't clear selectedSpanId if user is viewing a span analysis
      // This prevents the popup from disappearing when background analysis completes
    } catch (err) {
      clearInterval(progressInterval);
      // Don't show error if request was aborted
      if ((err as Error).name === 'AbortError') {
        return;
      }
      if (reqId !== requestCounterRef.current) {
        return;
      }
      setAnalysisError((err as Error).message);
      setHasAnalysis(false);
      setRawSpans([]);
      // Still remember the text even if analysis failed, to avoid retrying on blur
      lastAnalyzedTextRef.current = trimmed;
    } finally {
      clearInterval(progressInterval);
      if (reqId === requestCounterRef.current) {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }
    }
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
      // Track this blob URL for cleanup
      blobUrlsRef.current.add(url);
      newUrls.push(url);
    });
    
    setFiles((prev) => [...prev, ...selectedFiles]);
    
    setImagePreviewUrls((prev) => {
      const updated = [...prev, ...newUrls];
      return validateImageUrls(updated);
    });
    
    setCurrentImageIndex(0);

    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    // Release the object URL before removing
    const urlToRemove = imagePreviewUrls[index];
    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
      // Remove from tracking set
      blobUrlsRef.current.delete(urlToRemove);
    }
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setCurrentImageIndex(0);
  };

  const savePost = () => {
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

    if (!trimmedTitle && !trimmedText && imagePreviewUrls.length === 0) {
      alert('Please add a title, caption, or at least one image before saving.');
      return false;
    }

    onSave({
      title: trimmedTitle,
      text: trimmedText,
      images: imagePreviewUrls,
      files,
    });
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePost();
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
      return; // Don't update if exceeds limit
    }
    
    const oldText = text;
    setText(value);

    // Close span popup if text changed
    closeSpanPopup();
    
    // Schedule adding to history after user stops typing
    scheduleHistoryPush(value);
    
    // Smart analysis scheduling - avoid unnecessary re-analysis
    const trimmedNew = value.trim();
    const trimmedOld = oldText.trim();
    
    // Don't analyze if text is empty or too short
    if (trimmedNew.length < 3) {
      setHasAnalysis(false);
      setRawSpans([]);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }
    
    // Calculate change magnitude
    const lengthDiff = Math.abs(value.length - oldText.length);
    const isMinorChange = lengthDiff <= 3;
    
    // Check if just whitespace/formatting changes
    const contentOld = trimmedOld.replace(/\s+/g, ' ');
    const contentNew = trimmedNew.replace(/\s+/g, ' ');
    const isWhitespaceChange = contentOld === contentNew;
    
    if (isWhitespaceChange) {
      // No need to re-analyze for just whitespace changes
      return;
    }
    
    // Calculate similarity for minor changes
    if (isMinorChange && trimmedOld.length > 0) {
      const minLen = Math.min(contentOld.length, contentNew.length);
      const maxLen = Math.max(contentOld.length, contentNew.length);
      const similarityRatio = minLen / maxLen;
      
      // If very similar (>95%), keep current analysis visible
      if (similarityRatio > 0.95) {
        // Still schedule analysis but keep highlights visible
        scheduleAnalysis();
        return;
      }
    }
    
    // Significant change - clear old highlights and schedule new analysis
    setHasAnalysis(false);
    setRawSpans([]);
    scheduleAnalysis();
  };

  const handleCaptionClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!hasAnalysis || mappedSpans.length === 0) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Get cursor position
    const cursorPos = textarea.selectionStart;
    
    // Find if cursor is within any span
    const clickedSpan = mappedSpans.find(
      span => cursorPos >= span.start && cursorPos <= span.end
    );
    
    if (clickedSpan) {
      e.preventDefault();
      // Cancel any pending analysis when user clicks to view span details
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      isViewingSpanRef.current = true;
      setSelectedSpanId(clickedSpan.id);
    }
  };

  const handleCaptionFocus = () => {
    // Run analysis when user clicks into the text area (if there's text and no analysis yet)
    if (text.trim() && !hasAnalysis && !isAnalyzing) {
      runAnalysis();
    }
  };

  const handleCaptionBlur = () => {
    // Don't run analysis if user is viewing span details popup
    if (isViewingSpanRef.current) {
      return;
    }
    
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    
    // Only run analysis if text has actually changed since last analysis
    if (text.trim() !== lastAnalyzedTextRef.current.trim()) {
      runAnalysis();
    }
  };
  const selectedSpan =
    selectedSpanId !== null
      ? mappedSpans.find((s) => s.id === selectedSpanId) ?? null
      : null;

  const closeSpanPopup = () => {
    setSelectedSpanId(null);
    isViewingSpanRef.current = false;
  };


  const handleSuggestionClick = (suggestion: AnalysisSuggestion) => {
    if (!selectedSpan) return;
    
    // Cancel any pending history push
    if (historyTimerRef.current) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    
    // Save current state to history before applying suggestion
    pushToHistory(text);
    
    const updatedText =
      text.slice(0, selectedSpan.start) +
      suggestion.text +
      text.slice(selectedSpan.end);
    setText(updatedText);
    
    // Save the new text to history after applying
    setTimeout(() => {
      pushToHistory(updatedText);
    }, 0);
    
    closeSpanPopup();
    setHasAnalysis(false);
    setRawSpans([]);
    scheduleAnalysis();
  };

  const handleAttemptClose = () => {
    if (isDirty()) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={handleAttemptClose}
      ></div>

      {/* Modal Content */}
      <div
        className={`${THEME.card} w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl flex overflow-hidden relative`}
      >
        {/* Close Button */}
        <button
          onClick={handleAttemptClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>

        {/* Left Panel: Editor */}
        <form onSubmit={handleSubmit} className="w-1/2 p-10 border-r border-[#E6E1D6] flex flex-col overflow-y-auto">
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

          {/* Text Area + Highlighted Spans */}
          <div className="flex-1 mb-6 min-h-[200px]">
            <div className="relative w-full h-full border-2 border-[#D1CBC1] rounded-2xl bg-white overflow-hidden">
              {/* Textarea - always visible and editable */}
              <textarea
                ref={textareaRef}
                placeholder="Text"
                value={text}
                onChange={handleTextChange}
                onClick={handleCaptionClick}
                onFocus={handleCaptionFocus}
                onBlur={handleCaptionBlur}
                spellCheck={false}
                className="w-full h-full resize-none focus:outline-none placeholder-[#A39D93] bg-transparent relative z-10 border-0 rounded-2xl"
                style={{
                  color: hasAnalysis ? 'transparent' : 'inherit',
                  caretColor: '#4A4238',
                  padding: '1rem',
                  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: '1.125rem',
                  lineHeight: '1.75rem',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              ></textarea>

              {/* Highlight overlay - only visible when hasAnalysis is true */}
              {hasAnalysis && (
                <div
                  ref={overlayRef}
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                  style={{
                    zIndex: 5,
                    padding: '1rem',
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '1.125rem',
                    lineHeight: '1.75rem',
                    letterSpacing: 'normal',
                    wordSpacing: 'normal',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {fragments.map((frag) =>
                    frag.span ? (
                      <span
                        key={frag.key}
                        data-span-id={frag.span.id}
                        style={{
                          // TipTap-style background highlight
                          backgroundColor: bgForSeverity(frag.span.severity),
                          borderRadius: '3px',
                          boxDecorationBreak: 'clone',
                          WebkitBoxDecorationBreak: 'clone',
                          pointerEvents: 'none',
                        }}
                      >
                        {frag.text}
                      </span>
                    ) : (
                      <span key={frag.key} style={{ pointerEvents: 'none' }}>{frag.text}</span>
                    )
                  )}
                </div>
              )}
            </div>
            <div className="mt-1 text-xs flex justify-between items-center">
              <div className="flex-1 mr-4">
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#E6E1D6] rounded-full overflow-hidden relative">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        style={{
                          animation: 'shimmer 1.5s ease-in-out infinite'
                        }}
                      />
                      <div 
                        className="h-full bg-gradient-to-r from-[#C27A70] to-[#D4A5A5] rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${analysisProgress}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-emerald-700 font-medium whitespace-nowrap">
                        {Math.round(analysisProgress)}%
                      </span>
                    </div>
                  </div>
                ) : analysisError ? (
                  <span className="text-red-600">{analysisError}</span>
                ) : hasAnalysis && mappedSpans.length > 0 ? (
                  <span className="text-[#8C857B]">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-[#E6E1D6] text-[#4A4238] font-mono text-[10px]">Tab</kbd> to apply all
                  </span>
                ) : null}
              </div>
              <span className="text-[#8C857B]">
                {text.length}/{MAX_CAPTION_LENGTH}
              </span>
            </div>
            
            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
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

        {/* Span Analysis Popup */}
        {selectedSpan && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/20"
              onClick={closeSpanPopup}
            />
            <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Span feedback
                </h3>
                <button
                  type="button"
                  onClick={closeSpanPopup}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-3">
                "{selectedSpan.text.trim()}"
              </p>
              <div className="mb-3">
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full ${
                    selectedSpan.severity === 'minor'
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-[#FEE2E2] text-[#991B1B]'
                  }`}
                >
                  {labelForSeverity(selectedSpan.severity)}
                </span>
              </div>

              <p className="text-sm text-gray-800 mb-4">{selectedSpan.comment}</p>

              {selectedSpan.suggestions.length > 0 && (
                <>
                  <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2 uppercase">
                    Try one of these rewrites:
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedSpan.suggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => handleSuggestionClick(sug)}
                        className="w-full text-left text-sm border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        {sug.text}
                        {sug.rationale && (
                          <div className="text-[11px] text-gray-500 mt-1">
                            {sug.rationale}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Unsaved changes modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowUnsavedModal(false)}
          />
          <div className={`${THEME.card} relative w-full max-w-sm rounded-2xl shadow-xl p-6`}>
            <h3 className="text-lg font-semibold text-[#4A4238] mb-2">
              Unsaved changes
            </h3>
            <p className="text-sm text-[#6B6359] mb-6">
              You have unsaved edits. What would you like to do?
            </p>
            <div className="flex justify-end gap-2 flex-nowrap">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded-full border border-[#D1CBC1] text-[#6B6359] hover:bg-[#E6E2D8] transition-colors whitespace-nowrap"
                onClick={() => setShowUnsavedModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm rounded-full border border-[#D1CBC1] text-[#6B6359] hover:bg-[#E6E2D8] transition-colors whitespace-nowrap"
                onClick={() => {
                  setShowUnsavedModal(false);
                  onClose();
                }}
              >
                Exit without saving
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm rounded-full text-white whitespace-nowrap ${THEME.accent} ${THEME.accentHover}`}
                onClick={() => {
                  const saved = savePost();
                  if (saved) {
                    setShowUnsavedModal(false);
                  }
                }}
              >
                Save & exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostEditorModal;
