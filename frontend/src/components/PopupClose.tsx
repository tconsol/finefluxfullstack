import React from "react";
import { X } from "lucide-react";

type Props = {
  onClick?: (e?: any) => void;
  ariaLabel?: string;
  className?: string;
};

export default function PopupClose({ onClick, ariaLabel = "Close", className = "" }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`absolute top-4 right-4 z-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground p-2 transition-all backdrop-blur-sm ${className}`}
    >
      <X className="h-4 w-4" />
    </button>
  );
}
