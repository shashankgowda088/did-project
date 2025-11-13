DID & VC Backend Demo

Files:
- server.js       : Express backend with endpoints for upload, issue, verify, revoke, list VCs
- package.json    : Node dependencies
- data/           : runtime directory for uploads, vcs.json, revocations.json
- .env.example    : example environment variables

Setup:
1. Install dependencies:
   cd backend
   npm install

2. Create .env with ISSUER_PRIVATE_KEY:
   export ISSUER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   export PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

3. Start server:
   npm start
   (or use npm run dev with nodemon)

Notes:
- This demo uses did-jwt-vc to create JWT-format VCs. The issuer private key (Ethereum key) must be provided in ISSUER_PRIVATE_KEY.
- Uploads are stored in backend/data/uploads and a fake CID is returned (sha256-based). To integrate with real IPFS, set IPFS_API_URL and extend the upload endpoint to call ipfs-http-client.
- VCs issued via /api/issue are stored in data/vcs.json.
