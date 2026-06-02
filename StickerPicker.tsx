import { useMemo } from 'react';

type StickerPickerProps = {
  onSelect: (sticker: string) => void;
  onClose: () => void;
};

const STICKERS = [
  // Inline placeholders (replace with real sticker images later)
  '😀', '😂', '🥹', '😍', '😡', '😮', '😭', '👍', '❤️', '🎉', '🔥', '✨',
] as const;

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const stickers = useMemo(() => Array.from(STICKERS), []);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 flex items-end justify-center p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-white font-semibold">Stickers</div>
          <button
            className="text-white/60 hover:text-white transition-colors"
            onClick={onClose}
            aria-label="Close sticker picker"
          >
            ✕
          </button>
        </div>

        <div className="p-4 grid grid-cols-6 gap-3">
          {stickers.map((s) => (
            <button
              key={s}
              className="aspect-square rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-2xl"
              onClick={() => onSelect(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

