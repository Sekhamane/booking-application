export const SERVICES = [
  {
    id: 'intricate_indian_bride',
    name: 'Intricate Indian Bride',
    description: 'A traditionally detailed design with the most intricate patterns, filling your hands completely.',
    isBridal: true,
    coverageLevels: [
      { level: 1, label: 'Palm Only',  price: 1400 },
      { level: 2, label: 'To Wrist',   price: 1750 },
      { level: 3, label: 'To Forearm', price: 2500 },
      { level: 4, label: 'Full Arm',   price: 3000 },
    ],
  },
  {
    id: 'floral_arabic_bride',
    name: 'Floral Arabic Bride',
    description: 'A floral themed design with a mix of bold and petite flowers & motifs.',
    isBridal: true,
    coverageLevels: [
      { level: 1, label: 'Palm Only',  price: 1200 },
      { level: 2, label: 'To Wrist',   price: 1600 },
      { level: 3, label: 'To Forearm', price: 2000 },
      { level: 4, label: 'Full Arm',   price: 2400 },
    ],
  },
  {
    id: 'minimalistic_bride',
    name: 'Minimalistic Bride',
    description: 'A trendsetting & clean portrayal. Perfect for the simple, modern bride.',
    isBridal: true,
    coverageLevels: [
      { level: 1, label: 'Palm Only',  price: 950  },
      { level: 2, label: 'To Wrist',   price: 1300 },
      { level: 3, label: 'To Forearm', price: 1750 },
      { level: 4, label: 'Full Arm',   price: 2100 },
    ],
  },
  {
    id: 'party_guest_henna',
    name: 'Party / Guest Henna',
    description: 'Non-bridal henna designs for guests, friends & family.',
    isBridal: false,
    coverageLevels: [
      { level: 1, label: 'Palm Only',  price: 600  },
      { level: 2, label: 'To Wrist',   price: 900  },
      { level: 3, label: 'To Forearm', price: 1200 },
      { level: 4, label: 'Full Arm',   price: 1500 },
    ],
  },
]

export const DEPOSIT_AMOUNT         = 1000
export const ADVANCE_BOOKING_DAYS   = 14
export const CHANGE_NOTICE_DAYS     = 7
export const SLIP_UPLOAD_EXPIRY_HOURS = 24
export const WAITLIST_CLAIM_HOURS   = 6
