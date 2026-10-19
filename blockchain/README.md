# Booking record proofs

The registry contract stores only a `bookingKey` and SHA-256 `eventHash`. It emits the pair with a timestamp; it never receives a customer's name, phone, email, notes, payment data, service label, or booking reference. The mapping key is SHA-256 of the internal booking UUID. Event hashes cover a canonical non-PII database snapshot and event type.

## Deployment outline

1. Compile `contracts/BookingProofRegistry.sol` with Solidity 0.8.24.
2. Deploy to a test network (the current default is Sepolia, chain ID `11155111`) and pass the relayer wallet address to the constructor.
3. Store the RPC URL, relayer private key, contract address, network name, and chain ID as **Supabase Edge Function secrets**. Do not add the private key to a Vite environment variable or repository file.
4. Deploy the `record-booking-proof` and `verify-booking-proof` Supabase functions. The record function requires a verified user JWT; the verification function is public and returns only proof metadata, not the event preimage or booking details.
5. Confirm the event hash and transaction on the selected explorer. The browser verification page has explorer links for Sepolia and Polygon Amoy.

The chain is controlled by `BLOCKCHAIN_NETWORK`, `BLOCKCHAIN_CHAIN_ID`, and `BLOCKCHAIN_RPC_URL`; Sepolia is a default configuration, not a hard requirement. Contract deployment and RPC secrets must be configured before proofs can be submitted. A booking remains saved in Supabase if a proof transaction is temporarily unavailable; the user sees the proof as pending and can retry after function support is configured.
