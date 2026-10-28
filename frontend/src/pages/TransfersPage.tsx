import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeftRight, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar, EmptyState, IdChip, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/components/ui/Table";
import { useTransfers } from "@/features/queries";
import { TransferModal } from "@/features/transfers/TransferModal";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney } from "@/lib/format";

function AccountCell({ id, name }: { id: string; name: string }) {
  return (
    <Link to={`/accounts/${id}`} className="group flex min-w-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Avatar name={name} size="sm" />
      <span className="truncate font-medium group-hover:text-accent">{name}</span>
    </Link>
  );
}

export function TransfersPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Number(params.get("limit")) || 20;
  const [open, setOpen] = useState(false);
  const query = useTransfers({ page, limit });

  return (
    <div className="lg-fade-up space-y-5">
      <PageHeader
        title="Transfers"
        description="Each transfer debits the source and credits the destination in one database transaction. It's all or nothing."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> New transfer
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <TableSkeleton cols={4} />
        ) : query.data && query.data.data.length > 0 ? (
          <>
            <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>
              <Table>
                <THead>
                  <tr>
                    <TH>From</TH>
                    <TH className="w-8" />
                    <TH>To</TH>
                    <TH className="hidden lg:table-cell">Reference</TH>
                    <TH className="text-right">Amount</TH>
                    <TH className="hidden text-right md:table-cell">Date</TH>
                  </tr>
                </THead>
                <tbody>
                  {query.data.data.map((t) => (
                    <TR key={t.id}>
                      <TD className="max-w-48">
                        <AccountCell id={t.from_account_id} name={t.from_account_name} />
                      </TD>
                      <TD className="px-0 text-subtle">
                        <ArrowRight className="size-4" />
                      </TD>
                      <TD className="max-w-48">
                        <AccountCell id={t.to_account_id} name={t.to_account_name} />
                      </TD>
                      <TD className="hidden lg:table-cell">
                        <IdChip id={t.reference_id} />
                        {t.description && <div className="truncate text-[11px] text-subtle">{t.description}</div>}
                      </TD>
                      <TD className="tabular text-right font-semibold whitespace-nowrap">{formatMoney(t.amount)}</TD>
                      <TD className="hidden text-right whitespace-nowrap text-muted md:table-cell">
                        {formatDateTime(t.created_at)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination
              meta={query.data.pagination}
              noun="transfers"
              onPageChange={(p) => setParams((s) => (s.set("page", String(p)), s))}
              onLimitChange={(l) => setParams((s) => (s.set("limit", String(l)), s.delete("page"), s))}
            />
          </>
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transfers yet"
            description="Move money between two accounts. Both sides are recorded atomically, and a partial transfer can't happen."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus /> New transfer
              </Button>
            }
          />
        )}
      </Card>

      <TransferModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
