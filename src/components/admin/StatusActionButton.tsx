import { Button } from "@/components/ui/button";

interface StatusActionButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor: string;
}

export function StatusActionButton({ label, active, onClick, activeColor }: StatusActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={`h-[clamp(3.5rem,8vw,4rem)] w-full rounded-sm font-black uppercase tracking-widest text-[clamp(0.55rem,1.5vw,0.75rem)] transition-all border-2 ${active
        ? `${activeColor} border-transparent text-white shadow-md translate-y-[-2px]`
        : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
    >
      {label}
    </Button>
  );
}
