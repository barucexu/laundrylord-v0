import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
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
          <CardDescription>Connect your Stripe account to accept payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>Connect Stripe (Coming Soon)</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
