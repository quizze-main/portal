import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeToClass: Record<SpinnerSize, string> = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-10 h-10",
};

export interface SpinnerProps {
  size?: SpinnerSize;
  colorClass?: string; // Tailwind classes, e.g. "text-blue-600"
  className?: string;
  ariaLabel?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  colorClass = "text-blue-600",
  className,
  ariaLabel = "Загрузка",
}) => {
  return (
    <Loader2
      aria-label={ariaLabel}
      className={cn("animate-spin", sizeToClass[size], colorClass, className)}
    />
  );
};

export default Spinner;

