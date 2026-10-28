import { Link } from "react-router";

export function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-accent">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <path d="M10 9v14h12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M15 18l3.5-3.5L21 17l3-3.5"
          fill="none"
          stroke="#bfdbfe"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-tight text-primary">Ledger</span>
        <span className="mt-0.5 block text-[11px] text-subtle">Transaction console</span>
      </span>
    </Link>
  );
}
