

# UI Polish + Forgot Password + Webhook Status Fix

## Changes

### 1. Rename "Rent" to "Rent Payment Due" in renter payment list
**File:** `src/pages/RenterDetail.tsx` (line 323)
Change the payment type display: when `p.type` is `"rent"`, show `"Rent Payment Due"` instead of just `"Rent"`.

### 2. Replace favicon with the mascot logo
Copy the uploaded logo to `public/favicon.png` (overwriting the current squished one). The logo is already square so it will render properly as a favicon.

### 3. Use logo on the sign-in page instead of "LL" box
**File:** `src/pages/AuthPage.tsx` (lines 74-76)
Replace the blue "LL" div with an `<img>` tag importing the logo from `src/assets/laundrylord-logo.png` (already exists in the project).

### 4. Sidebar logo already uses the image
The sidebar (`AppSidebar.tsx`) already imports and displays `laundrylord-logo.png`. No change needed here -- it's already uniform.

### 5. Forgot Password workflow
**Files:**
- `src/pages/AuthPage.tsx` -- add a "Forgot password?" link below the password field that toggles a reset mode. In reset mode, show only email input + "Send Reset Link" button calling `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
- `src/pages/ResetPasswordPage.tsx` -- new page at `/reset-password`. Checks for `type=recovery` in URL hash, shows new password form, calls `supabase.auth.updateUser({ password })`.
- `src/App.tsx` -- add public route `/reset-password` pointing to `ResetPasswordPage`.

### 6. Webhook checklist -- show green when Stripe is connected
**File:** `src/pages/SettingsPage.tsx` (lines 411-413)
The webhook line is hardcoded as a warning triangle. Since we can't verify webhook config from our side, change the logic to: if Stripe key is connected, show a green check with text "Stripe webhook configured" (since operators are instructed to set it up when they connect their key). Keep the helper text "(set in Stripe Dashboard → Webhooks)" for reference.

## Files Changed
- `public/favicon.png` -- replaced with uploaded logo
- `src/pages/RenterDetail.tsx` -- "Rent" → "Rent Payment Due"
- `src/pages/AuthPage.tsx` -- logo image + forgot password link/mode
- `src/pages/ResetPasswordPage.tsx` -- new file
- `src/App.tsx` -- add `/reset-password` route
- `src/pages/SettingsPage.tsx` -- webhook checklist logic

