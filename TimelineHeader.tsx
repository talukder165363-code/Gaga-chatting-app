import { Plus } from 'lucide-react';
const logoSrc = '/assets/gaga-logo.jpg';

interface TimelineHeaderProps {
  onNewPost: () => void;
}

export function TimelineHeader({ onNewPost }: TimelineHeaderProps) {
  return (
    <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-[var(--gchat-bg)] sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <img src={logoSrc} alt="GaGa Chat" className="w-8 h-8 rounded-full gchat-logo-glow" />
        <h1 className="text-white text-xl font-bold">Timeline</h1>
      </div>
      <button
        onClick={onNewPost}
        className="flex items-center gap-1.5 bg-[#00FF7F] text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-[#00FF7F]/20 active:scale-95 transition-all"
      >
        <Plus size={18} strokeWidth={3} />
        New Post
      </button>
    </div>
  );
}
