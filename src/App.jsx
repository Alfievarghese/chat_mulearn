import { startTransition, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  createRoomRecord,
  getSeedMessages,
  getSeedRooms,
  loadLocalSnapshot,
  persistLocalSnapshot,
} from './lib/demoData'
import { hasFirebaseConfig } from './lib/env'

const MODE_LABEL = hasFirebaseConfig ? 'Firebase live mode' : 'Local demo mode'

function App() {
  const [profile, setProfile] = useState(() => loadLocalSnapshot().profile)
  const [roomSearch, setRoomSearch] = useState('')
  const deferredRoomSearch = useDeferredValue(roomSearch)
  const [activeRoomId, setActiveRoomId] = useState(() => loadLocalSnapshot().activeRoomId)
  const [draft, setDraft] = useState('')
  const [rooms, setRooms] = useState(() => loadLocalSnapshot().rooms)
  const [localMessages, setLocalMessages] = useState(() => loadLocalSnapshot().messages)
  const [liveMessages, setLiveMessages] = useState([])
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', topic: '', accent: 'ember' })
  const [status, setStatus] = useState(MODE_LABEL)
  const [error, setError] = useState('')
  const feedRef = useRef(null)
  const firebaseApiRef = useRef(null)

  async function getFirebaseApi() {
    if (!hasFirebaseConfig) {
      throw new Error('Firebase config is missing.')
    }

    if (!firebaseApiRef.current) {
      firebaseApiRef.current = import('./lib/firebase')
    }

    return firebaseApiRef.current
  }

  useEffect(() => {
    if (!hasFirebaseConfig) {
      persistLocalSnapshot({ profile, rooms, messages: localMessages, activeRoomId })
    }
  }, [activeRoomId, localMessages, profile, rooms])

  useEffect(() => {
    if (!hasFirebaseConfig) {
      return undefined
    }

    let unsubscribe = () => {}

    getFirebaseApi()
      .then(({ listenToRooms }) => {
        setStatus('Syncing rooms from Firebase')
        unsubscribe = listenToRooms(
          (nextRooms) => {
            if (nextRooms.length === 0) {
              setRooms(getSeedRooms())
              return
            }

            setRooms(nextRooms)
            setStatus('Firebase live mode')
            setError('')
          },
          (nextError) => {
            setError(nextError.message)
            setStatus('Firebase unavailable, falling back to local preview')
          },
        )
      })
      .catch((nextError) => {
        setError(nextError.message)
      })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!rooms.some((room) => room.id === activeRoomId) && rooms.length > 0) {
      setActiveRoomId(rooms[0].id)
    }
  }, [activeRoomId, rooms])

  useEffect(() => {
    if (!hasFirebaseConfig || !activeRoomId) {
      return undefined
    }

    let unsubscribe = () => {}

    getFirebaseApi()
      .then(({ listenToMessages }) => {
        unsubscribe = listenToMessages(
          activeRoomId,
          (nextMessages) => {
            setLiveMessages(nextMessages)
            setError('')
          },
          (nextError) => {
            setError(nextError.message)
          },
        )
      })
      .catch((nextError) => {
        setError(nextError.message)
      })

    return () => unsubscribe()
  }, [activeRoomId])

  const currentMessages = hasFirebaseConfig ? liveMessages : localMessages[activeRoomId] ?? []
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]
  const messageCount = currentMessages.length

  const filteredRooms = useMemo(() => {
    const query = deferredRoomSearch.trim().toLowerCase()
    if (!query) {
      return rooms
    }

    return rooms.filter((room) => {
      return `${room.name} ${room.topic}`.toLowerCase().includes(query)
    })
  }, [deferredRoomSearch, rooms])

  const saveProfile = useEffectEvent((field, value) => {
    setProfile((current) => ({ ...current, [field]: value }))
  })

  useEffect(() => {
    const node = feedRef.current
    if (!node) {
      return
    }

    node.scrollTop = node.scrollHeight
  }, [activeRoomId, messageCount])

  async function handleSendMessage(event) {
    event.preventDefault()
    const messageText = draft.trim()

    if (!messageText || !activeRoom) {
      return
    }

    setDraft('')

    if (!hasFirebaseConfig) {
      const nextMessage = createMessage({
        author: profile.name,
        text: messageText,
        roomId: activeRoom.id,
        tone: profile.tone,
      })

      setLocalMessages((current) => ({
        ...current,
        [activeRoom.id]: [...(current[activeRoom.id] ?? []), nextMessage],
      }))

      setRooms((current) =>
        current.map((room) =>
          room.id === activeRoom.id
            ? {
                ...room,
                lastMessage: messageText,
                updatedAt: nextMessage.createdAt,
              }
            : room,
        ),
      )

      return
    }

    try {
      const { createMessage } = await getFirebaseApi()
      await createMessage(activeRoom.id, {
        author: profile.name,
        text: messageText,
        tone: profile.tone,
      })
    } catch (nextError) {
      setDraft(messageText)
      setError(nextError.message)
    }
  }

  async function handleCreateRoom(event) {
    event.preventDefault()
    const name = roomForm.name.trim()
    const topic = roomForm.topic.trim()

    if (!name || !topic) {
      return
    }

    const nextRoom = createRoomRecord({
      name,
      topic,
      accent: roomForm.accent,
      host: profile.name,
    })

    if (!hasFirebaseConfig) {
      setRooms((current) => [nextRoom, ...current])
      setLocalMessages((current) => ({
        ...current,
        [nextRoom.id]: getSeedMessages(nextRoom.id, nextRoom.topic, profile.name),
      }))
      setActiveRoomId(nextRoom.id)
      setRoomForm({ name: '', topic: '', accent: roomForm.accent })
      setIsCreatingRoom(false)
      return
    }

    try {
      const { createRoom } = await getFirebaseApi()
      const roomId = await createRoom({
        name,
        topic,
        accent: roomForm.accent,
        host: profile.name,
      })
      setActiveRoomId(roomId)
      setRoomForm({ name: '', topic: '', accent: roomForm.accent })
      setIsCreatingRoom(false)
    } catch (nextError) {
      setError(nextError.message)
    }
  }

  async function handleSeedFirebase() {
    try {
      const { seedFirebaseRooms } = await getFirebaseApi()
      await seedFirebaseRooms(profile.name)
      setStatus('Firebase rooms seeded')
    } catch (nextError) {
      setError(nextError.message)
    }
  }

  return (
    <main className="shell">
      <section className="backdrop" aria-hidden="true">
        <div className="backdrop-orbit backdrop-orbit-a"></div>
        <div className="backdrop-orbit backdrop-orbit-b"></div>
        <div className="backdrop-grid"></div>
      </section>

      <section className="layout">
        <aside className="rail">
          <div className="brand-block">
            <p className="eyebrow">Pulse Rooms</p>
            <h1>Conversations with a little stagecraft.</h1>
            <p className="support-copy">
              Multiple rooms, live-friendly Firebase wiring, and a fallback demo mode that still feels finished.
            </p>
          </div>

          <label className="search-panel" htmlFor="room-search">
            <span>Room radar</span>
            <input
              id="room-search"
              type="text"
              value={roomSearch}
              onChange={(event) => setRoomSearch(event.target.value)}
              placeholder="Search rooms or topics"
            />
          </label>

          <div className="room-list">
            {filteredRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className={`room-chip ${room.id === activeRoom?.id ? 'active' : ''} accent-${room.accent}`}
                onClick={() =>
                  startTransition(() => {
                    setActiveRoomId(room.id)
                  })
                }
              >
                <span className="room-chip-header">
                  <strong>{room.name}</strong>
                  <em>{formatTime(room.updatedAt)}</em>
                </span>
                <span className="room-chip-topic">{room.topic}</span>
                <span className="room-chip-last">{room.lastMessage}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="create-room-button"
            onClick={() => setIsCreatingRoom((current) => !current)}
          >
            {isCreatingRoom ? 'Close room sketch' : 'Start a fresh room'}
          </button>

          {isCreatingRoom ? (
            <form className="room-form" onSubmit={handleCreateRoom}>
              <input
                type="text"
                value={roomForm.name}
                onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Room name"
              />
              <input
                type="text"
                value={roomForm.topic}
                onChange={(event) => setRoomForm((current) => ({ ...current, topic: event.target.value }))}
                placeholder="What is this room about?"
              />
              <div className="swatches" role="radiogroup" aria-label="Room accent">
                {['ember', 'lagoon', 'lime'].map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    className={`swatch ${accent} ${roomForm.accent === accent ? 'selected' : ''}`}
                    onClick={() => setRoomForm((current) => ({ ...current, accent }))}
                    aria-pressed={roomForm.accent === accent}
                  />
                ))}
              </div>
              <button type="submit" className="submit-room-button">
                Create room
              </button>
            </form>
          ) : null}
        </aside>

        <section className="conversation-panel">
          <header className={`hero-card accent-${activeRoom?.accent ?? 'ember'}`}>
            <div>
              <p className="eyebrow">Active room</p>
              <h2>{activeRoom?.name}</h2>
              <p className="hero-topic">{activeRoom?.topic}</p>
            </div>

            <div className="hero-stats">
              <div>
                <span>Mode</span>
                <strong>{hasFirebaseConfig ? 'Live sync' : 'Preview sync'}</strong>
              </div>
              <div>
                <span>Messages</span>
                <strong>{messageCount}</strong>
              </div>
            </div>
          </header>

          <div className="feed" ref={feedRef}>
            <div className="feed-day-tag">Tonight&apos;s signal</div>
            {currentMessages.map((message) => (
              <article
                key={message.id}
                className={`message ${message.author === profile.name ? 'self' : ''}`}
              >
                <header>
                  <strong>{message.author}</strong>
                  <span>{formatTime(message.createdAt)}</span>
                </header>
                <p>{message.text}</p>
                <footer>{message.tone}</footer>
              </article>
            ))}
          </div>

          <form className="composer" onSubmit={handleSendMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Drop a note into ${activeRoom?.name ?? 'the room'}`}
              rows="3"
            />
            <button type="submit">Send pulse</button>
          </form>
        </section>

        <aside className="insight-panel">
          <section className="profile-card">
            <p className="eyebrow">Speaker profile</p>
            <label>
              <span>Name</span>
              <input
                type="text"
                value={profile.name}
                onChange={(event) => saveProfile('name', event.target.value)}
              />
            </label>
            <label>
              <span>Tone tag</span>
              <input
                type="text"
                value={profile.tone}
                onChange={(event) => saveProfile('tone', event.target.value)}
              />
            </label>
          </section>

          <section className="metric-card">
            <p className="eyebrow">Room pulse</p>
            <div className="meter">
              <span style={{ width: `${Math.min(92, messageCount * 14)}%` }}></span>
            </div>
            <ul>
              <li>
                <span>Current status</span>
                <strong>{status}</strong>
              </li>
              <li>
                <span>Last message</span>
                <strong>{activeRoom?.lastMessage ?? 'Waiting for the opener'}</strong>
              </li>
              <li>
                <span>People echoing</span>
                <strong>{new Set(currentMessages.map((message) => message.author)).size}</strong>
              </li>
            </ul>
          </section>

          <section className="shortcut-card">
            <p className="eyebrow">Shared thread kit</p>
            <div className="shortcut-grid">
              <a href="https://firebase.google.com/docs/firestore" target="_blank" rel="noreferrer">
                Firestore docs
              </a>
              <a href="https://react.dev/" target="_blank" rel="noreferrer">
                React 19
              </a>
              <button type="button" onClick={handleSeedFirebase} disabled={!hasFirebaseConfig}>
                Seed live rooms
              </button>
            </div>
          </section>

          {error ? <p className="error-banner">{error}</p> : null}
        </aside>
      </section>
    </main>
  )
}

function formatTime(value) {
  const date = typeof value === 'number' ? new Date(value) : value?.toDate?.() ?? new Date()
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default App
