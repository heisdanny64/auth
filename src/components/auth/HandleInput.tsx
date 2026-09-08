import { Label } from "@/components/ui/label";
import { SystemRestart as Loader2, Check, Xmark as X } from "iconoir-react";
import type { UseHandleCheckerResult } from "@/hooks/useHandleChecker";
import type { ReactNode } from "react";

interface HandleInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  handleCheck: UseHandleCheckerResult;
  placeholder?: string;
  autoComplete?: string;
  helperText?: ReactNode;
}

export function HandleInput({
  id = "handle-input",
  label = "Username / Handle",
  value,
  onChange,
  handleCheck,
  placeholder = "username",
  autoComplete = "username",
  helperText,
}: HandleInputProps) {
  return (
    <div className="space-y-2 text-left">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex rounded-md border border-input bg-surface/50 focus-within:ring-1 focus-within:ring-ring overflow-hidden">
        <span className="flex items-center px-3 bg-muted/40 text-muted-foreground font-mono text-sm border-r border-input select-none">
          @
        </span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
            onChange(sanitized);
          }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-foreground focus:outline-none"
        />
        <div className="flex items-center pr-3">
          {handleCheck.checking && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
          {handleCheck.isValid && !handleCheck.checking && (
            <span title="Available">
              <Check className="size-4 text-emerald-500 stroke-[2.5]" />
            </span>
          )}
          {(handleCheck.status === "taken" ||
            handleCheck.status === "invalid_format" ||
            handleCheck.status === "reserved") && (
            <span title={handleCheck.errorMessage ?? "Invalid or unavailable"}>
              <X className="size-4 text-destructive stroke-[2.5]" />
            </span>
          )}
        </div>
      </div>

      {handleCheck.errorMessage && (
        <p className="text-xs text-destructive">{handleCheck.errorMessage}</p>
      )}
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
