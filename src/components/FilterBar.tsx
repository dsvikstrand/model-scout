import { SearchFilters } from "@/types/models";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { value: "small" as const, label: "<1B" },
  { value: "medium" as const, label: "1-10B" },
  { value: "large" as const, label: ">10B" },
];

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Task:</span>
        <Select
          value={filters.task ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, task: value === "all" ? undefined : (value as typeof filters.task) })
          }
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {TASKS.filter((t) => t.value).map((t) => (
              <SelectItem key={t.label} value={t.value as string}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span>Max params:</span>
        <Select
          value={filters.size ?? "any"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, size: value === "any" ? undefined : (value as typeof filters.size) })
          }
        >
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {SIZES.map((size) => (
              <SelectItem key={size.label} value={size.value ?? "any"}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span>Min downloads:</span>
        <Input
          type="number"
          min={0}
          placeholder="e.g., 10000"
          value={filters.minDownloads ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              minDownloads: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-28 h-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <span>Min likes:</span>
        <Input
          type="number"
          min={0}
          placeholder="e.g., 50"
          value={filters.minLikes ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              minLikes: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-24 h-9"
        />
      </div>
    </div>
  );
}
