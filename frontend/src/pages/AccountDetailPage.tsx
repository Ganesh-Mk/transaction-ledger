import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Receipt,
  SearchX,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar, EmptyState, IdChip } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/Pagination";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { useAccount, useTransactions } from "@/features/queries";
import { TransactionModal } from "@/features/transactions/TransactionModal";
import { TransactionTable } from "@/features/transactions/TransactionTable";
import { TransferModal } from "@/features/transfers/TransferModal";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { TransactionType } from "@/lib/types";

type Filter = "all" | TransactionType;

export function AccountDetailPage() {
  const { accountId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const filter = (["credit", "debit"].includes(params.get("type") ?? "") ? params.get("type") : "all") as Filter;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Number(params.get("limit")) || 10;

  const account = useAccount(accountId);
  const txs = useTransactions(accountId, { page, limit, type: filter === "all" ? undefined : filter });

  const [txModal, setTxModal] = useState<TransactionType | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  if (account.error) {
    const notFound = account.error instanceof ApiError && ["ACCOUNT_NOT_FOUND", "INVALID_ACCOUNT_ID"].includes(account.error.code);
    return (
      <Card className="lg-fade-up">
        <EmptyState
          icon={SearchX}
          title={notFound ? "Account not found" : "Couldn't load this account"}
          description={account.error.message}
          action={
            <ButtonLink to="/accounts" variant="outline" size="sm">
              Back to accounts
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const a = account.data;

  return (
    <div className="lg-fade-up space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted">
        <Link to="/accounts" className="hover:text-primary">
          Accounts
        </Link>
        <ChevronRight className="size-3.5 text-subtle" />
        <span className="truncate font-medium text-primary">{a?.name ?? "…"}</span>
      </nav>

      {/* Account summary */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {a ? <Avatar name={a.name} size="lg" /> : <Skeleton className="size-12 rounded-lg" />}
            <div className="min-w-0">
              {a ? (
                <>
                  <h1 className="truncate text-lg font-semibold tracking-tight">{a.name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <IdChip id={a.id} />
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <CalendarDays className="size-3.5 text-subtle" /> Opened {formatDateTime(a.created_at)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="mt-2 h-3.5 w-64" />
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="md:text-right">
              <p className="text-xs font-medium text-muted">Available balance</p>
              {a ? (
                <p className="tabular mt-0.5 text-[28px] leading-8 font-semibold tracking-tight">{formatMoney(a.balance)}</p>
              ) : (
                <Skeleton className="mt-1.5 h-7 w-36" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!a} onClick={() => setTxModal("credit")}>
                <ArrowDownLeft className="text-success" /> Credit
              </Button>
              <Button size="sm" variant="outline" disabled={!a} onClick={() => setTxModal("debit")}>
                <ArrowUpRight className="text-danger" /> Debit
              </Button>
              <Button size="sm" disabled={!a} onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight /> Transfer
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* History */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Transaction history"
          description="Latest first · click a row for full details"
          actions={
            <SegmentedControl<Filter>
              ariaLabel="Filter by type"
              value={filter}
              onChange={(v) =>
                setParams((p) => {
                  if (v === "all") p.delete("type");
                  else p.set("type", v);
                  p.delete("page");
                  return p;
                })
              }
              segments={[
                { value: "all", label: "All" },
                { value: "credit", label: "Credits" },
                { value: "debit", label: "Debits" },
              ]}
            />
          }
        />
        {txs.isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : txs.data && txs.data.data.length > 0 ? (
          <>
            <div className={cn("transition-opacity", txs.isPlaceholderData && "opacity-60")}>
              <TransactionTable rows={txs.data.data} />
            </div>
            <Pagination
              meta={txs.data.pagination}
              noun="transactions"
              onPageChange={(p) => setParams((s) => (s.set("page", String(p)), s))}
              onLimitChange={(l) => setParams((s) => (s.set("limit", String(l)), s.delete("page"), s))}
            />
          </>
        ) : (
          <EmptyState
            icon={Receipt}
            title={filter === "all" ? "No transactions yet" : `No ${filter}s yet`}
            description={
              filter === "all"
                ? "Credit this account to add its first entry to the ledger."
                : "Try a different filter or record a new transaction."
            }
            action={
              filter === "all" && a ? (
                <Button size="sm" onClick={() => setTxModal("credit")}>
                  <ArrowDownLeft /> Add a credit
                </Button>
              ) : undefined
            }
          />
        )}
      </Card>

      {a && (
        <>
          <TransactionModal
            account={a}
            initialType={txModal ?? "credit"}
            open={txModal !== null}
            onClose={() => setTxModal(null)}
          />
          <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} defaultFromId={a.id} />
        </>
      )}
    </div>
  );
}
