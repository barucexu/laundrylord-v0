import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStripeConnection } from "@/hooks/useSupabaseData";
import { CheckCircle, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { data: stripe, isLoading: stripeLoading } = useStripeConnection();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Profile</CardTitle>
          <CardDescription>Your workspace information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" defaultValue="ATL Washer Rentals" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" defaultValue="America/New_York" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing Defaults</CardTitle>
          <CardDescription>Default values for new renters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRate">Default Monthly Rate ($)</Label>
              <Input id="monthlyRate" type="number" defaultValue="150" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installFee">Default Install Fee ($)</Label>
              <Input id="installFee" type="number" defaultValue="75" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Default Deposit ($)</Label>
              <Input id="depositAmount" type="number" defaultValue="0" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateFee">Late Fee Amount ($)</Label>
              <Input id="lateFee" type="number" defaultValue="25" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minTerm">Minimum Term (months)</Label>
              <Input id="minTerm" type="number" defaultValue="6" className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder Timing</CardTitle>
          <CardDescription>When reminders are generated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminderBefore">Days Before Due Date</Label>
              <Input id="reminderBefore" type="number" defaultValue="3" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateFeeAfter">Apply Late Fee After (days)</Label>
              <Input id="lateFeeAfter" type="number" defaultValue="7" className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Connection</CardTitle>
          <CardDescription>Connect your Stripe account to charge renters for monthly rent</CardDescription>
        </CardHeader>
        <CardContent>
          {stripeLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection…
            </div>
          ) : stripe?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-green-700">Connected</div>
                  <div className="text-xs text-muted-foreground">{stripe.account_name}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your Stripe account is linked. You can send card setup links and activate autopay for renters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stripe?.reason === "invalid_key" ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="text-sm font-medium text-destructive">Connection Error</div>
                    <div className="text-xs text-muted-foreground">Your Stripe key appears to be invalid. Please update it.</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Not Connected</div>
                    <div className="text-xs text-muted-foreground">Add your Stripe secret key to start accepting payments.</div>
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>To connect Stripe:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Go to your <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Stripe Dashboard <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Copy your <strong>Secret key</strong> (starts with sk_live_ or sk_test_)</li>
                  <li>Contact your LaundryLord admin to add it as a project secret</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
