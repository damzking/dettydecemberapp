---
name: Whop test environment
description: Test-only payment requirement and observed connector environment mismatch.
---
Stage 4 must remain test-only unless the user explicitly changes that requirement.

**Why:** The connected Whop credential successfully read products from the production API but received HTTP 401 from the sandbox API. General platform documentation described development payments as test payments, so connection status alone was insufficient evidence.

**How to apply:** Recheck sandbox authentication when the connection changes. Do not enable production checkout or assume production-hosted checkout uses test money. Use Whop's documented sandbox and verify its checkout host before allowing payment redirects.
