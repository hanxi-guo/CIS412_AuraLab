import React from 'react';
import { X } from 'lucide-react';
import { THEME } from '../config';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

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

export default ConfirmModal;
