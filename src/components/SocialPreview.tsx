import React from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';
import { THEME } from '../config';

export type PreviewPlatform = 'instagram' | 'facebook' | 'twitter';

interface SocialPreviewProps {
  previewPlatform: PreviewPlatform;
  onChangePlatform: (platform: PreviewPlatform) => void;
  text: string;
  imagePreviewUrls: string[];
  currentImageIndex: number;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const SocialPreview: React.FC<SocialPreviewProps> = ({
  previewPlatform,
  onChangePlatform,
  text,
  imagePreviewUrls,
  currentImageIndex,
  setCurrentImageIndex,
}) => {
  const hasImages = imagePreviewUrls.length > 0;

  return (
    <div className={`w-1/2 p-10 ${THEME.sidebar} flex flex-col`}>
      {/* Platform Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#EBE7DE] p-1 rounded-full flex shadow-inner">
          <button
            type="button"
            onClick={() => onChangePlatform('instagram')}
            className={`px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
              previewPlatform === 'instagram'
                ? 'bg-[#8C857B] text-white shadow-sm'
                : 'text-[#8C857B] hover:text-[#4A4238]'
            }`}
          >
            Instagram
          </button>
          <button
            type="button"
            onClick={() => onChangePlatform('facebook')}
            className={`px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
              previewPlatform === 'facebook'
                ? 'bg-[#8C857B] text-white shadow-sm'
                : 'text-[#8C857B] hover:text-[#4A4238]'
            }`}
          >
            Facebook
          </button>
          <button
            type="button"
            onClick={() => onChangePlatform('twitter')}
            className={`px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
              previewPlatform === 'twitter'
                ? 'bg-[#8C857B] text-white shadow-sm'
                : 'text-[#8C857B] hover:text-[#4A4238]'
            }`}
          >
            Twitter
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
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
                {hasImages ? (
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
                  {text || (
                    <span className="text-gray-400">Caption will appear here…</span>
                  )}
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
                {text || (
                  <span className="text-gray-400">
                    Write something for your post…
                  </span>
                )}
              </div>

              {/* FB image(s) */}
              <div className="relative bg-gray-100 max-h-80 overflow-hidden flex items-center justify-center">
                {hasImages ? (
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
                {hasImages ? (
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
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs"
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs"
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
      </div>
    </div>
  );
};

export default SocialPreview;
