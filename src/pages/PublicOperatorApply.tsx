import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import {
  DEFAULT_RESPONSIBILITY_TEMPLATE,
  DRYER_CONNECTION_OPTIONS,
  ELEVATOR_OPTIONS,
  ELECTRIC_PRONG_OPTIONS,
  EQUIPMENT_OPTIONS,
  LAYOUT_OPTIONS,
  PREFERRED_TIMING_OPTIONS,
} from "@/lib/renter-applications";
import outlet3ProngImage from "@/assets/intake/outlet-3prong-real.jpeg";
import outlet4ProngImage from "@/assets/intake/outlet-4prong-real.jpeg";

type PublicProfile = {
  business_name: string;
  responsibility_template: string | null;
  responsibility_version: number;
};

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  email: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  equipment_needed: "washer_and_dryer",
  layout_preference: "side_by_side",
  dryer_connection: "electric",
  electric_prong: "unknown",
  floor_number: "",
  has_elevator: "unknown",
  preferred_timing: "asap",
  preferred_delivery_notes: "",
  notes: "",
  company: "",
};

export default function PublicOperatorApply() {
  const { operatorSlug } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responsibilitiesAccepted, setResponsibilitiesAccepted] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!operatorSlug) {
        setErrorMessage("Application link not found.");
        setLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("public-operator-intake", {
          body: { action: "profile", operatorSlug },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setProfile(data as PublicProfile);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Application link not found."));
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [operatorSlug]);

  const responsibilityText = profile?.responsibility_template || DEFAULT_RESPONSIBILITY_TEMPLATE;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!operatorSlug) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-operator-intake", {
        body: {
          action: "submit-application",
          operatorSlug,
          payload: {
            ...form,
            state: form.state.trim().toUpperCase(),
            floor_number: form.floor_number.trim() ? Number(form.floor_number) : null,
            has_elevator: form.floor_number.trim() ? form.has_elevator : null,
            responsibilities_accepted: responsibilitiesAccepted,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
      setForm(EMPTY_FORM);
      setResponsibilitiesAccepted(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit application"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Application link unavailable</CardTitle>
              <CardDescription>{errorMessage ?? "This operator application page is unavailable."}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-xl">
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardHeader className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <CardTitle>Application received</CardTitle>
              <CardDescription>
                {profile.business_name} received your request and can review it inside LaundryLord.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
              <p>They can now review your address, equipment needs, and delivery notes without extra back-and-forth.</p>
              <Button variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
                Submit another application
              </Button>
              <p className="text-xs">Powered by LaundryLord</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_40%),linear-gradient(180deg,_rgba(15,23,42,0.03),_transparent_30%)] px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{profile.business_name}</CardTitle>
                <CardDescription>New customer application</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Share your washer/dryer rental details below so delivery planning can start faster.
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" required value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address_line1">Street address</Label>
                <Input id="address_line1" required value={form.address_line1} onChange={(event) => setForm((current) => ({ ...current, address_line1: event.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address_line2">Apartment / unit</Label>
                <Input id="address_line2" value={form.address_line2} onChange={(event) => setForm((current) => ({ ...current, address_line2: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" required value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" required maxLength={2} value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">ZIP</Label>
                  <Input id="postal_code" required value={form.postal_code} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipment and delivery details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Equipment needed</Label>
                <Select value={form.equipment_needed} onValueChange={(value) => setForm((current) => ({ ...current, equipment_needed: value }))}>
                  <SelectTrigger aria-label="Equipment needed"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Side-by-side or stackable</Label>
                <Select value={form.layout_preference} onValueChange={(value) => setForm((current) => ({ ...current, layout_preference: value }))}>
                  <SelectTrigger aria-label="Side-by-side or stackable"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dryer connection</Label>
                <Select value={form.dryer_connection} onValueChange={(value) => setForm((current) => ({ ...current, dryer_connection: value }))}>
                  <SelectTrigger aria-label="Dryer connection"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DRYER_CONNECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.dryer_connection === "electric" && (
                <div className="space-y-3 sm:col-span-2">
                  <div className="space-y-2">
                    <Label>Dryer outlet type (if you know it)</Label>
                    <Select value={form.electric_prong} onValueChange={(value) => setForm((current) => ({ ...current, electric_prong: value }))}>
                      <SelectTrigger aria-label="Dryer outlet type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ELECTRIC_PRONG_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      If you are not sure, choose <span className="font-medium">Unknown</span>. You can also text the operator a photo of the outlet.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="overflow-hidden rounded-lg border bg-muted/20">
                      <img src={outlet3ProngImage} alt="Example of a 3-prong dryer outlet" className="h-40 w-full object-cover" />
                      <div className="p-3">
                        <div className="text-sm font-medium">3-prong example</div>
                        <div className="text-xs text-muted-foreground">Older-style outlet with three openings.</div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg border bg-muted/20">
                      <img src={outlet4ProngImage} alt="Example of a 4-prong dryer outlet" className="h-40 w-full object-cover" />
                      <div className="p-3">
                        <div className="text-sm font-medium">4-prong example</div>
                        <div className="text-xs text-muted-foreground">Newer-style outlet with four openings.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="floor_number">What floor is the install on?</Label>
                <Input
                  id="floor_number"
                  inputMode="numeric"
                  min={1}
                  placeholder="1"
                  value={form.floor_number}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    floor_number: event.target.value.replace(/[^0-9]/g, "").slice(0, 2),
                  }))}
                />
                <p className="text-xs text-muted-foreground">Use 1 for ground floor, 2 for second floor, and so on.</p>
              </div>
              <div className="space-y-2">
                <Label>Is there an elevator?</Label>
                <Select
                  value={form.has_elevator}
                  onValueChange={(value) => setForm((current) => ({ ...current, has_elevator: value }))}
                  disabled={!form.floor_number.trim()}
                >
                  <SelectTrigger aria-label="Is there an elevator?"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ELEVATOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">This helps the operator plan crew time and access.</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Preferred delivery timing</Label>
                <Select value={form.preferred_timing} onValueChange={(value) => setForm((current) => ({ ...current, preferred_timing: value }))}>
                  <SelectTrigger aria-label="Preferred delivery timing"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PREFERRED_TIMING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="preferred_delivery_notes">Preferred date/time or notes</Label>
                <Textarea
                  id="preferred_delivery_notes"
                  rows={3}
                  value={form.preferred_delivery_notes}
                  onChange={(event) => setForm((current) => ({ ...current, preferred_delivery_notes: event.target.value }))}
                  placeholder={form.preferred_timing === "asap" ? "Optional notes for delivery timing" : "Tell the operator what timing works best"}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes, gate code, parking, or special instructions</Label>
                <Textarea id="notes" rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer responsibilities acknowledgement</CardTitle>
              <CardDescription>Review and acknowledge before sending the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                {responsibilityText}
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox checked={responsibilitiesAccepted} onCheckedChange={(checked) => setResponsibilitiesAccepted(!!checked)} />
                <div className="space-y-1">
                  <div className="text-sm font-medium">I read and understand these responsibilities.</div>
                  <div className="text-xs text-muted-foreground">
                    This acknowledgement is stored with the submitted application.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <input
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            value={form.company}
            onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
            aria-hidden="true"
          />

          <Button className="w-full" size="lg" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit application
          </Button>
        </form>

        <p className="pb-4 text-center text-xs text-muted-foreground">Powered by LaundryLord</p>
      </div>
    </div>
  );
}
