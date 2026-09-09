import * as React from "react";
import { AVATAR_STYLES, getStylePreview } from "@/lib/dicebear";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "iconoir-react";
import { cn } from "@/lib/utils";

export interface StylePickerProps {
  selectedStyle: string | null;
  onSelectStyle: (style: string) => void;
  onContinue: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  className?: string;
}

export function StylePicker({
  selectedStyle,
  onSelectStyle,
  onContinue,
  onBack,
  onSkip,
  showSkip = true,
  className,
}: StylePickerProps) {
  return (
    <div className={cn("flex flex-col w-full", className)}>
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand uppercase">
            Step 2 · Avatar
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-display">
            Find your shape.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick a style, then tune the details.</p>
        </div>
        {showSkip && onSkip ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 rounded-full px-3"
          >
            Skip for now
          </Button>
        ) : null}
      </div>

      {/* Styles Grid */}
      <div className="py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {AVATAR_STYLES.map((style) => {
            const isSelected = selectedStyle === style.key;
            const previewUri = getStylePreview(style.key);

            return (
              <button
                key={style.key}
                type="button"
                onClick={() => onSelectStyle(style.key)}
                className={cn(
                  "group relative flex flex-col items-center p-3 rounded-2xl border transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 cursor-pointer",
                  isSelected
                    ? "border-brand bg-brand/10 ring-2 ring-brand/30 shadow-md scale-[1.02]"
                    : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40 hover:scale-[1.01]",
                )}
                aria-pressed={isSelected}
              >
                {/* Avatar Preview */}
                <div className="relative aspect-square w-full max-w-[100px] sm:max-w-[110px] rounded-xl overflow-hidden bg-background/50 flex items-center justify-center p-1 border border-border/40">
                  <img
                    src={previewUri}
                    alt={style.label}
                    loading="lazy"
                    className="size-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                {/* Style Name */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium tracking-tight truncate w-full px-1",
                    isSelected
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {style.label}
                </span>

                {/* Selected Indicator Pill */}
                {isSelected ? (
                  <div className="absolute top-2 right-2 size-2 rounded-full bg-brand ring-2 ring-card" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom bar: Back left, Build Avatar right */}
      <div className="flex items-center justify-between pt-6 mt-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4 mr-2" /> Back
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="hero"
          size="xl"
          disabled={!selectedStyle}
          onClick={onContinue}
        >
          Build Avatar
        </Button>
      </div>
    </div>
  );
}
