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
import { formatCurrency, type SaasUpgradePreview } from "@/lib/saas-upgrade-preview";
import { Loader2 } from "lucide-react";

interface UpgradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierName: string;
  tierLabel: string;
  isUpgrade: boolean;
  loading: boolean;
  preview: SaasUpgradePreview | null;
  previewLoading: boolean;
  onConfirm: () => void;
}

export function UpgradeConfirmDialog({
  open,
  onOpenChange,
  tierName,
  tierLabel,
  isUpgrade,
  loading,
  preview,
  previewLoading,
  onConfirm,
}: UpgradeConfirmDialogProps) {
  const amountDueToday = preview ? formatCurrency(Math.abs(preview.amountDueNow), preview.currency) : null;

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
            {previewLoading ? (
              <p>Calculating today&apos;s charge…</p>
            ) : preview ? (
              <>
                <p>
                  {preview.isCredit
                    ? `Stripe should apply a ${amountDueToday} credit today.`
                    : `Amount due today: ${amountDueToday}.`}
                </p>
                {preview.unusedTimeCredit > 0 && (
                  <p>
                    Includes a {formatCurrency(preview.unusedTimeCredit, preview.currency)} credit for unused time on your current plan.
                  </p>
                )}
                {preview.proratedCharge > 0 && (
                  <p>
                    Includes {formatCurrency(preview.proratedCharge, preview.currency)} in proration adjustments.
                  </p>
                )}
                {preview.nextRenewalAmount !== null && (
                  <p>
                    Your next full renewal will be {formatCurrency(preview.nextRenewalAmount, preview.currency)}.
                  </p>
                )}
              </>
            ) : isUpgrade && (
              <p>
                Your card or bank account will be charged now, and your new billing cycle will restart today.
              </p>
            )}
            {!preview && !isUpgrade && (
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
          <AlertDialogAction onClick={onConfirm} disabled={loading || previewLoading}>
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
