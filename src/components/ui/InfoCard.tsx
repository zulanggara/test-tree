interface InfoCardProps {
  label: string;
  value: string;
  className?: string;
}

export function InfoCard({ label, value, className = '' }: InfoCardProps) {
  return (
    <div
      className={`rounded-lg p-3 ${className}`}
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
    >
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-1">{label}</p>
      <p className="text-sm font-medium text-[var(--text)]">{value}</p>
    </div>
  );
}
