import type { LucideIcon } from "lucide-react";

interface ModernStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  textColor?: string;
}

export function ModernStatCard({ label, value, icon: Icon, color, textColor }: ModernStatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-[clamp(1.25rem,3vw,1.5rem)] rounded-sm flex items-center justify-between group hover:shadow-md transition-all shadow-md shadow-zinc-200/50 dark:shadow-none transition-colors duration-300">
      <div className="space-y-1">
        <p className={`text-[clamp(0.55rem,1.5vw,0.65rem)] font-bold ${textColor || "text-zinc-400 dark:text-zinc-500"} uppercase tracking-widest opacity-80`}>{label}</p>
        <p className={`text-[clamp(1.5rem,5vw,2.25rem)] font-bold ${textColor || "text-zinc-900 dark:text-zinc-100"} tabular-nums leading-none`}>{value}</p>
      </div>
      <div className={`p-[clamp(0.5rem,2vw,0.75rem)] rounded-sm ${color} opacity-80 group-hover:opacity-100 transition-opacity`}>
        <Icon size={24} className="w-[clamp(1.25rem,4vw,1.5rem)] h-[clamp(1.25rem,4vw,1.5rem)]" />
      </div>
    </div>
  );
}
