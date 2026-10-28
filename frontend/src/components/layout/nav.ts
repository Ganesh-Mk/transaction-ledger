import { ArrowLeftRight, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Match nested routes too (e.g. /accounts/:id). */
  matchPrefix?: boolean;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    group: "Ledger",
    items: [
      { label: "Accounts", to: "/accounts", icon: Users, matchPrefix: true },
      { label: "Transfers", to: "/transfers", icon: ArrowLeftRight, matchPrefix: true },
    ],
  },
];

export function isActive(pathname: string, item: NavItem) {
  return item.matchPrefix ? pathname === item.to || pathname.startsWith(`${item.to}/`) : pathname === item.to;
}
