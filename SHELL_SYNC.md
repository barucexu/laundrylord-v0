# Shell Sync Rules

Demo and real accounts must share the same shell and sidebar implementation.

Rules:
- Use the shared shell for both demo and authenticated routes.
- Demo-only differences must be opt-in variants only.
- Demo-only differences are limited to things like the demo banner, create-account CTA, demo footer text, and demo route prefixing.
- Do not create a separate demo sidebar or demo layout styling path just to make visual changes.
- Any shell or sidebar change must be made in the shared shell/sidebar so demo and real stay in sync automatically.

Why:
- Shared page routes already prove the product pages can render identically.
- Visual drift happens when demo and real duplicate shell code.
- Collapsed sidebar bugs should be fixed once in the shared implementation, not patched twice.
