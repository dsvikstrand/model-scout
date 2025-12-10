import { useState, useCallback } from "react";
import { SearchMode, SearchFilters } from "@/types/models";
import { useModelSearch } from "@/hooks/useModelSearch";
import { SearchInput } from "@/components/SearchInput";
import { SearchModeToggle } from "@/components/SearchModeToggle";
import { FilterBar } from "@/components/FilterBar";
import { ModelResultsList } from "@/components/ModelResultsList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitModel, parseHfModelId } from "@/services/submissionService";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Index = () => {
  const [mode, setMode] = useState<SearchMode>("semantic");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "downloads" | "likes">("relevance");
  const TOP_K = 20;
  const [openDialog, setOpenDialog] = useState(false);
  const [submitState, setSubmitState] = useState<{
    hfUrl: string;
    name: string;
    tasks: string[];
    params: string;
    license: string;
    prompts: string[];
  }>({
    hfUrl: "",
    name: "",
    tasks: [],
    params: "",
    license: "",
    prompts: ["", ""],
  });
  const [submitting, setSubmitting] = useState(false);

  const { data: models, isLoading, isError, error, refetch } = useModelSearch({
    mode,
    query,
    filters,
    topK: TOP_K,
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

  const handlePromptChange = (index: number, value: string) => {
    setSubmitState((prev) => {
      const prompts = [...prev.prompts];
      prompts[index] = value;
      return { ...prev, prompts };
    });
  };

  const addPromptField = () => {
    setSubmitState((prev) => {
      if (prev.prompts.length >= 10) return prev;
      return { ...prev, prompts: [...prev.prompts, ""] };
    });
  };

  const removePromptField = (index: number) => {
    setSubmitState((prev) => {
      const prompts = prev.prompts.filter((_, i) => i !== index);
      return { ...prev, prompts: prompts.length ? prompts : [""] };
    });
  };

  const handleTaskToggle = (task: string) => {
    setSubmitState((prev) => {
      const exists = prev.tasks.includes(task);
      return {
        ...prev,
        tasks: exists ? prev.tasks.filter((t) => t !== task) : [...prev.tasks, task],
      };
    });
  };

  const handleSubmitModel = async () => {
    const prompts = submitState.prompts.map((p) => p.trim()).filter(Boolean);
    if (!submitState.hfUrl.trim()) {
      toast({ title: "HF URL required", variant: "destructive" });
      return;
    }
    if (!submitState.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const paramsNum = Number(submitState.params);
    if (!submitState.params.trim() || Number.isNaN(paramsNum) || paramsNum <= 0) {
      toast({ title: "Params are required", description: "Enter numeric billions, e.g., 0.304", variant: "destructive" });
      return;
    }
    if (!parseHfModelId(submitState.hfUrl)) {
      toast({ title: "Invalid HF URL", description: "Use https://huggingface.co/org/model", variant: "destructive" });
      return;
    }
    if (prompts.length < 2) {
      toast({ title: "Add at least two prompts (detailed and simple)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await submitModel({
        hfUrl: submitState.hfUrl,
        name: submitState.name,
        tasks: submitState.tasks,
        params: paramsNum,
        license: submitState.license,
        prompts,
      });
      toast({ title: "In queue for evaluation", description: "Will land in the catalog after passing review." });
      setOpenDialog(false);
      setSubmitState({
        hfUrl: "",
        name: "",
        tasks: [],
        params: "",
        license: "",
        prompts: ["", ""],
      });
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sortedModels = useMemo(() => {
    if (!models) return models;
    const minDownloads = filters.minDownloads ?? 0;
    const minLikes = filters.minLikes ?? 0;
    const copy = models.filter((m) => {
      const downloads = m.downloads ?? 0;
      const likes = m.likes ?? 0;
      return downloads >= minDownloads && likes >= minLikes;
    });
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
          <div className="mt-4 flex justify-center">
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">Help expand the catalog</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Submit a Hugging Face model</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                      <label className="text-sm text-muted-foreground">HF model URL *</label>
                      <Input
                        placeholder="https://huggingface.co/org/model"
                        value={submitState.hfUrl}
                        onChange={(e) => setSubmitState((prev) => ({ ...prev, hfUrl: e.target.value }))}
                      />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Name *</label>
                    <Input
                      placeholder="Model name"
                      value={submitState.name}
                      onChange={(e) => setSubmitState((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground">Params (billions) *</label>
                      <Input
                        placeholder="e.g., 0.304"
                        value={submitState.params}
                        onChange={(e) => setSubmitState((prev) => ({ ...prev, params: e.target.value }))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground">License</label>
                      <Input
                        placeholder="Optional"
                        value={submitState.license}
                        onChange={(e) => setSubmitState((prev) => ({ ...prev, license: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Tasks</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {["text", "vision", "audio", "embedding", "multimodal", "other"].map((task) => {
                        const active = submitState.tasks.includes(task);
                        return (
                          <button
                            key={task}
                            type="button"
                            onClick={() => handleTaskToggle(task)}
                            className={`px-3 py-1.5 text-sm rounded-full border ${
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {task}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground">
                        Prompts (at least 2: one detailed, one simple) *
                      </label>
                      <Button variant="ghost" size="sm" onClick={addPromptField} disabled={submitState.prompts.length >= 10}>
                        Add prompt
                      </Button>
                    </div>
                    <div className="space-y-2 mt-2">
                      {submitState.prompts.map((p, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Textarea
                            value={p}
                            onChange={(e) => handlePromptChange(idx, e.target.value)}
                            placeholder={
                              idx === 0
                                ? "Detailed: e.g., Unified foundation model for promptable segmentation in images and videos."
                                : idx === 1
                                  ? "Simple: e.g., Model for high quality image segmentation."
                                  : "Describe when this model is a good fit..."
                            }
                          />
                          {submitState.prompts.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removePromptField(idx)}>
                              ✕
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSubmitModel} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Search Section */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <SearchInput onSearch={handleSearch} isLoading={isLoading} />
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <SearchModeToggle mode={mode} onModeChange={handleModeChange} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Sort:</span>
              <div className="flex overflow-hidden rounded-md border bg-muted">
                {[
                  { value: "relevance", label: "Relevance" },
                  { value: "downloads", label: "Downloads" },
                  { value: "likes", label: "Likes" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value as typeof sortBy)}
                    className={cn(
                      "px-3 py-2 text-xs font-medium transition-colors",
                      sortBy === opt.value ? "bg-background text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
