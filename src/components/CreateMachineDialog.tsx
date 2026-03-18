import { useState } from "react";
import { useCreateMachine } from "@/hooks/useSupabaseData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMachineDialog({ open, onOpenChange }: CreateMachineDialogProps) {
  const createMachine = useCreateMachine();
  const [form, setForm] = useState({
    type: "washer",
    model: "",
    serial: "",
    prong: "",
    condition: "good",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serial.trim()) {
      toast.error("Serial number is required");
      return;
    }
    if (!form.model.trim()) {
      toast.error("Model is required");
      return;
    }

    try {
      await createMachine.mutateAsync({
        type: form.type,
        model: form.model.trim(),
        serial: form.serial.trim(),
        prong: form.prong.trim() || null,
        condition: form.condition,
        notes: form.notes.trim(),
        status: "available",
      });
      toast.success(`Machine ${form.serial} added`);
      setForm({ type: "washer", model: "", serial: "", prong: "", condition: "good", notes: "" });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add machine");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Machine</DialogTitle>
          <DialogDescription>Add a new machine to your inventory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="washer">Washer</SelectItem>
                  <SelectItem value="dryer">Dryer</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-model">Model *</Label>
              <Input id="m-model" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Samsung WF45R" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-serial">Serial # *</Label>
              <Input id="m-serial" value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} placeholder="SN-12345" className="font-mono" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-prong">Prong</Label>
              <Select value={form.prong || "none"} onValueChange={v => setForm(f => ({ ...f, prong: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="3-prong">3-Prong</SelectItem>
                  <SelectItem value="4-prong">4-Prong</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea id="m-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any details..." rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMachine.isPending}>
              {createMachine.isPending ? "Adding..." : "Add Machine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
