# 🐶 Dog Feeder

A Progressive Web App (PWA) for tracking when your dog has been fed, with automatic reminders and multi-device support. Mark the dog as fed, snooze reminders, and view feeding history all in one simple app!

## Features

- ✅ **Mark Dog As Fed** - One-click button to log that the dog has been fed (disabled once daily)
- 📬 **Push Notifications** - Automatic reminders when the dog hasn't been fed
- ⏰ **Smart Reminders** - Configurable reminder time with throttling (sends reminder every 4 hours max)
- 😴 **Snooze Functionality** - Temporarily pause reminders for a configurable duration
- 📜 **Feed History** - View the 10 most recent feeding logs with who fed the dog and when
- 👥 **Multi-Device Support** - Syncs data across all devices using the same device ID
- 📱 **Progressive Web App** - Installable on mobile, works offline with Service Worker
- 🌙 **Dark Mode** - Dark-themed UI that's easy on the eyes

## Tech Stack

**Frontend:**
- React 19
- Vite 8 (build tool with HMR)
- Vite PWA Plugin (service worker, web manifest, offline support)
- ESLint (code quality)

**Backend & Database:**
- Firebase Firestore (real-time database)
- Firebase Cloud Messaging (FCM) - push notifications
- Firebase Cloud Functions (scheduled reminders, notification endpoints)

**Deployment:**
- Frontend: GitHub Pages
- Backend: Firebase

## How It Works

### Prerequisites

- Node.js 18+ and npm
- Firebase account (free tier works)
- Git

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Dog Feeder Application                      │
└─────────────────────────────────────────────────────────────────┘
                                 ▲
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐  ┌──────────┐  ┌─────────────┐
              │ Firestore│  │   FCM    │  │  Service    │
              │ Database │  │ Messaging│  │  Worker     │
              └──────────┘  └──────────┘  └─────────────┘
                    ▲            ▲
                    └────────────┼────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            ┌──────────────────┐    ┌──────────────────┐
            │ Cloud Function 1 │    │ Cloud Function 2 │
            │  reminderCheck   │    │ sendDogFedNotif. │
            │  (every 15 min)  │    │  (on demand)     │
            └──────────────────┘    └──────────────────┘
```

### Core Workflows

#### 1. Marking the Dog as Fed

```
User clicks "I Fed The Dog"
    ↓
markFed() updates Firestore:
  - dog/status: { lastFedAt, fedBy, reminderSentAt = null }
  - dogFeedHistory: { fedBy, fedAt } (new document)
    ↓
Sends notification to all users:
  "🐶 Thanks for the brown rocks!"
    ↓
Feed history updates on all devices (real-time subscription)
```

#### 2. Reminder System (Cloud Function)

**Runs every 15 minutes:**

1. Check if reminders are snoozed
   - If `status.snoozedUntil > now`, skip sending reminder
2. Check if dog was fed today
   - Compare `lastFedAt.toDateString()` with today's date
3. Check reminder time
   - If current time < reminder time (default 6 PM), don't send
4. Check reminder frequency
   - Only send if never sent today OR 4+ hours since last reminder
5. Send notification via FCM to all users with `notificationsEnabled: true`
6. Update `status.reminderSentAt` timestamp

**Example timeline:**
- 6:00 PM → First reminder sent, `reminderSentAt` = 6:00 PM
- 7:00 PM → Dog not fed, but < 4 hours since reminder, skip
- 10:00 PM → Dog not fed, 4 hours since reminder → Send second reminder
- Next day before 6 PM → No reminder
- Next day 6 PM → If dog not fed, send reminder again

#### 3. Settings Management

```
User updates settings (reminder time, snooze duration, name)
    ↓
updateSettings() and updateUser() save to Firestore
    ↓
Subscriptions notify all components of changes
    ↓
UI re-renders with new values
```

### Data Structure

#### Firestore Collections

**`dog/status`** - Current feeding status (single document)
```javascript
{
  lastFedAt: timestamp,          // When dog was last fed
  fedBy: string,                 // Name of person who fed dog
  snoozedUntil: timestamp,       // Reminders paused until this time
  reminderSentAt: timestamp      // When last reminder was sent
}
```

**`dog/settings`** - App settings (single document)
```javascript
{
  reminderHour: number,          // Reminder time hour (0-23)
  reminderMinute: number,        // Reminder time minute (0-59)
  defaultSnoozeHours: number     // How long to snooze (in hours)
}
```

**`users`** - Device-specific user info (one per device)
```javascript
{
  name: string,                  // Display name for this device
  notificationsEnabled: boolean, // Whether to receive push notifications
  token: string                  // FCM token for push notifications
}
```

**`dogFeedHistory`** - Feeding history logs (one document per feed)
```javascript
{
  fedBy: string,                 // Who fed the dog
  fedAt: timestamp               // When the dog was fed
}
```

### Notification System

1. **Token Generation**
   - On app load, requests notification permission from browser
   - Generates FCM token via Firebase Cloud Messaging
   - Stores token in `users/{deviceId}` document
   - Syncs token with every app session

2. **Push Notifications (Background)**
   - Service Worker receives push event
   - Displays notification with icon and badge
   - Sets `requireInteraction: true` so notification persists

3. **Foreground Messages**
   - If app is open, FCM message triggers `onMessage` listener
   - Shows browser alert with notification title and body

4. **Notification Click**
   - Service Worker handles click event
   - Focuses existing app window or opens new one
   - Closes notification

## User Guide

### Main Screen

The main interface shows:

- **Dog Feeder Header** - App title and emoji
- **Status Card**
  - Last Fed: When the dog was last fed (or "Not yet")
  - Fed By: Who fed the dog (or "Nobody yet")
  - Snoozed Until: If active, when snooze expires
- **I Fed The Dog Button**
  - Enabled: Green, clickable
  - Disabled: Gray with ✅, if dog already fed today
- **Snooze Reminders Button** - Pauses reminders for configured duration
- **Feed History Table** - Last 10 feeding logs with name and timestamp

### Settings Panel

Click the **⚙️ Settings** button to open the settings modal:

- **Name** - Your name/identifier (displayed in feeding logs and notifications)
- **Reminder Time** - Time picker for when daily reminders should start (default 6 PM)
- **Notifications** - Checkbox to enable/disable push notifications
- **Default Snooze Hours** - How many hours to snooze when clicking snooze button (default 2)

Click **Save** to persist changes.

## Development Setup

### Run Locally

Start the development server with hot module reloading:

```bash
npm run dev
```

App will be available at `http://localhost:5173/dog-feeder/`

### Build for Production

```bash
npm run build
```

Output goes to `dist/` folder.

### Preview Build

```bash
npm run preview
```

Serves the production build locally to test before deployment.

### Lint Code

```bash
npm run lint
```

Runs ESLint to check code quality.

## Build & Deploy

### Deploy Frontend to GitHub Pages

```bash
npm run deploy
```

This runs `gh-pages -d dist`, which:
1. Builds the project with `vite build`
2. Pushes the `dist/` folder to the `gh-pages` branch
3. GitHub automatically deploys to your site

Your site will be live at: `https://<username>.github.io/dog-feeder/`

### Deploy Cloud Functions

```bash
cd functions
firebase deploy --only functions
```

Functions will be deployed to Firebase and accessible via their HTTP endpoints.

## Key Files Reference

### Frontend Core

- [**App.jsx**](src/App.jsx) - Main React component
  - Sets up real-time Firestore subscriptions for status, settings, and user
  - Manages feed history state
  - Handles "I Fed The Dog" and "Snooze" button clicks
  - Renders main UI and history table

- [**dogService.js**](src/services/dogService.js) - Dog feeding business logic
  - `subscribeToStatus()` - Real-time subscription to dog status
  - `markFed(userName)` - Updates Firestore and sends notifications
  - `setSnooze(timestamp)` - Pauses reminders
  - `getFeedHistory()` - Fetches last 10 feeding logs
  - `sendDogFedNotification()` - Calls Cloud Function to notify users

- [**settingsService.js**](src/services/settingsService.js) - Settings management
  - `subscribeToSettings()` - Real-time settings subscription
  - `updateSettings(data)` - Updates reminder time, snooze hours, etc.

- [**userService.js**](src/services/userService.js) - User/device management
  - `getDeviceId()` - Generates or retrieves persistent device UUID
  - `subscribeToUser()` - Real-time user subscription
  - `updateUser(data)` - Updates user name, notification preference, FCM token

- [**firebase.js**](src/services/firebase.js) - Firebase setup and FCM
  - Firebase initialization with project config
  - `requestNotificationPermission()` - Requests browser permission and generates FCM token
  - `listenForMessages()` - Handles foreground push messages

- [**SettingsPanel.jsx**](src/components/SettingsPanel.jsx) - Settings UI
  - Modal with form inputs for all settings
  - Displays current values and handles user changes
  - Saves to Firestore on submit

### Backend

- [**functions/index.js**](functions/index.js) - Cloud Functions
  - `reminderCheck()` - Scheduled function (every 15 min)
    - Checks if dog was fed today
    - Sends reminders if conditions met (after reminder time, every 4 hours)
    - Handles timezone conversion for US/Eastern
  - `sendDogFedNotification()` - HTTP endpoint
    - Called when dog is marked as fed
    - Sends "dog fed" notification to all subscribed users

### PWA & Config

- [**public/sw.js**](public/sw.js) - Service Worker
  - Handles push notifications (background)
  - Shows notification with icon, badge, and title
  - Handles notification clicks (focuses app or opens new window)

- [**vite.config.js**](vite.config.js) - Vite configuration
  - Registers Vite PWA plugin
  - Configures service worker injection
  - Sets PWA manifest with app name, icons, theme colors
  - Base path: `/dog-feeder/` for GitHub Pages

- [**firebase.json**](firebase.json) - Firebase configuration
  - Specifies Cloud Functions setup
  - Pre-deployment lint configuration

## NPM Scripts

```bash
npm run dev          # Start development server (port 5173)
npm run build        # Build for production (creates dist/)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint code quality checks
npm run deploy       # Build and deploy to GitHub Pages

# In functions/ directory:
npm run serve        # Start local Firebase Functions emulator
npm run deploy       # Deploy Cloud Functions to Firebase
npm run logs         # View Cloud Function logs
```

**Happy feeding! 🐶**
