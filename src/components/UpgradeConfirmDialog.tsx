import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BANK_ACCOUNT_RECOMMENDATION } from "@/lib/billing-copy";
import { Loader2 } from "lucide-react";

interface UpgradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierName: string;
  tierLabel: string;
  isUpgrade: boolean;
  loading: boolean;
  onConfirm: () => void;
}

export function UpgradeConfirmDialog({
  open,
  onOpenChange,
  tierName,
  tierLabel,
  isUpgrade,
  loading,
  onConfirm,
}: UpgradeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isUpgrade ? `Upgrade to ${tierName}?` : `Switch to ${tierName}?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You will be billed <span className="font-semibold text-foreground">{tierLabel}</span> for the {tierName} plan.
            </p>
            {isUpgrade && (
              <p>
                Any unused time on your current plan will be credited, and you'll be charged the prorated difference today.
              </p>
            )}
            {!isUpgrade && (
              <p>
                Your payment method on file will be charged immediately.
              </p>
            )}
            <p>
              {BANK_ACCOUNT_RECOMMENDATION}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Processing…
              </>
            ) : (
              `Confirm · ${tierLabel}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
