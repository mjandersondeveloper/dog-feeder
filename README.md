# 🐶 Dog Feeder

A Progressive Web App (PWA) for tracking when your dog has been fed, with automatic reminders and multi-device support. Mark the dog as fed, snooze reminders, and view feeding history all in one simple app!

## Features

- ✅ **Mark Dog As Fed** - One-click button to log that the dog has been fed (disabled once daily)
- 📬 **Push Notifications** - Automatic reminders when the dog hasn't been fed
- ⏰ **Smart Reminders** - Configurable local reminder time, repeated every 4 hours until feeding is recorded
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
- Firebase Cloud Functions and Cloud Tasks (event-driven reminders and feed notifications)

**Deployment:**
- Frontend: GitHub Pages
- Backend: Firebase

## How It Works

### Prerequisites

- Node.js 22+ and npm
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
            │ Firestore change │    │ Cloud Tasks      │
            │   triggers       │    │ reminderDispatch │
            │                 │    │ (one-shot tasks) │
            └──────────────────┘    └──────────────────┘
```

### Core Workflows

#### 1. Marking the Dog as Fed

```
User clicks "I Fed The Dog"
    ↓
markFed() updates Firestore:
  - dog/status: { lastFedAt, fedBy }
  - dogFeedHistory: { fedBy, fedAt } (new document)
    ↓
Firestore trigger sends notification to enabled devices:
  "🐶 Thanks for the brown rocks!"
    ↓
Feed history updates on all devices (real-time subscription)
```

#### 2. Reminder System (Cloud Tasks)

Firestore changes to `dog/status` or `dog/settings` recalculate the next eligible reminder and enqueue one task. The task checks the current state before sending; stale tasks from a feed, snooze, or settings change are discarded. After sending, it schedules the next task four hours later.

- Reminder times and feed-date comparisons use `America/New_York`.
- If the dog was fed today, reminders resume at the configured time the next day.
- If no feed has been recorded, the first reminder is sent at the configured time and repeats every four hours until feeding is recorded, including overnight.
- An active snooze moves the next task to the later of the snooze expiry and the next eligible reminder time.
- No periodic reminder scan runs while there is no reminder due.

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
  reminderSentAt: timestamp,     // When last reminder was sent
  reminderScheduleBootstrapAt: timestamp // One-time task schedule initialization
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

**`dog/reminderScheduler`** - Internal task-queue state
```javascript
{
  generation: number,           // Invalidates tasks after relevant state changes
  sourceSignature: string,      // Feed, snooze, and reminder-time inputs
  nextReminderAt: timestamp,   // Due time for the single queued reminder
  nextTaskId: string            // Deterministic id for task deduplication
}
```

**`notificationEvents`** - Feed-notification delivery deduplication state

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

1. **Token Registration**
   - The user explicitly enables notifications in Settings, allowing the browser permission prompt to run from a user action.
   - When permission is already granted, app startup refreshes the FCM token and updates the device record only when it changes.
   - Token setup failures are shown in the UI.

2. **Push Notifications (Background)**
   - The custom service worker receives the push event and displays it with app-scoped icon and badge paths.
   - Reminder and feed notifications use separate notification tags.
   - Invalid or expired FCM tokens are removed after delivery failures.

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
firebase deploy --only functions
```

The app initializes the first reminder task on its next load. For headless initialization, run the command from `functions/` in an environment authenticated with Google Application Default Credentials and Firestore/Cloud Tasks permissions:

```bash
npm run bootstrap:reminders
```

Cloud Tasks APIs and required service-agent permissions must be available in the Firebase project. Deploy frontend changes to GitHub Pages as well when the app client changes.

## Key Files Reference

### Frontend Core

- [**App.jsx**](src/App.jsx) - Main React component
  - Sets up real-time Firestore subscriptions for status, settings, and user
  - Manages feed history state
  - Handles "I Fed The Dog" and "Snooze" button clicks
  - Renders main UI and history table

- [**dogService.js**](src/services/dogService.js) - Dog feeding business logic
  - `subscribeToStatus()` - Real-time subscription to dog status
  - `markFed(userName)` - Updates Firestore; a backend trigger sends feed notifications
  - `setSnooze(timestamp)` - Pauses reminders
  - `getFeedHistory()` - Fetches last 10 feeding logs

- [**settingsService.js**](src/services/settingsService.js) - Settings management
  - `subscribeToSettings()` - Real-time settings subscription
  - `updateSettings(data)` - Updates reminder time, snooze hours, etc.

- [**userService.js**](src/services/userService.js) - User/device management
  - `getDeviceId()` - Generates or retrieves persistent device UUID
  - `subscribeToUser()` - Real-time user subscription
  - `updateUser(data)` - Updates user name, notification preference, FCM token

- [**firebase.js**](src/services/firebase.js) - Firebase setup and FCM
  - Firebase initialization with project config
  - `requestNotificationPermission()` - Requests browser permission from Settings and generates an FCM token
  - `refreshNotificationToken()` - Refreshes a token when permission is already granted
  - `listenForMessages()` - Handles foreground push messages and returns its unsubscribe function

- [**SettingsPanel.jsx**](src/components/SettingsPanel.jsx) - Settings UI
  - Modal with form inputs for all settings
  - Displays current values and handles user changes
  - Saves to Firestore on submit

### Backend

- [**functions/index.js**](functions/index.js) - Cloud Functions
  - Firestore triggers reconcile tasks when feeding state or reminder settings change
  - `enqueueReminderTask()` - Enqueues the current task from scheduler state
  - `reminderDispatch()` - Validates, sends, and schedules the next four-hour reminder
  - A Firestore feed trigger sends "dog fed" notifications with event deduplication
- [**reminderLogic.js**](functions/reminderLogic.js) and [**reminderScheduler.js**](functions/reminderScheduler.js) - Time-zone-aware reminder timing and task scheduling

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
npm test             # Run Cloud Functions reminder tests
npm run bootstrap:reminders # Initialize the first reminder task (requires ADC)
```

**Happy feeding! 🐶**
