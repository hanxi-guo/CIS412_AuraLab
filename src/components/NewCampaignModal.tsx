import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MAX_CAMPAIGN_NAME_LENGTH, THEME } from '../config';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
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

export default NewCampaignModal;
