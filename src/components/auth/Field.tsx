import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeClosed as EyeOff } from "iconoir-react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function Field({ label, hint, className, type = "text", ...props }: FieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          {label}
        </label>
        {hint}
      </div>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          className={cn(
            "h-12 w-full rounded-xl border border-input bg-surface px-4 text-[0.95rem] text-foreground",
            "placeholder:text-muted-foreground/60 transition-colors",
            "focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-ring/30",
            isPassword && "pr-12",
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
