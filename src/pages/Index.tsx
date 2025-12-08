import { useState, useCallback } from "react";
import { SearchMode, SearchFilters } from "@/types/models";
import { useModelSearch } from "@/hooks/useModelSearch";
import { SearchInput } from "@/components/SearchInput";
import { SearchModeToggle } from "@/components/SearchModeToggle";
import { FilterBar } from "@/components/FilterBar";
import { ModelResultsList } from "@/components/ModelResultsList";

const Index = () => {
  const [mode, setMode] = useState<SearchMode>("semantic");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);

  const { data: models, isLoading, isError, error, refetch } = useModelSearch({
    mode,
    query,
    filters,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Model Scout
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
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <FilterBar filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Results */}
        <ModelResultsList
          models={models}
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
