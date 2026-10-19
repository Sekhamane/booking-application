# Vercel and blockchain deployment runbook

This project uses Vite for the web app, Supabase for data/auth/Edge Functions, and an EVM test network for booking proofs. Deploy each part separately. Use Sepolia for a demonstration; do not call it production-grade until operational and privacy review is complete.

## Vercel

1. Push the project to a Git provider and import that repository in Vercel.
2. Vercel settings should use `npm run build` and `dist` as the output directory. The repository's `vercel.json` already configures these and routes browser paths to the SPA.
3. Add these **public browser** environment variables in Vercel (Production and Preview as appropriate):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CONTACT_EMAIL` and `VITE_CONTACT_PHONE` if desired
   - `VITE_SECURITY_HOST` set to the exact security-admin hostname, for example `security.example.com`
4. Add the main app domain and security hostname under Vercel Project → Settings → Domains. Both can point to this same deployment; the app uses the hostname to expose the restricted security workspace.
5. Add both app URLs to Supabase Auth's allowed redirect URLs and configure the production site URL.
6. Deploy the Supabase migrations in numerical order. Confirm the security hostname opens only the security-admin login/workspace and that normal routes still work on the main hostname.

Never set `SUPABASE_SERVICE_ROLE_KEY`, `BLOCKCHAIN_PRIVATE_KEY`, or RPC secrets as `VITE_*` variables. Keep server-only secrets in Supabase Function secrets.

## Deploy the booking proof contract to Sepolia

1. Create a dedicated relayer wallet for the demo and fund it with Sepolia test ETH. Keep the private key in a password manager until you set it as a Supabase Function secret. Do not use a personal wallet with assets.
2. Open `blockchain/contracts/BookingProofRegistry.sol` in Remix, compile with Solidity `0.8.24`, select Injected Provider, and connect a wallet configured for Sepolia.
3. Deploy `BookingProofRegistry` with the relayer wallet's public address as the constructor argument. The deploying wallet becomes the contract owner; retain it for relayer rotation.
4. Copy the deployed contract address and verify the deployed contract on the Sepolia explorer. Check `relayer()` matches the relayer public address.
5. In Supabase project settings, set Edge Function secrets (or use `supabase secrets set` from a trusted terminal):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BLOCKCHAIN_RPC_URL`
   - `BLOCKCHAIN_CHAIN_ID=11155111`
   - `BLOCKCHAIN_NETWORK=sepolia`
   - `BLOCKCHAIN_CONTRACT_ADDRESS` to the deployed address
   - `BLOCKCHAIN_PRIVATE_KEY` to the dedicated relayer private key
6. Deploy `record-booking-proof` and `verify-booking-proof` with the Supabase CLI. For example: `supabase functions deploy record-booking-proof` and `supabase functions deploy verify-booking-proof`.
7. Sign in as a customer, create a test booking, and confirm it is saved even if proof submission fails. With the function configured, confirm the proof appears on the booking and the verification page reports it valid. Inspect the transaction on Sepolia and confirm only the booking key and event hash are emitted.
8. Test status transitions and retry behavior. Retain the test transaction links and contract address as deployment evidence for the assignment.

## Current deployment boundary

The repository contains the contract and function code, but not a deployed contract address, RPC endpoint, funded relayer, deployed functions, Vercel project, or live domain. Those account-specific steps must be completed in your Vercel, Supabase, wallet, and RPC accounts. Use the assignment demo/test network and never commit credentials.
