import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Info, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { api, ApiError } from "@/lib/api";
import { describeError, useInvalidateLedger } from "../queries";

export function CreateAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const toast = useToast();
  const navigate = useNavigate();
  const invalidate = useInvalidateLedger();

  const close = () => {
    setName("");
    setError(undefined);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: (n: string) => api.createAccount(n),
    onSuccess: async (account) => {
      await invalidate();
      toast.success("Account created", `${account.name} is ready with a balance of ₹0.00.`);
      close();
      navigate(`/accounts/${account.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors.name) return setError(err.fieldErrors.name);
      const d = describeError(err);
      toast.error(d.title, d.description, d.code);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Account holder name is required");
    if (trimmed.length > 100) return setError("Name must be at most 100 characters");
    setError(undefined);
    mutation.mutate(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New account"
      description="Open a ledger account for a customer or entity."
      icon={<UserPlus />}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form="create-account" loading={mutation.isPending}>
            Create account
          </Button>
        </>
      }
    >
      <form id="create-account" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Account holder name" htmlFor="account-name" error={error}>
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ganesh Kumar"
            maxLength={100}
            autoComplete="off"
            aria-invalid={!!error}
          />
        </Field>
        <div className="flex gap-2.5 rounded-lg border border-accent-100 bg-accent-soft/60 px-3 py-2.5 text-xs leading-5 text-accent-800">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Every account starts at <span className="font-semibold">₹0.00</span>. The ID and creation time are assigned
            by the server. Add funds afterwards with a credit.
          </span>
        </div>
      </form>
    </Modal>
  );
}
