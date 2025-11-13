STEPS — Full project steps and next actions

1) Run backend locally
   - cd backend
   - npm install
   - export ISSUER_PRIVATE_KEY=0xYOURKEY
   - export PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
   - npm start
   - Server listens on PORT (default 3000)

2) Serve frontend
   - Option A: open frontend/index.html directly in browser
   - Option B: serve via a static server (e.g., `npx serve frontend`)

3) Test flow
   - Create wallet in frontend or import private key
   - Upload file to backend via "Upload to Backend"
   - Click "Request Backend Issuer" to have backend issue a JWT VC
   - Use "Verify via Backend" to verify the credential

4) Replace simulated CID with real IPFS
   - Add ipfs-http-client and call from server.js /upload to pin files

5) Production improvements
   - Use Veramo Agent for full DID management and selective disclosure
   - Use a secure KMS for issuer keys
   - Add on-chain revocation registry (Hardhat + Solidity) or a signed status list on IPFS
