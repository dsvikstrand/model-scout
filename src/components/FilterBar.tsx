import { SearchFilters } from "@/types/models";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const TASKS = [
  { value: undefined, label: "All" },
  { value: "text" as const, label: "Text" },
  { value: "vision" as const, label: "Vision" },
  { value: "audio" as const, label: "Audio" },
  { value: "embedding" as const, label: "Embedding" },
  { value: "multimodal" as const, label: "Multimodal" },
  { value: "other" as const, label: "Other" },
];

const SIZES = [
  { value: undefined, label: "Any Size" },
  { value: "small" as const, label: "<1B" },
  { value: "medium" as const, label: "1-10B" },
  { value: "large" as const, label: ">10B" },
];

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Task:</span>
        <div className="flex gap-1">
          {TASKS.map((task) => (
            <button
              key={task.label}
              type="button"
              onClick={() => onFiltersChange({ ...filters, task: task.value })}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full transition-all duration-200",
                filters.task === task.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {task.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Size:</span>
        <div className="flex gap-1">
          {SIZES.map((size) => (
            <button
              key={size.label}
              type="button"
              onClick={() => onFiltersChange({ ...filters, size: size.value })}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full transition-all duration-200",
                filters.size === size.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
