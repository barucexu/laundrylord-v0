import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateRenter, useOperatorSettings } from "@/hooks/useSupabaseData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateRenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRenterDialog({ open, onOpenChange }: CreateRenterDialogProps) {
  const createRenter = useCreateRenter();
  const { data: opSettings } = useOperatorSettings();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    monthly_rate: "",
    rent_collected: "0",
    install_fee: "",
    install_fee_collected: false,
    deposit_amount: "",
    deposit_collected: false,
    late_fee: "",
    notes: "",
    secondary_contact: "",
    language: "English",
    install_notes: "",
    dryer_outlet: "",
  });

  const getDefault = (field: string, fallback: string) => {
    if (form[field as keyof typeof form] !== "" && form[field as keyof typeof form] !== false) return form[field as keyof typeof form] as string;
    if (!opSettings) return fallback;
    const map: Record<string, string> = {
      monthly_rate: String(opSettings.default_monthly_rate),
      install_fee: String(opSettings.default_install_fee),
      deposit_amount: String(opSettings.default_deposit),
      late_fee: String(opSettings.late_fee_amount),
    };
    return map[field] || fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      await createRenter.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        monthly_rate: parseFloat(getDefault("monthly_rate", "150")) || 150,
        rent_collected: parseFloat(form.rent_collected) || 0,
        install_fee: parseFloat(getDefault("install_fee", "75")) || 0,
        install_fee_collected: form.install_fee_collected,
        deposit_amount: parseFloat(getDefault("deposit_amount", "0")) || 0,
        deposit_collected: form.deposit_collected,
        late_fee: parseFloat(getDefault("late_fee", "25")) || 25,
        lease_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        notes: form.notes.trim(),
        status: "lead",
        secondary_contact: form.secondary_contact.trim(),
        language: form.language,
        install_notes: form.install_notes.trim(),
        dryer_outlet: form.dryer_outlet || null,
      } as any);
      toast.success(`${form.name} added as a new lead`);
      setForm({ name: "", phone: "", email: "", address: "", monthly_rate: "", rent_collected: "0", install_fee: "", install_fee_collected: false, deposit_amount: "", deposit_collected: false, late_fee: "", notes: "", secondary_contact: "", language: "English", install_notes: "" });
      setStartDate(undefined);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create renter");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Renter</DialogTitle>
          <DialogDescription>Create a new renter record. They'll start as a lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-name">Name *</Label>
            <Input id="r-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Marcus Johnson" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-phone">Phone</Label>
              <Input id="r-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(404) 555-0112" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-email">Email</Label>
              <Input id="r-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@email.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-address">Address</Label>
            <Input id="r-address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Atlanta, GA" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-secondary">Secondary Contact</Label>
              <Input id="r-secondary" value={form.secondary_contact} onChange={e => setForm(f => ({ ...f, secondary_contact: e.target.value }))} placeholder="Name or phone" />
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

          <Separator />

          <div className="space-y-1">
            <h4 className="text-sm font-medium">Financial Terms</h4>
            <p className="text-xs text-muted-foreground">Key money terms for this renter</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-rate">Monthly Rent ($)</Label>
              <Input id="r-rate" type="number" step="0.01" value={form.monthly_rate || getDefault("monthly_rate", "150")} onChange={e => setForm(f => ({ ...f, monthly_rate: e.target.value }))} className="font-mono" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-rent-collected">Rent Collected So Far ($)</Label>
            <Input id="r-rent-collected" type="number" step="0.01" value={form.rent_collected} onChange={e => setForm(f => ({ ...f, rent_collected: e.target.value }))} className="font-mono" placeholder="0" />
            <p className="text-xs text-muted-foreground">Monthly rent already collected — not deposit or install fee</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-install-fee">Install Fee ($)</Label>
              <Input id="r-install-fee" type="number" step="0.01" value={form.install_fee || getDefault("install_fee", "75")} onChange={e => setForm(f => ({ ...f, install_fee: e.target.value }))} className="font-mono" />
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="r-install-collected" checked={form.install_fee_collected} onCheckedChange={(checked) => setForm(f => ({ ...f, install_fee_collected: !!checked }))} />
                <Label htmlFor="r-install-collected" className="text-sm font-normal">Collected</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-deposit">Deposit ($)</Label>
              <Input id="r-deposit" type="number" step="0.01" value={form.deposit_amount || getDefault("deposit_amount", "0")} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} className="font-mono" />
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="r-deposit-collected" checked={form.deposit_collected} onCheckedChange={(checked) => setForm(f => ({ ...f, deposit_collected: !!checked }))} />
                <Label htmlFor="r-deposit-collected" className="text-sm font-normal">Collected</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-late-fee">Late Fee ($)</Label>
            <Input id="r-late-fee" type="number" step="0.01" value={form.late_fee || getDefault("late_fee", "25")} onChange={e => setForm(f => ({ ...f, late_fee: e.target.value }))} className="font-mono" />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="r-install-notes">Install Notes</Label>
            <Textarea id="r-install-notes" value={form.install_notes} onChange={e => setForm(f => ({ ...f, install_notes: e.target.value }))} placeholder="Access instructions, prong type needed, etc." rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-notes">Notes</Label>
            <Textarea id="r-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant details..." rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createRenter.isPending}>
              {createRenter.isPending ? "Creating..." : "Add Renter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
