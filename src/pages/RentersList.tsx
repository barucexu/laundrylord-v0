import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useRenters } from "@/hooks/useSupabaseData";
import { useSubscription } from "@/hooks/useSubscription";
import { getNextUpgradeTierForCount, tierUpgradeLabel } from "@/lib/pricing-tiers";
import { Search, Plus } from "lucide-react";
import { CreateRenterDialog } from "@/components/CreateRenterDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UpgradeConfirmDialog } from "@/components/UpgradeConfirmDialog";

export default function RentersList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: renters = [], isLoading } = useRenters();
  const { canAddRenter, tier, renterCount, checkout, loading: planLoading } = useSubscription();
  const upgradeTarget = getNextUpgradeTierForCount(renterCount);

  const filtered = renters.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || (r.phone || "").includes(search);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Renters</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-muted-foreground">{filtered.length} renters</p>
            <Link to="/renters/archive" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              View Archive
            </Link>
          </div>
        </div>
        {planLoading ? (
          <Button size="sm" disabled className="opacity-50">
            <Plus className="h-4 w-4 mr-1" /> Add Renter
          </Button>
        ) : canAddRenter ? (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Renter
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary" className="opacity-70">
                <Plus className="h-4 w-4 mr-1" /> Add Renter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-xs">
              <p className="font-medium text-sm">You've grown to {billableCount} billable renter{billableCount !== 1 ? "s" : ""}!</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tierUpgradeLabel(upgradeTarget || tier)} to {tier.price === 0 ? "keep growing" : "add more renters"}.
              </p>
              {upgradeTarget?.price_id && (
                <Button size="sm" className="w-full mt-3" onClick={() => checkout(upgradeTarget.price_id)}>
                  {tierUpgradeLabel(upgradeTarget)}
                </Button>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="termination_requested">Term. Requested</SelectItem>
            <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Paid Through</TableHead>
                <TableHead className="text-right">Days Late</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to={`/renters/${r.id}`} className="font-medium text-sm text-primary hover:underline">{r.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{r.phone || '—'}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(r.balance) > 0 ? <span className="text-destructive font-medium">${Number(r.balance).toFixed(2)}</span> : <span className="text-muted-foreground">$0.00</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.paid_through_date || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {r.days_late > 0 ? <span className="text-destructive font-medium">{r.days_late}</span> : <span className="text-muted-foreground">0</span>}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {renters.length === 0 ? "No renters yet. Click \"Add Renter\" to create one." : "No renters match your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateRenterDialog open={dialogOpen} onOpenChange={setDialogOpen} canAddRenter={canAddRenter} />
      {upgradeIntent && (
        <UpgradeConfirmDialog
          open={!!upgradeIntent}
          onOpenChange={(open) => { if (!open) cancelUpgrade(); }}
          tierName={upgradeIntent.tierName}
          tierLabel={upgradeIntent.tierLabel}
          isUpgrade={upgradeIntent.isUpgrade}
          loading={upgradeProcessing}
          onConfirm={confirmUpgrade}
        />
      )}
    </div>
  );
}
