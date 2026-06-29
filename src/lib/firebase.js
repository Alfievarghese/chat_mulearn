import { initializeApp } from 'firebase/app'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

import { createRoomRecord, getSeedMessages, getSeedRooms } from './demoData'
import { firebaseConfig, hasFirebaseConfig } from './env'

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null
const db = app ? getFirestore(app) : null

export function listenToRooms(onData, onError) {
  if (!db) {
    return () => {}
  }

  const roomsQuery = query(collection(db, 'rooms'), orderBy('updatedAt', 'desc'))
  return onSnapshot(
    roomsQuery,
    (snapshot) => {
      const rooms = snapshot.docs.map((item) => {
        const data = item.data()
        return {
          id: item.id,
          name: data.name,
          topic: data.topic,
          accent: data.accent,
          host: data.host,
          lastMessage: data.lastMessage ?? 'Fresh room. Break the silence.',
          updatedAt: data.updatedAt,
        }
      })
      onData(rooms)
    },
    onError,
  )
}

export function listenToMessages(roomId, onData, onError) {
  if (!db) {
    return () => {}
  }

  const messagesQuery = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'asc'))
  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((item) => {
          const data = item.data()
          return {
            id: item.id,
            author: data.author,
            tone: data.tone,
            text: data.text,
            createdAt: data.createdAt,
          }
        }),
      )
    },
    onError,
  )
}

export async function createRoom({ name, topic, accent, host }) {
  if (!db) {
    throw new Error('Firebase config is missing.')
  }

  const room = createRoomRecord({ name, topic, accent, host })
  await setDoc(doc(db, 'rooms', room.id), {
    name: room.name,
    topic: room.topic,
    accent: room.accent,
    host: room.host,
    lastMessage: room.lastMessage,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return room.id
}

export async function createMessage(roomId, { author, text, tone }) {
  if (!db) {
    throw new Error('Firebase config is missing.')
  }

  await addDoc(collection(db, 'rooms', roomId, 'messages'), {
    author,
    text,
    tone,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, 'rooms', roomId), {
    lastMessage: text,
    updatedAt: serverTimestamp(),
  })
}

export async function seedFirebaseRooms(host = 'You') {
  if (!db) {
    throw new Error('Firebase config is missing.')
  }

  const existing = await getDocs(collection(db, 'rooms'))
  if (!existing.empty) {
    return
  }

  for (const room of getSeedRooms()) {
    await setDoc(doc(db, 'rooms', room.id), {
      name: room.name,
      topic: room.topic,
      accent: room.accent,
      host,
      lastMessage: room.lastMessage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    for (const message of getSeedMessages(room.id, room.topic, host)) {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        author: message.author,
        text: message.text,
        tone: message.tone,
        createdAt: serverTimestamp(),
      })
    }
  }
}
