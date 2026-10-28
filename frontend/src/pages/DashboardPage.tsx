import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Landmark,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar, EmptyState, PageHeader, StatTile } from "@/components/ui/misc";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/components/ui/Table";
import { CreateAccountModal } from "@/features/accounts/CreateAccountModal";
import { useAccounts, useStats, useTransfers } from "@/features/queries";
import { TransferModal } from "@/features/transfers/TransferModal";
import { formatMoney, formatMoneyCompact, formatNumber, formatRelative } from "@/lib/format";

export function DashboardPage() {
  const stats = useStats();
  const accounts = useAccounts({ page: 1, limit: 6 });
  const transfers = useTransfers({ page: 1, limit: 5 });
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const s = stats.data;

  return (
    <div className="lg-fade-up space-y-6">
      <PageHeader
        title="Dashboard"
        description="Balances, activity and money movement across every ledger account."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight /> Transfer
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Users /> New account
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total balance"
          icon={Wallet}
          loading={stats.isLoading}
          value={s ? formatMoneyCompact(s.total_balance) : "—"}
          sub="Held across all accounts"
        />
        <StatTile
          label="Accounts"
          icon={Users}
          tone="neutral"
          loading={stats.isLoading}
          value={s ? formatNumber(s.total_accounts) : "—"}
          sub="Open ledger accounts"
        />
        <StatTile
          label="Total credited"
          icon={ArrowDownLeft}
          tone="success"
          loading={stats.isLoading}
          value={s ? formatMoneyCompact(s.total_credited) : "—"}
          sub={s ? `${formatNumber(s.total_transactions)} transactions in total` : undefined}
        />
        <StatTile
          label="Total debited"
          icon={ArrowUpRight}
          tone="danger"
          loading={stats.isLoading}
          value={s ? formatMoneyCompact(s.total_debited) : "—"}
          sub={s ? `${formatNumber(s.total_transfers)} transfers` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <CardHeader
            title="Recent accounts"
            description="Newest first"
            actions={
              <ButtonLink to="/accounts" variant="ghost" size="xs">
                View all <ArrowRight />
              </ButtonLink>
            }
          />
          {accounts.isLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : accounts.data?.data.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Account</TH>
                  <TH className="text-right">Balance</TH>
                  <TH className="hidden text-right sm:table-cell">Opened</TH>
                </tr>
              </THead>
              <tbody>
                {accounts.data.data.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Link to={`/accounts/${a.id}`} className="group flex items-center gap-2.5">
                        <Avatar name={a.name} size="sm" />
                        <span className="truncate font-medium group-hover:text-accent">{a.name}</span>
                      </Link>
                    </TD>
                    <TD className="tabular text-right font-medium">{formatMoney(a.balance)}</TD>
                    <TD className="hidden text-right text-muted sm:table-cell">{formatRelative(a.created_at)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Landmark}
              title="No accounts yet"
              description="Create your first account, then credit it to get started."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Create account
                </Button>
              }
            />
          )}
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Recent transfers"
            actions={
              <ButtonLink to="/transfers" variant="ghost" size="xs">
                View all <ArrowRight />
              </ButtonLink>
            }
          />
          {transfers.isLoading ? (
            <TableSkeleton rows={4} cols={2} />
          ) : transfers.data?.data.length ? (
            <ul className="divide-y divide-border">
              {transfers.data.data.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <ArrowLeftRight className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">
                      {t.from_account_name} <span className="text-subtle">→</span> {t.to_account_name}
                    </p>
                    <p className="text-[11px] text-subtle">{formatRelative(t.created_at)}</p>
                  </div>
                  <span className="tabular text-[13px] font-semibold">{formatMoney(t.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transfers yet"
              description="Move money between two accounts atomically."
              action={
                <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                  New transfer
                </Button>
              }
            />
          )}
        </Card>
      </div>

      <CreateAccountModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  );
}
