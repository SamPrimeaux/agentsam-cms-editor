type Props = { label: string; value: string };

/** Portable — copy to dashboard/components/analytics/portable/KpiCard.tsx */
export function KpiCard({ label, value }: Props) {
  return (
    <div className="kpi-card">
      <label>{label}</label>
      <strong>{value}</strong>
    </div>
  );
}
