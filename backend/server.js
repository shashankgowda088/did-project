/**
 * Simple backend for DID & VC demo
 * - /api/upload      : accepts multipart file upload, stores file in ./data and returns a demo CID (or real IPFS if configured)
 * - /api/issue       : issues a VC using issuer private key (ISSUER_PRIVATE_KEY env) and stores VC in data/vcs.json
 * - /api/verify      : verifies a VC (expects {vc,signature} or a JWT) using did-jwt-vc and did-resolver
 * - /api/revoke      : marks a credentialId revoked (data/revocations.json)
 * - /api/vcs         : lists stored VCs
 *
 * Notes:
 * - Install dependencies: npm install
 * - Run: ISSUER_PRIVATE_KEY=0x... node server.js
 */
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { createVerifiableCredentialJwt, verifyCredential } = require('did-jwt-vc');
const { Resolver } = require('did-resolver');
const { getResolver: ethrGetResolver } = require('ethr-did-resolver');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const uploadDir = path.join(DATA_DIR, 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage });

function saveJSON(file, obj){
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(obj, null, 2));
}
function loadJSON(file){
  try{ return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file))); }catch(e){ return []; }
}

// Simple in-memory + file-backed stores
const VCS_FILE = 'vcs.json';
const REVOKE_FILE = 'revocations.json';
if(!fs.existsSync(path.join(DATA_DIR, VCS_FILE))) saveJSON(VCS_FILE, []);
if(!fs.existsSync(path.join(DATA_DIR, REVOKE_FILE))) saveJSON(REVOKE_FILE, []);

const IPFS_API = process.env.IPFS_API_URL || null;
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY || null;

// Setup did resolver for did:ethr (if verifying eth addresses)
const providerUrl = process.env.PROVIDER_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
const ethrResolver = ethrGetResolver({ provider: providerUrl });
const resolver = new Resolver({ ...ethrResolver });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if(!req.file) return res.status(400).json({ error: 'no file' });
  const full = req.file.path;
  // If IPFS_API is configured, user can extend to call ipfs-http-client here.
  // For demo we return a SHA256-based fake CID.
  const buf = fs.readFileSync(full);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const cid = 'cid-backend-' + hash.slice(0,40);
  res.json({ cid, filename: req.file.originalname, storedPath: full });
});

app.post('/api/issue', async (req, res) => {
  const body = req.body || {};
  const subject = body.subject || ('did:example:' + Math.random().toString(36).slice(2,8));
  const type = body.type || 'IdentityCredential';
  const claim = body.claim || {};
  if(!ISSUER_PRIVATE_KEY){ return res.status(500).json({ error: 'ISSUER_PRIVATE_KEY not configured in env' }); }

  try{
    const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY);
    const issuerDid = `did:ethr:${wallet.address}`;
    const issuanceDate = new Date().toISOString();
    const credentialId = 'vc-' + Math.random().toString(36).slice(2,10);

    const vcPayload = {
      sub: subject,
      nbf: Math.floor(Date.now()/1000),
      vc: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', type],
        credentialSubject: Object.assign({ id: subject }, claim),
        id: credentialId,
        issuanceDate
      }
    };

    // signer for did-jwt-vc requires async function that signs bytes
    const signer = async (data) => {
      // data is hex string to sign
      const sig = wallet._signingKey().signDigest(data);
      // return in r + s + v hex string (did-jwt-vc expects this format)
      return { sig: sig.r + sig.s.slice(2) + sig.v.toString(16), alg: 'ES256K' };
    };

    const jwt = await createVerifiableCredentialJwt(vcPayload, { did: issuerDid, signer });
    // store vc
    const arr = loadJSON(VCS_FILE);
    arr.unshift({ id: credentialId, issuer: issuerDid, subject, jwt, raw: vcPayload, issuedAt: Date.now() });
    saveJSON(VCS_FILE, arr);
    res.json({ jwt, vc: vcPayload });
  } catch(e){
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/verify', async (req, res) => {
  const body = req.body;
  if(!body) return res.status(400).json({ error: 'no body' });
  try{
    // Accept two types: a JWT string or an object {vc, signature}
    if(typeof body === 'string' || body.jwt){
      const token = typeof body === 'string' ? body : body.jwt;
      const verified = await verifyCredential(token, resolver);
      // check revocation list
      const rev = loadJSON(REVOKE_FILE);
      const isRevoked = rev.some(r => r.id === (verified.payload && verified.payload.vc && verified.payload.vc.id));
      res.json({ verified, revoked: isRevoked });
    } else {
      // trying to verify JSON VC with signature (not JWT)
      // for demo we attempt to recover signer if signature is present
      const vc = body.vc || body;
      const sig = body.signature || null;
      if(!sig) return res.status(400).json({ error: 'no signature to verify' });
      // canonicalize
      const canonical = JSON.stringify(vc, Object.keys(vc).sort());
      const recovered = ethers.verifyMessage(ethers.toUtf8Bytes(canonical), sig);
      const issuer = vc.issuer || '';
      const issuerAddress = issuer && issuer.startsWith('did:ethr:') ? issuer.split(':').pop().toLowerCase() : null;
      const ok = issuerAddress && (recovered.toLowerCase() === issuerAddress.toLowerCase());
      const rev = loadJSON(REVOKE_FILE);
      const isRevoked = rev.some(r => r.id === vc.id);
      res.json({ ok, recovered, issuerAddress, revoked: isRevoked });
    }
  } catch(e){
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/revoke', (req, res) => {
  const id = req.body && req.body.id;
  if(!id) return res.status(400).json({ error: 'missing id' });
  const rev = loadJSON(REVOKE_FILE);
  rev.unshift({ id, ts: Date.now() });
  saveJSON(REVOKE_FILE, rev);
  res.json({ revoked: id });
});

app.get('/api/vcs', (req, res) => {
  const arr = loadJSON(VCS_FILE);
  res.json(arr);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('DID backend running on', PORT));
