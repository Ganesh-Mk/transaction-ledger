import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { BookOpen, ExternalLink, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreateAccountModal } from "@/features/accounts/CreateAccountModal";
import { API_DOCS_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useServerStatus } from "@/lib/serverStatus";
import { BrandMark } from "./BrandMark";
import { isActive, NAV } from "./nav";
import { ServerStatusPill, ServerWakeScreen } from "./ServerStatus";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((group) => (
        <div key={group.group}>
          <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-widest text-subtle uppercase">{group.group}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition",
                    active
                      ? "bg-accent-soft font-medium text-accent-700"
                      : "text-muted hover:bg-surface-raised hover:text-primary",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-accent" : "text-subtle")} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-widest text-subtle uppercase">Developers</p>
        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted transition hover:bg-surface-raised hover:text-primary"
        >
          <BookOpen className="size-4 text-subtle" />
          API reference
          <ExternalLink className="ml-auto size-3 text-subtle" />
        </a>
      </div>
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-border p-3">
      <div className="rounded-lg border border-border bg-surface p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-subtle uppercase">API</span>
          <ServerStatusPill className="border-0 bg-transparent px-0 py-0 shadow-none" />
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-subtle">Node · Express · PostgreSQL</p>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { state } = useServerStatus();
  const { pathname } = useLocation();
  const online = state === "online";

  // Scroll to top on route change.
  useEffect(() => {
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-canvas lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <BrandMark />
        </div>
        <NavLinks />
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="lg-fade-in absolute inset-0 bg-primary/30 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <aside className="lg-slide-in-right absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-canvas shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <BrandMark />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-muted hover:bg-surface-raised"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-md p-1.5 text-muted hover:bg-surface-raised lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="text-sm font-semibold text-primary lg:hidden">
            Ledger
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ServerStatusPill className="hidden sm:inline-flex" />
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition hover:bg-surface-raised hover:text-primary md:inline-flex"
            >
              <BookOpen className="size-4" /> Docs
            </a>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!online}>
              <Plus /> New account
            </Button>
          </div>
        </header>

        <main id="main" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
            {online ? <Outlet /> : <ServerWakeScreen />}
          </div>
        </main>
      </div>

      <CreateAccountModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
