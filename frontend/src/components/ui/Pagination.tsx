import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationMeta } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const PAGE_SIZES = [10, 20, 50, 100];

/** Compact list of page numbers with ellipses, e.g. 1 … 4 5 6 … 12 */
function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

export function Pagination({
  meta,
  onPageChange,
  onLimitChange,
  noun = "records",
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  noun?: string;
}) {
  const { page, limit, total_records, total_pages } = meta;
  const from = total_records === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total_records);

  const navBtn =
    "inline-flex size-7 items-center justify-center rounded-md text-[12px] font-medium transition disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted">
      <div className="flex items-center gap-3">
        <span className="tabular">
          Showing <span className="font-medium text-primary">{formatNumber(from)}</span>–
          <span className="font-medium text-primary">{formatNumber(to)}</span> of{" "}
          <span className="font-medium text-primary">{formatNumber(total_records)}</span> {noun}
        </span>
        {onLimitChange && (
          <label className="hidden items-center gap-1.5 sm:flex">
            <span className="text-subtle">·</span> Rows
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-7 rounded-md border border-border bg-surface px-1.5 text-xs text-primary focus:outline-2 focus:outline-accent/30"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {total_pages > 1 && (
        <nav className="flex items-center gap-0.5" aria-label="Pagination">
          <button
            type="button"
            className={cn(navBtn, "hover:bg-surface-raised")}
            disabled={!meta.has_previous_page}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </button>
          {pageItems(page, total_pages).map((item, i) =>
            item === "…" ? (
              <span key={`e${i}`} className="w-6 text-center text-subtle">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  navBtn,
                  "tabular min-w-7 px-1.5",
                  item === page ? "bg-accent text-on-accent shadow-xs" : "text-muted hover:bg-surface-raised hover:text-primary",
                )}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={cn(navBtn, "hover:bg-surface-raised")}
            disabled={!meta.has_next_page}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
