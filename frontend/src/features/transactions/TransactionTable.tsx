import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Lock, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/misc";
import { Table, TD, TH, THead, TR } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney, formatRelative, formatTime } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function TypeBadge({ type }: { type: Transaction["type"] }) {
  return type === "credit" ? (
    <Badge variant="success">
      <ArrowDownLeft /> Credit
    </Badge>
  ) : (
    <Badge variant="danger">
      <ArrowUpRight /> Debit
    </Badge>
  );
}

export function SignedAmount({ tx, className }: { tx: Transaction; className?: string }) {
  return (
    <span className={cn("tabular font-semibold", tx.type === "credit" ? "text-success" : "text-primary", className)}>
      {tx.type === "credit" ? "+" : "−"}
      {formatMoney(tx.amount)}
    </span>
  );
}

export function TransactionTable({ rows }: { rows: Transaction[] }) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  return (
    <>
      <Table>
        <THead>
          <tr>
            <TH>Type</TH>
            <TH>Details</TH>
            <TH className="text-right">Amount</TH>
            <TH className="hidden text-right md:table-cell">Balance after</TH>
            <TH className="hidden text-right sm:table-cell">Date</TH>
          </tr>
        </THead>
        <tbody>
          {rows.map((tx) => (
            <TR
              key={tx.id}
              onClick={() => setSelected(tx)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(tx)}
              tabIndex={0}
              className="cursor-pointer focus-visible:bg-accent-soft/50 focus-visible:outline-none"
            >
              <TD className="w-28">
                <TypeBadge type={tx.type} />
              </TD>
              <TD className="max-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">
                    {tx.description ?? <span className="font-normal text-subtle">No description</span>}
                  </span>
                  {tx.transfer_id && (
                    <Badge variant="accent" className="shrink-0">
                      <ArrowLeftRight /> Transfer
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-subtle">{tx.reference_id}</div>
              </TD>
              <TD className="text-right whitespace-nowrap">
                <SignedAmount tx={tx} />
              </TD>
              <TD className="tabular hidden text-right whitespace-nowrap text-muted md:table-cell">
                {formatMoney(tx.balance_after)}
              </TD>
              <TD className="hidden text-right whitespace-nowrap sm:table-cell">
                <div className="text-[13px]">{formatRelative(tx.created_at)}</div>
                <div className="text-[11px] text-subtle">{formatTime(tx.created_at)}</div>
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
      <TransactionDrawer tx={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className={cn("min-w-0 text-right text-[13px] break-all text-primary", mono && "font-mono text-xs")}>
        {children}
      </dd>
    </div>
  );
}

/** Read-only side panel with every field of a ledger entry. */
function TransactionDrawer({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  useEffect(() => {
    if (!tx) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tx, onClose]);

  if (!tx) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="lg-fade-in absolute inset-0 bg-primary/25 backdrop-blur-[1px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Transaction details"
        className="lg-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <h2 className="text-sm font-semibold">Transaction details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-subtle hover:bg-surface-raised hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-xl border border-border bg-canvas p-4 text-center">
            <TypeBadge type={tx.type} />
            <SignedAmount tx={tx} className="mt-2 block text-2xl" />
            <p className="mt-1 text-xs text-muted">{formatDateTime(tx.created_at)}</p>
          </div>

          <dl className="mt-4 divide-y divide-border">
            <Row label="Description">{tx.description ?? <span className="text-subtle">None</span>}</Row>
            <Row label="Reference ID" mono>
              <span className="inline-flex items-center gap-1">
                {tx.reference_id} <CopyButton value={tx.reference_id} />
              </span>
            </Row>
            <Row label="Balance after">
              <span className="tabular font-medium">{formatMoney(tx.balance_after)}</span>
            </Row>
            <Row label="Transaction ID" mono>
              <span className="inline-flex items-center gap-1">
                {tx.id} <CopyButton value={tx.id} />
              </span>
            </Row>
            <Row label="Account ID" mono>
              <Link to={`/accounts/${tx.account_id}`} onClick={onClose} className="text-accent hover:underline">
                {tx.account_id}
              </Link>
            </Row>
            {tx.transfer_id && (
              <Row label="Transfer ID" mono>
                {tx.transfer_id}
              </Row>
            )}
          </dl>

          <div className="mt-5 flex gap-2.5 rounded-lg border border-border bg-canvas px-3 py-2.5 text-xs leading-5 text-muted">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-subtle" />
            Ledger entries are immutable. They can't be edited or deleted through the API, and the database rejects
            any UPDATE or DELETE. Corrections are made with a new, offsetting transaction.
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
