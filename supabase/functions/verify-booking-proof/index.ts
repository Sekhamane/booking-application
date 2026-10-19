import { createClient } from 'npm:@supabase/supabase-js@2'
import { createPublicClient, http, type Address, type Hex } from 'npm:viem'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const abi = [{ type: 'function', name: 'verified', stateMutability: 'view', inputs: [{ name: 'bookingKey', type: 'bytes32' }, { name: 'eventHash', type: 'bytes32' }], outputs: [{ type: 'bool' }] }] as const
const digest = async (value: string): Promise<Hex> => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return `0x${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`
}
const stable = (value: Record<string, unknown>) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))))

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  try {
    const { reference_code: reference } = await request.json()
    if (typeof reference !== 'string' || !/^TB-[0-9]{4}-[A-F0-9]{10}$/i.test(reference)) {
      return Response.json({ error: 'Invalid booking reference' }, { status: 400, headers: cors })
    }
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: booking, error } = await db.from('bookings')
      .select('id, reference_code, status, booking_date, price_per_side, price_currency, services(name), provider_profiles(display_name)')
      .eq('reference_code', reference).maybeSingle()
    if (error || !booking) return Response.json({ error: 'Booking record not found' }, { status: 404, headers: cors })
    const { data: proofs, error: proofError } = await db.from('booking_proofs')
      .select('event_type, canonical_payload, booking_key, event_hash, transaction_hash, network, chain_id, block_number, created_at')
      .eq('booking_id', booking.id).order('created_at', { ascending: true })
    if (proofError) throw proofError

    const rpc = Deno.env.get('BLOCKCHAIN_RPC_URL')!
    const address = Deno.env.get('BLOCKCHAIN_CONTRACT_ADDRESS') as Address
    const publicClient = createPublicClient({ chain: { id: Number(Deno.env.get('BLOCKCHAIN_CHAIN_ID') || '11155111'), name: Deno.env.get('BLOCKCHAIN_NETWORK') || 'sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } }, transport: http(rpc) })
    const history = await Promise.all((proofs || []).map(async proof => {
      const calculatedBookingKey = await digest(String(proof.canonical_payload.booking_id))
      const calculatedEventHash = await digest(stable(proof.canonical_payload))
      let confirmed = false
      if (calculatedBookingKey.toLowerCase() === proof.booking_key.toLowerCase() && calculatedEventHash.toLowerCase() === proof.event_hash.toLowerCase()) {
        confirmed = await publicClient.readContract({ address, abi, functionName: 'verified', args: [proof.booking_key as Hex, proof.event_hash as Hex] })
      }
      return { event_type: proof.event_type, event_hash: proof.event_hash,
        transaction_hash: proof.transaction_hash, network: proof.network, chain_id: proof.chain_id,
        block_number: proof.block_number, created_at: proof.created_at, valid: confirmed }
    }))
    return Response.json({ booking: { reference_code: booking.reference_code }, proofs: history }, { headers: cors })
  } catch (error) {
    console.error('Unable to verify booking proof', error)
    return Response.json({ error: 'Unable to verify this record right now' }, { status: 500, headers: cors })
  }
})
