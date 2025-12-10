import { Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "initial" | "no-results" | "error";
  error?: Error;
  onRetry?: () => void;
  onSwitchMode?: () => void;
  isSemanticMode?: boolean;
}

export function EmptyState({ type, error, onRetry, onSwitchMode, isSemanticMode }: EmptyStateProps) {
  if (type === "initial") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Discover ML Models</h3>
        <p className="mt-2 text-muted-foreground max-w-md">
          Describe what you're looking for in natural language, like "compact LLM for chat on a single GPU" or "fast image classifier for 224x224 photos".
        </p>
      </div>
    );
  }

  if (type === "error") {
    const isSemanticError = isSemanticMode && error?.message.includes("Semantic");
    
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Search Unavailable</h3>
        <p className="mt-2 text-muted-foreground max-w-md">
          {isSemanticError 
            ? "Semantic search is currently unavailable. Try switching to Keyword mode."
            : error?.message || "Something went wrong. Please try again."}
        </p>
        <div className="mt-4 flex gap-3">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {isSemanticError && onSwitchMode && (
            <Button onClick={onSwitchMode}>
              Switch to Keyword
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground">No Models Found</h3>
      <p className="mt-2 text-muted-foreground max-w-md">
        Try adjusting your search terms or filters to find what you're looking for.
      </p>
    </div>
  );
}
