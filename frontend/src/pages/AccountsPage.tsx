import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InputGroup } from "@/components/ui/Field";
import { Avatar, EmptyState, IdChip, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/components/ui/Table";
import { CreateAccountModal } from "@/features/accounts/CreateAccountModal";
import { useAccounts } from "@/features/queries";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatRelative, shortId } from "@/lib/format";

export function AccountsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Number(params.get("limit")) || 20;
  const search = params.get("q") ?? "";
  const [draft, setDraft] = useState(search);
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  // Debounce the search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== search) setParams((p) => (draft ? p.set("q", draft) : p.delete("q"), p.delete("page"), p));
    }, 250);
    return () => clearTimeout(t);
  }, [draft, search, setParams]);

  const query = useAccounts({ page, limit, search: search || undefined });
  const set = (key: string, value: number) => setParams((p) => (p.set(key, String(value)), p));

  return (
    <div className="lg-fade-up space-y-5">
      <PageHeader
        title="Accounts"
        description="Every account holds a running balance backed by its immutable transaction history."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> New account
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <InputGroup
            className="w-full max-w-xs"
            leading={<Search />}
            placeholder="Search by name…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Search accounts"
          />
          {query.isFetching && !query.isLoading && <span className="text-xs text-subtle">Updating…</span>}
        </div>

        {query.isLoading ? (
          <TableSkeleton cols={4} />
        ) : query.data && query.data.data.length > 0 ? (
          <>
            <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>
              <Table>
                <THead>
                  <tr>
                    <TH>Account holder</TH>
                    <TH className="hidden md:table-cell">Account ID</TH>
                    <TH className="text-right">Balance</TH>
                    <TH className="hidden text-right sm:table-cell">Opened</TH>
                  </tr>
                </THead>
                <tbody>
                  {query.data.data.map((a) => (
                    <TR
                      key={a.id}
                      tabIndex={0}
                      onClick={() => navigate(`/accounts/${a.id}`)}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/accounts/${a.id}`)}
                      className="cursor-pointer focus-visible:bg-accent-soft/50 focus-visible:outline-none"
                    >
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={a.name} size="sm" />
                          <span className="truncate font-medium">{a.name}</span>
                        </div>
                      </TD>
                      <TD className="hidden md:table-cell">
                        <IdChip id={a.id} display={shortId(a.id)} />
                      </TD>
                      <TD className="tabular text-right font-semibold">{formatMoney(a.balance)}</TD>
                      <TD className="hidden text-right sm:table-cell">
                        <div className="text-[13px]">{formatDate(a.created_at)}</div>
                        <div className="text-[11px] text-subtle">{formatRelative(a.created_at)}</div>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination
              meta={query.data.pagination}
              noun="accounts"
              onPageChange={(p) => set("page", p)}
              onLimitChange={(l) => setParams((p) => (p.set("limit", String(l)), p.delete("page"), p))}
            />
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={search ? "No matching accounts" : "No accounts yet"}
            description={search ? `Nothing matches “${search}”.` : "Create an account to start recording transactions."}
            action={
              !search && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus /> New account
                </Button>
              )
            }
          />
        )}
      </Card>

      <CreateAccountModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
