import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useEntityCustomFields, useUpdateMachine, useUpsertCustomFieldValues, type MachineRow } from "@/hooks/useSupabaseData";
import { normalizeEditableMachineStatus } from "@/lib/machine-assignment";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface EditMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: MachineRow;
}

export function EditMachineDialog({ open, onOpenChange, machine }: EditMachineDialogProps) {
  const updateMachine = useUpdateMachine();
  const upsertCustomFieldValues = useUpsertCustomFieldValues("machine");
  const { data: customFields = [] } = useEntityCustomFields("machine", open ? machine.id : undefined);
  const [form, setForm] = useState({
    type: machine.type,
    model: machine.model,
    serial: machine.serial,
    prong: machine.prong || "",
    condition: machine.condition || "",
    notes: machine.notes || "",
    status: normalizeEditableMachineStatus(machine.status),
    cost_basis: String(machine.cost_basis || 0),
    sourced_from: machine.sourced_from || "",
  });
  const [customFieldForm, setCustomFieldForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({
        type: machine.type,
        model: machine.model,
        serial: machine.serial,
        prong: machine.prong || "",
        condition: machine.condition || "",
        notes: machine.notes || "",
        status: normalizeEditableMachineStatus(machine.status),
        cost_basis: String(machine.cost_basis || 0),
        sourced_from: machine.sourced_from || "",
      });
    }
  }, [open, machine]);

  useEffect(() => {
    if (open) {
      setCustomFieldForm(
        Object.fromEntries(customFields.map((field) => [field.field_definition_id, field.value])),
      );
    }
  }, [open, customFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.model || !form.serial) {
      toast.error("Model and serial are required");
      return;
    }
    try {
      await updateMachine.mutateAsync({
        id: machine.id,
        type: form.type,
        model: form.model,
        serial: form.serial,
        prong: form.prong || null,
        condition: form.condition,
        notes: form.notes,
        status: form.status,
        cost_basis: parseFloat(form.cost_basis) || 0,
        sourced_from: form.sourced_from,
      });
      await upsertCustomFieldValues.mutateAsync({
        entityId: machine.id,
        values: customFields.map((field) => ({
          field_definition_id: field.field_definition_id,
          value: customFieldForm[field.field_definition_id] ?? "",
        })),
      });
      toast.success("Machine updated");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update machine"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Machine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
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
            <Label>Model</Label>
            <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Serial</Label>
            <Input value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prong</Label>
              <Select value={form.prong || "none"} onValueChange={v => setForm(f => ({ ...f, prong: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="3-prong">3-Prong</SelectItem>
                  <SelectItem value="4-prong">4-Prong</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={form.condition || "none"} onValueChange={v => setForm(f => ({ ...f, condition: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cost Basis ($)</Label>
              <Input type="number" step="0.01" value={form.cost_basis} onChange={e => setForm(f => ({ ...f, cost_basis: e.target.value }))} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Sourced From</Label>
              <Input value={form.sourced_from} onChange={e => setForm(f => ({ ...f, sourced_from: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          {customFields.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label>Custom Fields</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imported custom fields stay separate from Notes.
                  </p>
                </div>
                {customFields.map((field) => (
                  <div key={field.field_definition_id} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Input
                      value={customFieldForm[field.field_definition_id] ?? ""}
                      onChange={(e) =>
                        setCustomFieldForm((current) => ({
                          ...current,
                          [field.field_definition_id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMachine.isPending || upsertCustomFieldValues.isPending}>
              {updateMachine.isPending || upsertCustomFieldValues.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
