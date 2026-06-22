import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}

export default function Card({ children, className, padding = true, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/70 shadow-premium",
        hover && "transition-shadow duration-200 hover:shadow-premium-hover",
        padding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
