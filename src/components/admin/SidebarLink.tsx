import type { LucideIcon } from "lucide-react";

interface SidebarLinkProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function SidebarLink({ icon: Icon, label, active = false, onClick }: SidebarLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-[clamp(0.5rem,1.5vw,1rem)] px-[clamp(1rem,2vw,1.5rem)] py-[clamp(0.75rem,2vw,1rem)] rounded-sm transition-all font-semibold text-[clamp(0.875rem,2vw,1rem)] ${active
        ? "text-[#DC2626] dark:text-red-400 bg-red-50 dark:bg-red-900/30"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
    >
      <Icon className="mr-3 h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" /> {label}
    </button>
  );
}
