import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreatePayment, useUpdateRenter, type RenterRow } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renter: RenterRow;
}

const PAYMENT_SOURCES = [
  { value: "stripe", label: "Stripe" },
  { value: "square", label: "Square" },
  { value: "zelle", label: "Zelle" },
  { value: "venmo", label: "Venmo" },
  { value: "cashapp", label: "CashApp" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export function RecordPaymentDialog({ open, onOpenChange, renter }: RecordPaymentDialogProps) {
  const createPayment = useCreatePayment();
  const updateRenter = useUpdateRenter();
  const [paidDate, setPaidDate] = useState<Date>(new Date());
  const [form, setForm] = useState({
    amount: String(renter.monthly_rate),
    source: "cash",
    notes: "",
    type: "rent",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const dateStr = format(paidDate, "yyyy-MM-dd");
      await createPayment.mutateAsync({
        renter_id: renter.id,
        amount,
        due_date: dateStr,
        paid_date: dateStr,
        status: "paid",
        type: form.type,
        payment_source: form.source,
        payment_notes: form.notes,
      });

      // Update renter balance
      const newBalance = Math.max(0, Number(renter.balance) - amount);
      const newRentCollected = Number(renter.rent_collected || 0) + amount;
      await updateRenter.mutateAsync({
        id: renter.id,
        balance: newBalance,
        rent_collected: newRentCollected,
        ...(newBalance === 0 ? { days_late: 0, paid_through_date: dateStr } : {}),
      });

      toast.success(`$${amount.toFixed(2)} payment recorded via ${form.source}`);
      onOpenChange(false);
      setForm({ amount: String(renter.monthly_rate), source: "cash", notes: "", type: "rent" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to record payment"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Log a manual payment for {renter.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="install_fee">Install Fee</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="late_fee">Late Fee</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(paidDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={paidDate} onSelect={d => d && setPaidDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Zelle confirmation #12345"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
