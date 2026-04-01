interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return (
    <p className={`text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2 ${className}`}>
      {children}
    </p>
  );
}
