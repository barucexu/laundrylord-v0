import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateRenter } from "@/hooks/useSupabaseData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateRenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRenterDialog({ open, onOpenChange }: CreateRenterDialogProps) {
  const createRenter = useCreateRenter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    monthly_rate: "150",
    notes: "",
  });

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
        monthly_rate: parseFloat(form.monthly_rate) || 150,
        notes: form.notes.trim(),
        status: "lead",
      });
      toast.success(`${form.name} added as a new lead`);
      setForm({ name: "", phone: "", email: "", address: "", monthly_rate: "150", notes: "" });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create renter");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
          <div className="space-y-2">
            <Label htmlFor="r-rate">Monthly Rate ($)</Label>
            <Input id="r-rate" type="number" step="0.01" value={form.monthly_rate} onChange={e => setForm(f => ({ ...f, monthly_rate: e.target.value }))} />
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
