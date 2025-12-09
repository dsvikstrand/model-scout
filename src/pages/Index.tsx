import { useState, useCallback } from "react";
import { SearchMode, SearchFilters } from "@/types/models";
import { useModelSearch } from "@/hooks/useModelSearch";
import { SearchInput } from "@/components/SearchInput";
import { SearchModeToggle } from "@/components/SearchModeToggle";
import { FilterBar } from "@/components/FilterBar";
import { ModelResultsList } from "@/components/ModelResultsList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";

const Index = () => {
  const [mode, setMode] = useState<SearchMode>("semantic");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [topK, setTopK] = useState<number>(10);
  const [sortBy, setSortBy] = useState<"relevance" | "downloads" | "likes">("relevance");

  const { data: models, isLoading, isError, error, refetch } = useModelSearch({
    mode,
    query,
    filters,
    topK,
  });

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setHasSearched(true);
  }, []);

  const handleModeChange = useCallback((newMode: SearchMode) => {
    setMode(newMode);
  }, []);

  const handleSwitchToKeyword = useCallback(() => {
    setMode("keyword");
  }, []);

  const sortedModels = useMemo(() => {
    if (!models) return models;
    const copy = [...models];
    if (sortBy === "downloads") {
      copy.sort((a, b) => (b.downloads ?? -1) - (a.downloads ?? -1));
    } else if (sortBy === "likes") {
      copy.sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1));
    }
    return copy;
  }, [models, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Model <span className="text-primary">Scout</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Discover Hugging Face models with natural language
          </p>
        </header>

        {/* Search Section */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <SearchInput onSearch={handleSearch} isLoading={isLoading} />
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchModeToggle mode={mode} onModeChange={handleModeChange} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Top K:</span>
              <Select value={String(topK)} onValueChange={(value) => setTopK(Number(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20].map((k) => (
                    <SelectItem key={k} value={String(k)}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Sort:</span>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="downloads">Downloads</SelectItem>
                  <SelectItem value="likes">Likes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <FilterBar filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Results */}
        <ModelResultsList
          models={sortedModels}
          isLoading={isLoading}
          isError={isError}
          error={error}
          hasSearched={hasSearched}
          isSemanticMode={mode === "semantic"}
          onRetry={() => refetch()}
          onSwitchMode={handleSwitchToKeyword}
        />
      </div>
    </div>
  );
};

export default Index;
