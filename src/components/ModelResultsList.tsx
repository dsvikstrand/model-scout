import { ModelResult } from "@/types/models";
import { ModelCard } from "./ModelCard";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelResultsListProps {
  models: ModelResult[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasSearched: boolean;
  isSemanticMode: boolean;
  onRetry: () => void;
  onSwitchMode: () => void;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl border border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-3/4" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModelResultsList({
  models,
  isLoading,
  isError,
  error,
  hasSearched,
  isSemanticMode,
  onRetry,
  onSwitchMode,
}: ModelResultsListProps) {
  if (!hasSearched) {
    return <EmptyState type="initial" />;
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        type="error"
        error={error || undefined}
        isSemanticMode={isSemanticMode}
        onRetry={onRetry}
        onSwitchMode={onSwitchMode}
      />
    );
  }

  if (!models || models.length === 0) {
    return <EmptyState type="no-results" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Found {models.length} model{models.length !== 1 ? "s" : ""}
      </p>
      {models.map((model, index) => (
        <ModelCard key={model.id} model={model} index={index} />
      ))}
    </div>
  );
}
