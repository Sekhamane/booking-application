import { createClient } from 'npm:@supabase/supabase-js@2'
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'npm:viem'
import { privateKeyToAccount } from 'npm:viem/accounts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const abi = [{ type: 'function', name: 'recordBookingEvent', stateMutability: 'nonpayable', inputs: [{ name: 'bookingKey', type: 'bytes32' }, { name: 'eventHash', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'verified', stateMutability: 'view', inputs: [{ name: 'bookingKey', type: 'bytes32' }, { name: 'eventHash', type: 'bytes32' }], outputs: [{ type: 'bool' }] }] as const

const digest = async (value: string): Promise<Hex> => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return `0x${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`
}
const stable = (value: Record<string, unknown>) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))))

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return Response.json({ error: 'Sign in required' }, { status: 401, headers: cors })
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userDb = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user }, error: userError } = await userDb.auth.getUser(token)
    if (userError || !user) return Response.json({ error: 'Sign in required' }, { status: 401, headers: cors })

    const body = await request.json()
    const eventType = String(body.event_type || '')
    const statusForEvent: Record<string, string> = {
      requested: 'requested', confirmed: 'confirmed', rejected: 'rejected',
      cancelled: 'cancelled', in_progress: 'in_progress', completed: 'completed',
    }
    if (!(eventType in statusForEvent)) return Response.json({ error: 'Unsupported booking event' }, { status: 400, headers: cors })

    const { data: booking, error: bookingError } = await userDb.from('bookings')
      .select('id, reference_code, status, booking_date, service_id, provider_id, price_per_side, price_currency, updated_at')
      .eq('id', body.booking_id).maybeSingle()
    if (bookingError || !booking) return Response.json({ error: 'Booking not found or not accessible' }, { status: 404, headers: cors })
    if (booking.status !== statusForEvent[eventType]) return Response.json({ error: 'Event does not match the current booking state' }, { status: 409, headers: cors })

    const canonical = {
      schema: 'teabag.booking-event.v1',
      booking_id: booking.id,
      reference_code: booking.reference_code,
      event_type: eventType,
      status: booking.status,
      booking_date: booking.booking_date,
      service_id: booking.service_id,
      provider_id: booking.provider_id,
      price: booking.price_per_side,
      currency: booking.price_currency,
      updated_at: booking.updated_at,
    }
    const canonicalJson = stable(canonical)
    const [bookingKey, eventHash] = await Promise.all([digest(booking.id), digest(canonicalJson)])
    const adminDb = createClient(url, serviceKey)
    const { data: previous } = await adminDb.from('booking_proofs').select('transaction_hash, block_number, network, chain_id')
      .eq('booking_id', booking.id).eq('event_hash', eventHash).maybeSingle()
    if (previous) return Response.json({ ...previous, event_hash: eventHash, already_recorded: true }, { headers: cors })

    const rpc = Deno.env.get('BLOCKCHAIN_RPC_URL')!
    const privateKey = Deno.env.get('BLOCKCHAIN_PRIVATE_KEY') as Hex
    const contractAddress = Deno.env.get('BLOCKCHAIN_CONTRACT_ADDRESS') as Address
    const chainId = Number(Deno.env.get('BLOCKCHAIN_CHAIN_ID') || '11155111')
    const network = Deno.env.get('BLOCKCHAIN_NETWORK') || 'sepolia'
    const chain = { id: chainId, name: network, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } } as const
    const account = privateKeyToAccount(privateKey)
    const publicClient = createPublicClient({ chain, transport: http(rpc) })
    const walletClient = createWalletClient({ account, chain, transport: http(rpc) })
    const isRecorded = await publicClient.readContract({ address: contractAddress, abi, functionName: 'verified', args: [bookingKey, eventHash] })
    let txHash: Hex
    let blockNumber: bigint
    if (isRecorded) {
      const { data: existing } = await adminDb.from('booking_proofs').select('transaction_hash, block_number')
        .eq('booking_id', booking.id).eq('event_hash', eventHash).maybeSingle()
      if (!existing) return Response.json({ error: 'Proof exists on-chain but transaction metadata is missing' }, { status: 409, headers: cors })
      txHash = existing.transaction_hash as Hex
      blockNumber = BigInt(existing.block_number)
    } else {
      txHash = await walletClient.writeContract({ address: contractAddress, abi, functionName: 'recordBookingEvent', args: [bookingKey, eventHash] })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status !== 'success') throw new Error('Blockchain transaction failed')
      blockNumber = receipt.blockNumber
    }

    const proof = { booking_id: booking.id, event_type: eventType, canonical_payload: canonical,
      booking_key: bookingKey, event_hash: eventHash, transaction_hash: txHash, network, chain_id: chainId, block_number: Number(blockNumber) }
    const { error: saveError } = await adminDb.from('booking_proofs').insert(proof)
    if (saveError) throw saveError
    return Response.json({ event_hash: eventHash, transaction_hash: txHash, network, chain_id: chainId, block_number: Number(blockNumber) }, { headers: cors })
  } catch (error) {
    console.error('Unable to record booking proof', error)
    return Response.json({ error: 'Unable to record proof right now' }, { status: 500, headers: cors })
  }
})
