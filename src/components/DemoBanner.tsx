import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export function DemoBanner() {
  const navigate = useNavigate();

  return (
    <div className="bg-muted/80 border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-sm shrink-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs">You're in Demo Mode. Changes won't be saved.</span>
      </div>
      <Button size="sm" variant="default" className="h-7 text-xs px-3" onClick={() => navigate("/auth")}>
        Create Account
      </Button>
    </div>
  );
}
