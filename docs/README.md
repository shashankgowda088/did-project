DID & VC Full Project (Frontend + Backend)

Structure:
- frontend/    : HTML demo (index.html)
- backend/     : Node.js Express backend (server.js)
- docs/        : Additional notes and steps

Quick start (local):
1. Frontend:
   - Open frontend/index.html in a browser (or serve statically).
2. Backend:
   - cd backend
   - npm install
   - set environment variable ISSUER_PRIVATE_KEY (see backend/.env.example)
   - npm start
3. Point frontend upload / issue backend buttons to http://localhost:3000 (default)

Included:
- Single-file frontend demo (wallet, simulated IPFS, local VC issuance)
- Express backend with upload/issue/verify/revoke APIs
- README and API docs for backend
- STEPS.md with extended instructions
