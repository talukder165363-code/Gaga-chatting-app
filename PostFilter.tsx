import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostFilterProps {
  activeFilter: 'all' | 'mine' | 'saved';
  onFilterChange: (filter: 'all' | 'mine' | 'saved') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
}

export function PostFilter({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  showSearch,
  setShowSearch
}: PostFilterProps) {
  return (
    <div className="px-5 mb-4 space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {(['all', 'mine', 'saved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              activeFilter === f 
                ? "bg-[#00FF7F] text-black" 
                : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            {f === 'all' ? 'All Posts' : f === 'mine' ? 'My Posts' : 'Saved'}
          </button>
        ))}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={cn(
            "p-1.5 rounded-full transition-all ml-auto",
            showSearch ? "bg-[#00FF7F] text-black" : "bg-white/5 text-white/40"
          )}
        >
          <Search size={16} />
        </button>
      </div>

      {showSearch && (
        <div className="relative animate-slide-in">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search posts..."
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:border-[#00FF00]/60"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
