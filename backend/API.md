API Reference - DID & VC Backend

Base URL: http://localhost:3000

1) POST /api/upload
   - Description: Upload a file (multipart/form-data 'file') — stored on server; returns a demo CID.
   - Response: { cid, filename, storedPath }

2) POST /api/issue
   - Description: Issue a VC using the server's issuer key (ISSUER_PRIVATE_KEY).
   - Body (JSON): { subject: 'did:...', type: 'IdentityCredential', claim: { ... } }
   - Response: { jwt, vc }

3) POST /api/verify
   - Description: Verify a JWT VC or a JSON VC+signature.
   - Body: either raw JWT string or JSON { vc: {...}, signature: '0x...' } or { jwt: '...' }
   - Response: verification details and revoked flag.

4) POST /api/revoke
   - Description: Revoke a credential by id (local file-backed revocation list).
   - Body: { id: 'vc-xxxxx' }
   - Response: { revoked: id }

5) GET /api/vcs
   - Description: List VCs issued by backend (reads data/vcs.json)
   - Response: array of stored VC objects
