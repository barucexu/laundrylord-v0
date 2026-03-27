import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useArchivedRenters } from "@/hooks/useSupabaseData";
import { ArrowLeft } from "lucide-react";

export default function RenterArchive() {
  const { data: renters = [], isLoading } = useArchivedRenters();

  return (
    <div className="space-y-5">
      <div>
        <Link to="/renters" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Renters
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Renter Archive</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{renters.length} archived renter{renters.length !== 1 ? "s" : ""}</p>
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
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renters.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to={`/renters/${r.id}`} className="font-medium text-sm text-primary hover:underline">{r.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{r.phone || "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {new Date(r.updated_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {renters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    No archived renters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
