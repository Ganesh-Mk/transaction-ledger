import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, InputGroup, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toaster";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney, generateReference, parseAmount } from "@/lib/format";
import type { Account, TransactionType } from "@/lib/types";
import { describeError, useInvalidateLedger } from "../queries";

type Errors = Partial<Record<"amount" | "reference_id" | "description", string>>;

export function TransactionModal({
  account,
  initialType,
  open,
  onClose,
}: {
  account: Account;
  initialType: TransactionType;
  open: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState(() => generateReference());
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const toast = useToast();
  const invalidate = useInvalidateLedger();

  useEffect(() => {
    if (open) {
      setType(initialType);
      setAmount("");
      setReference(generateReference(initialType === "credit" ? "CR" : "DR"));
      setDescription("");
      setErrors({});
    }
  }, [open, initialType]);

  const parsed = parseAmount(amount);
  const projected = parsed === null ? null : account.balance + (type === "credit" ? parsed : -parsed);
  const overdraw = type === "debit" && projected !== null && projected < 0;

  const mutation = useMutation({
    mutationFn: () =>
      api.createTransaction(account.id, {
        type,
        amount: parsed!,
        reference_id: reference.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: async (tx) => {
      await invalidate();
      toast.success(
        tx.type === "credit" ? "Credit recorded" : "Debit recorded",
        `${formatMoney(tx.amount)} ${tx.type === "credit" ? "added to" : "deducted from"} ${account.name}. New balance ${formatMoney(tx.balance_after)}.`,
      );
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const fe = err.fieldErrors;
        if (err.code === "DUPLICATE_TRANSACTION") {
          setErrors({ reference_id: "This reference was already used on this account. The original was kept." });
        } else if (err.code === "INSUFFICIENT_BALANCE") {
          setErrors({ amount: err.message });
        } else if (fe.amount || fe.reference_id || fe.description) {
          setErrors({ amount: fe.amount, reference_id: fe.reference_id, description: fe.description });
          return;
        }
      }
      const d = describeError(err);
      toast.error(d.title, d.description, d.code);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (parsed === null) next.amount = "Enter an amount greater than 0 with at most 2 decimals";
    else if (overdraw) next.amount = `Exceeds available balance of ${formatMoney(account.balance)}`;
    if (!reference.trim()) next.reference_id = "Reference is required";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  };

  const isCredit = type === "credit";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCredit ? "Credit account" : "Debit account"}
      description={
        <>
          {account.name} · Available <span className="tabular font-medium text-primary">{formatMoney(account.balance)}</span>
        </>
      }
      icon={isCredit ? <ArrowDownLeft className="text-success" /> : <ArrowUpRight className="text-danger" />}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            type="submit"
            form="tx-form"
            variant={isCredit ? "primary" : "danger"}
            loading={mutation.isPending}
          >
            {isCredit ? "Credit" : "Debit"} {parsed !== null ? formatMoney(parsed) : ""}
          </Button>
        </>
      }
    >
      <form id="tx-form" onSubmit={submit} noValidate className="space-y-4">
        <SegmentedControl
          ariaLabel="Transaction type"
          size="md"
          className="w-full"
          value={type}
          onChange={(t) => {
            setType(t);
            setErrors({});
          }}
          segments={[
            { value: "credit", label: <><ArrowDownLeft className="text-success" /> Credit</> },
            { value: "debit", label: <><ArrowUpRight className="text-danger" /> Debit</> },
          ]}
        />

        <Field label="Amount" htmlFor="tx-amount" error={errors.amount}>
          <InputGroup
            id="tx-amount"
            leading={<span className="text-sm font-medium">₹</span>}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!!errors.amount}
            inputClassName="tabular text-base font-medium"
            autoComplete="off"
          />
        </Field>

        <div
          className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
            overdraw ? "border-danger/25 bg-danger/5" : "border-border bg-canvas",
          )}
        >
          <span className="text-muted">Balance after</span>
          <span className={cn("tabular font-semibold", overdraw ? "text-danger" : "text-primary")}>
            {projected === null ? "—" : formatMoney(projected)}
          </span>
        </div>

        <Field
          label="Reference ID"
          htmlFor="tx-ref"
          error={errors.reference_id}
          hint="Unique per account. Re-sending the same reference never double-posts."
        >
          <InputGroup
            id="tx-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={100}
            aria-invalid={!!errors.reference_id}
            inputClassName="font-mono text-[13px]"
            trailing={
              <button
                type="button"
                title="Generate new reference"
                aria-label="Generate new reference"
                onClick={() => setReference(generateReference(isCredit ? "CR" : "DR"))}
                className="rounded-md p-1.5 text-subtle transition hover:bg-surface-raised hover:text-primary"
              >
                <RefreshCw className="size-3.5" />
              </button>
            }
          />
        </Field>

        <Field label="Description" htmlFor="tx-desc" optional error={errors.description}>
          <Textarea
            id="tx-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            rows={2}
            placeholder={isCredit ? "e.g. Salary for October" : "e.g. Vendor payment"}
          />
        </Field>
      </form>
    </Modal>
  );
}
