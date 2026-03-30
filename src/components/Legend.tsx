'use client';

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-subtle)]">
      <span className="font-medium text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Legenda</span>
      <LegendItem color="var(--green)" label="Keturunan" />
      <LegendItem color="var(--blue)" label="Orang Tua" />
      <LegendItem color="var(--accent)" label="Dipilih" />
      <div className="flex items-center gap-1.5">
        <svg width="20" height="8">
          <line x1="0" y1="4" x2="20" y2="4" stroke="var(--border-light)" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
        <span>Pasangan</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span>Masih Hidup</span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
