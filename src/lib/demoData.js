const STORAGE_KEY = 'pulse-rooms-local'

const seedRooms = [
  {
    id: 'founders-den',
    name: 'Founders Den',
    topic: 'Product bets, pitch tension, late-night clarity',
    accent: 'ember',
    host: 'Ava',
    lastMessage: 'We need the sharper story before we polish the UI.',
    updatedAt: Date.now() - 1000 * 60 * 12,
  },
  {
    id: 'signal-lab',
    name: 'Signal Lab',
    topic: 'Customer notes, broken assumptions, quick rewrites',
    accent: 'lagoon',
    host: 'Mika',
    lastMessage: 'The best rooms are the ones with friction, not noise.',
    updatedAt: Date.now() - 1000 * 60 * 31,
  },
  {
    id: 'launch-table',
    name: 'Launch Table',
    topic: 'Copy tweaks, docs, deployment, proof of work',
    accent: 'lime',
    host: 'Rhea',
    lastMessage: 'README first, excuses later.',
    updatedAt: Date.now() - 1000 * 60 * 58,
  },
]

const seedMessages = {
  'founders-den': [
    createMessage({
      roomId: 'founders-den',
      author: 'Ava',
      tone: 'framing',
      text: 'The homepage is still saying too much. Give the core promise five cleaner words.',
      createdAt: Date.now() - 1000 * 60 * 55,
    }),
    createMessage({
      roomId: 'founders-den',
      author: 'You',
      tone: 'editing',
      text: 'I can collapse the intro and move trust into the right rail instead.',
      createdAt: Date.now() - 1000 * 60 * 43,
    }),
    createMessage({
      roomId: 'founders-den',
      author: 'Ava',
      tone: 'pressure-test',
      text: 'Do it. If the value is real, it should survive less explanation.',
      createdAt: Date.now() - 1000 * 60 * 12,
    }),
  ],
  'signal-lab': [
    createMessage({
      roomId: 'signal-lab',
      author: 'Mika',
      tone: 'research',
      text: 'Five people called the existing layout clean, but none of them remembered the brand after ten minutes.',
      createdAt: Date.now() - 1000 * 60 * 68,
    }),
    createMessage({
      roomId: 'signal-lab',
      author: 'You',
      tone: 'notes',
      text: 'Then the palette is decoration, not memory. The fix has to land in the silhouette too.',
      createdAt: Date.now() - 1000 * 60 * 31,
    }),
  ],
  'launch-table': [
    createMessage({
      roomId: 'launch-table',
      author: 'Rhea',
      tone: 'ops',
      text: 'Repo is empty. Build the thing, document the thing, push the thing.',
      createdAt: Date.now() - 1000 * 60 * 84,
    }),
    createMessage({
      roomId: 'launch-table',
      author: 'You',
      tone: 'shipping',
      text: 'I will keep Firebase optional so the review still runs without private keys.',
      createdAt: Date.now() - 1000 * 60 * 58,
    }),
  ],
}

export function createMessage({
  roomId,
  author,
  tone,
  text,
  createdAt = Date.now(),
}) {
  return {
    id: `${roomId}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    roomId,
    author,
    tone,
    text,
    createdAt,
  }
}

export function createRoomRecord({ name, topic, accent, host }) {
  const timestamp = Date.now()
  return {
    id: slugify(name),
    name,
    topic,
    accent,
    host,
    lastMessage: 'Room created. Start the first pulse.',
    updatedAt: timestamp,
  }
}

export function getSeedRooms() {
  return structuredClone(seedRooms)
}

export function getSeedMessages(roomId, roomTopic, currentUser = 'You') {
  if (roomId in seedMessages) {
    return structuredClone(seedMessages[roomId])
  }

  return [
    createMessage({
      roomId,
      author: currentUser,
      tone: 'opening note',
      text: `Starting a fresh thread for ${roomTopic}.`,
      createdAt: Date.now(),
    }),
  ]
}

export function loadLocalSnapshot() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.rooms && saved?.messages && saved?.profile) {
      return saved
    }
  } catch {
    // Ignore malformed local state and restore the built-in preview.
  }

  return {
    profile: { name: 'You', tone: 'builder mode' },
    rooms: getSeedRooms(),
    messages: structuredClone(seedMessages),
    activeRoomId: seedRooms[0].id,
  }
}

export function persistLocalSnapshot(snapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
