interface DetailItemProps {
  label: string;
  value: string;
  color?: string;
}

export function DetailItem({ label, value, color }: DetailItemProps) {
  return (
    <div className="space-y-[clamp(0.125rem,0.5vw,0.25rem)]">
      <p className="text-[clamp(0.55rem,1.5vw,0.65rem)] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest leading-none">{label}</p>
      <p className={`font-black text-[clamp(1rem,3vw,1.25rem)] tracking-tight leading-tight ${color || "text-zinc-900 dark:text-zinc-100"}`}>{value}</p>
    </div>
  );
}
