import { useState, FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Describe the model you need…"
            className="h-14 pl-12 pr-4 text-lg rounded-xl border-border/50 bg-background shadow-sm focus-visible:ring-primary/20"
          />
        </div>
        <Button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="h-14 px-8 rounded-xl text-base font-medium"
        >
          {isLoading ? "Searching…" : "Find Models"}
        </Button>
      </div>
    </form>
  );
}
