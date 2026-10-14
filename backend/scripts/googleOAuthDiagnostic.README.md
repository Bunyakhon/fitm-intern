# Google Workspace diagnostic — Development only

This tool checks a Google-issued ID token with the existing Backend verifier. It never loads Database models or the application authentication service, and never issues an Application JWT or session. It does not change the Google Cloud audience, flags or hosted-domain allowlist.

Start explicitly from the repository root, while the existing Frontend development server is running:

```powershell
node backend/scripts/googleOAuthDiagnostic.js --start-development-diagnostic
```

Open `http://localhost:5173/oauth-hd-diagnostic.html` in Microsoft Edge. The user clicks the preparation button, then the Google button, and chooses their own student account. The verifier listens exclusively on `127.0.0.1:5001`, checks the exact Host and Development Origin, and rejects other origins. The page is absent from Vite production entrypoints and was checked against the production build.

Challenges use random nonce/request secrets, SHA-256 hashes in memory, a two-minute expiry, and consumption before asynchronous verification to prevent replay/concurrent reuse. The existing verifier checks Google's RSA signature, issuer, audience, optional azp, expiration, issued-at and nonce presence. The diagnostic additionally checks nonce equality, email_verified, student email domain and subject presence. Only verified, syntactically valid hd and verification statuses are returned.

No credential is sent in a URL, printed, saved to disk, stored in browser storage, or included in the sanitized result. Do not capture request bodies or HAR files. The only saved provider evidence is `docs/audits/evidence/google-oauth-hd-diagnostic/provider-result.json`, containing hd and verification statuses. The production flags must remain false.

A completed verification, explicit provider error report, cancellation, or twenty-minute timeout clears pending challenges and closes the verifier process. Buffer copies are cleared where possible; JavaScript strings cannot be guaranteed to be physically zeroed. Retained references are removed and process termination releases server memory. Existing evidence is not overwritten; a further run must use a separately reviewed output directory rather than deleting prior evidence.

Google popup rejection without a returned credential cannot be read directly by the verifier. The user selects the visible error code on the diagnostic page; evidence explicitly labels this as user-reported. An org_internal report is an Internal Audience FAIL, with token/nonce verification NOT TESTED.

Tests use synthetic RSA tokens and local HTTP only:

```powershell
node --test backend/test/googleOAuthDiagnostic.test.js backend/test/googleToken.test.js
```
