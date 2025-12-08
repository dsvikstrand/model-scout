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
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Describe the model you need..."
            className="h-14 pl-12 pr-4 text-lg rounded-xl border-border/50 bg-background shadow-sm transition-all duration-200 focus-visible:ring-primary/20 focus-visible:border-primary/50 focus-visible:shadow-md"
          />
        </div>
        <Button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="h-14 px-8 rounded-xl text-base font-medium shadow-sm hover:shadow-md transition-all duration-200"
        >
          {isLoading ? "Searching..." : "Find Models"}
        </Button>
      </div>
    </form>
  );
}
