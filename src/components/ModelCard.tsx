import { ExternalLink, Download, Heart } from "lucide-react";
import { ModelResult } from "@/types/models";
import { CopyButton } from "./CopyButton";
import { Badge } from "@/components/ui/badge";

interface ModelCardProps {
  model: ModelResult;
}

function formatNumber(num: number | undefined): string {
  if (num === undefined) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatParams(params: number | undefined): string {
  if (params === undefined) return "";
  if (params >= 1_000_000_000) return `${(params / 1_000_000_000).toFixed(1)}B`;
  if (params >= 1_000_000) return `${(params / 1_000_000).toFixed(0)}M`;
  return `${(params / 1_000).toFixed(0)}K`;
}

export function ModelCard({ model, index = 0 }: ModelCardProps & { index?: number }) {
  return (
    <div 
      className="group p-5 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {model.id}
            </h3>
            <CopyButton text={model.id} />
          </div>
          
          {model.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {model.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {model.task && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                {model.task}
              </Badge>
            )}
            {model.params && (
              <Badge variant="outline" className="text-xs">
                {formatParams(model.params)}
              </Badge>
            )}
            {model.framework && (
              <Badge variant="outline" className="text-xs">
                {model.framework}
              </Badge>
            )}
          </div>
        </div>

        <a
          href={model.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Download className="h-4 w-4" />
          <span>{formatNumber(model.downloads)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="h-4 w-4" />
          <span>{formatNumber(model.likes)}</span>
        </div>
        {model.license && (
          <span className="ml-auto text-xs">{model.license}</span>
        )}
      </div>
    </div>
  );
}
