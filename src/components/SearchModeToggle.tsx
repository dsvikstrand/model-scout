import { SearchMode } from "@/types/models";
import { cn } from "@/lib/utils";

interface SearchModeToggleProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export function SearchModeToggle({ mode, onModeChange }: SearchModeToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
      <button
        type="button"
        onClick={() => onModeChange("semantic")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-all",
          mode === "semantic"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Semantic
      </button>
      <button
        type="button"
        onClick={() => onModeChange("keyword")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-all",
          mode === "keyword"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Keyword
      </button>
    </div>
  );
}
