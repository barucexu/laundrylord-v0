import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useUpdateRenter, type RenterRow } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface EditRenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renter: RenterRow;
}

const ALL_STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "late", label: "Late" },
  { value: "maintenance", label: "Maintenance" },
  { value: "termination_requested", label: "Termination Requested" },
  { value: "pickup_scheduled", label: "Pickup Scheduled" },
  { value: "closed", label: "Closed" },
  { value: "defaulted", label: "Defaulted" },
];

export function EditRenterDialog({ open, onOpenChange, renter }: EditRenterDialogProps) {
  const updateRenter = useUpdateRenter();
  const [form, setForm] = useState({
    name: renter.name,
    phone: renter.phone || "",
    email: renter.email || "",
    address: renter.address || "",
    monthly_rate: String(renter.monthly_rate),
    install_fee: String(renter.install_fee),
    deposit_amount: String(renter.deposit_amount),
    late_fee: String(renter.late_fee),
    notes: renter.notes || "",
    status: renter.status,
    install_fee_collected: renter.install_fee_collected,
    deposit_collected: renter.deposit_collected,
    secondary_contact: (renter as any).secondary_contact || "",
    language: (renter as any).language || "English",
    install_notes: (renter as any).install_notes || "",
  });
  const [startDate, setStartDate] = useState<Date | undefined>(
    renter.lease_start_date ? new Date(renter.lease_start_date + "T00:00:00") : undefined
  );

  useEffect(() => {
    if (open) {
      setForm({
        name: renter.name,
        phone: renter.phone || "",
        email: renter.email || "",
        address: renter.address || "",
        monthly_rate: String(renter.monthly_rate),
        install_fee: String(renter.install_fee),
        deposit_amount: String(renter.deposit_amount),
        late_fee: String(renter.late_fee),
        notes: renter.notes || "",
        status: renter.status,
        install_fee_collected: renter.install_fee_collected,
        deposit_collected: renter.deposit_collected,
        secondary_contact: (renter as any).secondary_contact || "",
        language: (renter as any).language || "English",
        install_notes: (renter as any).install_notes || "",
      });
      setStartDate(renter.lease_start_date ? new Date(renter.lease_start_date + "T00:00:00") : undefined);
    }
  }, [open, renter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await updateRenter.mutateAsync({
        id: renter.id,
        name: form.name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        monthly_rate: parseFloat(form.monthly_rate) || 0,
        install_fee: parseFloat(form.install_fee) || 0,
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        late_fee: parseFloat(form.late_fee) || 0,
        notes: form.notes,
        status: form.status,
        install_fee_collected: form.install_fee_collected,
        deposit_collected: form.deposit_collected,
        lease_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        secondary_contact: form.secondary_contact,
        language: form.language,
        install_notes: form.install_notes,
      } as any);
      toast.success("Renter updated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update renter");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Renter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Secondary Contact</Label>
              <Input value={form.secondary_contact} onChange={e => setForm(f => ({ ...f, secondary_contact: e.target.value }))} placeholder="Name or phone" />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lease Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Monthly Rate ($)</Label>
              <Input type="number" value={form.monthly_rate} onChange={e => setForm(f => ({ ...f, monthly_rate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Late Fee ($)</Label>
              <Input type="number" value={form.late_fee} onChange={e => setForm(f => ({ ...f, late_fee: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Install Fee ($)</Label>
              <Input type="number" value={form.install_fee} onChange={e => setForm(f => ({ ...f, install_fee: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Deposit ($)</Label>
              <Input type="number" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="installCollected"
                checked={form.install_fee_collected}
                onCheckedChange={(checked) => setForm(f => ({ ...f, install_fee_collected: !!checked }))}
              />
              <Label htmlFor="installCollected" className="text-sm">Install Fee Collected</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="depositCollected"
                checked={form.deposit_collected}
                onCheckedChange={(checked) => setForm(f => ({ ...f, deposit_collected: !!checked }))}
              />
              <Label htmlFor="depositCollected" className="text-sm">Deposit Collected</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Install Notes</Label>
            <Textarea value={form.install_notes} onChange={e => setForm(f => ({ ...f, install_notes: e.target.value }))} placeholder="Access instructions, prong type needed..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateRenter.isPending}>
              {updateRenter.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
