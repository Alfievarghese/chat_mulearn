# Pulse Rooms

Pulse Rooms is a multi-room chat application built with React and Firebase. The UI avoids the usual tutorial clone look with a warmer editorial palette, serif display typography, and a three-panel layout that still collapses cleanly on mobile.

The app runs in two modes:

- `Firebase live mode` when the required `VITE_FIREBASE_*` variables are present.
- `Local demo mode` when Firebase keys are missing, so the project still works for reviewers without private config.

## Features

- Multi-room chat with searchable room switching
- Create new rooms with accent themes
- Message composer with editable speaker name and tone tag
- Firestore-backed live rooms and messages
- Local seeded preview that persists in `localStorage`
- Lazy-loaded Firebase chunk so the preview path does not pay the SDK cost upfront

## Stack

- React 19
- Vite
- Firebase Firestore
- Plain CSS with custom tokens and responsive layout rules

## Run locally

```bash
npm install
npm run dev
```

## GitHub Pages

This repository is configured for GitHub Pages project-site hosting at:

```text
https://alfievarghese.github.io/chat_mulearn/
```

The Vite build uses a relative base path so static assets resolve correctly on the GitHub Pages project URL, and `.github/workflows/deploy-pages.yml` builds and deploys the `dist` folder on every push to `main`.

After pushing, enable Pages in the repository settings:

1. Open `Settings -> Pages`
2. Set `Source` to `GitHub Actions`

## Firebase setup

Create `.env` from `.env.example` and fill in:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

If these values are missing, the app automatically falls back to local demo mode.

## Firestore shape

- `rooms/{roomId}`
- `rooms/{roomId}/messages/{messageId}`

Room document fields:

- `name`
- `topic`
- `accent`
- `host`
- `lastMessage`
- `createdAt`
- `updatedAt`

Message document fields:

- `author`
- `text`
- `tone`
- `createdAt`

## Suggested development rules

These are intentionally permissive for a task demo. Tighten them before any real deployment.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;
      match /messages/{messageId} {
        allow read, write: if true;
      }
    }
  }
}
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Notes

- The `Seed live rooms` button only activates when Firebase config is present.
- The repository does not include secrets.
- The local preview is deliberate, not a placeholder.
