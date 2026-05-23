import type { ReactNode } from "react";

type Col<T> = { key: string; header: string; render: (row: T) => ReactNode };

type Props<T> = {
  columns: Col<T>[];
  rows: T[];
  empty?: string;
};

/** Portable table shell for provider / model leaderboards */
export function SimpleTable<T extends Record<string, unknown>>({
  columns,
  rows,
  empty = "No rows",
}: Props<T>) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key}>{c.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
