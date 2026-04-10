"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Small info icon with hover tooltip for feature explanations.
 * Usage: <InfoTooltip>Help text explaining this feature.</InfoTooltip>
 */
export function InfoTooltip({ children, className }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center text-muted-foreground hover:text-foreground",
                className
              )}
              onClick={(e) => e.preventDefault()}
              aria-label="More info"
            >
              <Info className="size-3.5" />
            </button>
          }
        />
        <TooltipContent className="max-w-xs text-xs">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
