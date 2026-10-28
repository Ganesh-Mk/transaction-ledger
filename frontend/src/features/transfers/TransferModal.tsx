import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeftRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, InputGroup, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { api, ApiError } from "@/lib/api";
import { formatMoney, generateReference, parseAmount } from "@/lib/format";
import { describeError, useInvalidateLedger } from "../queries";

type Errors = Partial<Record<"from" | "to" | "amount" | "reference_id", string>>;

export function TransferModal({
  open,
  onClose,
  defaultFromId,
}: {
  open: boolean;
  onClose: () => void;
  defaultFromId?: string;
}) {
  const [fromId, setFromId] = useState(defaultFromId ?? "");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState(() => generateReference("TRF"));
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const toast = useToast();
  const invalidate = useInvalidateLedger();

  // Pickers list up to 100 accounts (the API's max page size); enough for this console.
  const accounts = useQuery({
    queryKey: ["accounts", "picker"],
    queryFn: () => api.listAccounts({ page: 1, limit: 100 }),
    enabled: open,
  });
  const list = useMemo(() => accounts.data?.data ?? [], [accounts.data]);
  const from = list.find((a) => a.id === fromId);
  const to = list.find((a) => a.id === toId);

  useEffect(() => {
    if (open) {
      setFromId(defaultFromId ?? "");
      setToId("");
      setAmount("");
      setReference(generateReference("TRF"));
      setDescription("");
      setErrors({});
    }
  }, [open, defaultFromId]);

  const parsed = parseAmount(amount);

  const mutation = useMutation({
    mutationFn: () =>
      api.createTransfer({
        from_account_id: fromId,
        to_account_id: toId,
        amount: parsed!,
        reference_id: reference.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: async (t) => {
      await invalidate();
      toast.success(
        "Transfer completed",
        `${formatMoney(t.amount)} moved from ${from?.name} to ${to?.name}. Both sides were posted atomically.`,
      );
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === "DUPLICATE_TRANSFER") {
          setErrors({ reference_id: "This reference was already used by the source account." });
        } else if (err.code === "INSUFFICIENT_BALANCE") {
          setErrors({ amount: err.message });
        }
      }
      const d = describeError(err);
      toast.error(d.title, d.description, d.code);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!fromId) next.from = "Choose the account to send from";
    if (!toId) next.to = "Choose the account to send to";
    else if (toId === fromId) next.to = "Choose a different account than the source";
    if (parsed === null) next.amount = "Enter an amount greater than 0 with at most 2 decimals";
    else if (from && parsed > from.balance) next.amount = `Exceeds available balance of ${formatMoney(from.balance)}`;
    if (!reference.trim()) next.reference_id = "Reference is required";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Transfer money"
      description="Debit one account and credit another in a single atomic operation."
      icon={<ArrowLeftRight />}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form="transfer-form" loading={mutation.isPending}>
            Transfer {parsed !== null ? formatMoney(parsed) : ""}
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="rounded-xl border border-border bg-canvas p-3">
          <Field label="From" htmlFor="tr-from" error={errors.from}>
            <Select id="tr-from" value={fromId} onChange={(e) => setFromId(e.target.value)} aria-invalid={!!errors.from}>
              <option value="">{accounts.isLoading ? "Loading accounts…" : "Select source account"}</option>
              {list.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {formatMoney(a.balance)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="my-2 flex justify-center">
            <span className="flex size-7 items-center justify-center rounded-full border border-border bg-surface text-subtle shadow-xs">
              <ArrowDown className="size-3.5" />
            </span>
          </div>
          <Field label="To" htmlFor="tr-to" error={errors.to}>
            <Select id="tr-to" value={toId} onChange={(e) => setToId(e.target.value)} aria-invalid={!!errors.to}>
              <option value="">Select destination account</option>
              {list
                .filter((a) => a.id !== fromId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatMoney(a.balance)}
                  </option>
                ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Amount"
            htmlFor="tr-amount"
            error={errors.amount}
            hint={from ? `Available ${formatMoney(from.balance)}` : undefined}
          >
            <InputGroup
              id="tr-amount"
              leading={<span className="text-sm font-medium">₹</span>}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              inputClassName="tabular font-medium"
              autoComplete="off"
            />
          </Field>
          <Field label="Reference ID" htmlFor="tr-ref" error={errors.reference_id}>
            <InputGroup
              id="tr-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={100}
              aria-invalid={!!errors.reference_id}
              inputClassName="font-mono text-[13px]"
              trailing={
                <button
                  type="button"
                  aria-label="Generate new reference"
                  title="Generate new reference"
                  onClick={() => setReference(generateReference("TRF"))}
                  className="rounded-md p-1.5 text-subtle transition hover:bg-surface-raised hover:text-primary"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              }
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="tr-desc" optional>
          <Textarea
            id="tr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            rows={2}
            placeholder="e.g. Rent split for October"
          />
        </Field>
      </form>
    </Modal>
  );
}
