# project-lovable-server3

A real-time speech transcription application using Google Cloud Speech-to-Text API with Socket.IO for live communication between the client and server.

## Features

- **Live Speech Transcription**: Real-time speech-to-text conversion using Google Cloud Speech-to-Text API
- **WebSocket Communication**: Real-time bidirectional communication using Socket.IO
- **Modern UI**: Clean and intuitive interface built with Next.js and Tailwind CSS
- **Microphone Integration**: Direct browser microphone access with MediaRecorder API
- **Real-time Feedback**: Live interim and final transcription results

## Setup

### Prerequisites

1. Node.js (v18 or higher)
2. Bun package manager
3. Google Cloud Project with Speech-to-Text API enabled
4. Google Cloud Service Account with Speech-to-Text permissions

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
CORS_ORIGIN=http://localhost:3001

# Google Cloud Speech-to-Text Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-key

# Web App Configuration
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### Google Cloud Setup

1. Create a Google Cloud Project
2. Enable the Speech-to-Text API
3. Create a Service Account with Speech-to-Text permissions
4. Download the service account key JSON file
5. Convert the JSON to base64: `cat service-account-key.json | base64`
6. Add the base64 string to your environment variables

### Installation & Running

1. Install dependencies:

   ```bash
   bun install
   ```

2. Start the server:

   ```bash
   cd apps/server
   bun run dev
   ```

3. Start the web app (in a new terminal):

   ```bash
   cd apps/web
   bun run dev
   ```

4. Open your browser to `http://localhost:3001`

## Usage

1. Ensure your microphone permissions are granted
2. Click "Start Recording" to begin transcription
3. Speak clearly into your microphone
4. Watch live transcription appear in real-time
5. Click "Stop Recording" when finished
6. Use "Copy" to copy the final transcript

## Technology Stack

- **Server**: Express.js, Socket.IO, Google Cloud Speech-to-Text API
- **Client**: Next.js, React, Socket.IO Client, Tailwind CSS
- **Runtime**: Bun
- **Language**: TypeScript

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Express, and more.

- **Express** - Fast, unopinionated web framework
- **Bun** - Runtime environment
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database engine

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Prisma.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Generate the Prisma client and push the schema:

```bash
bun db:push
```

Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
project-lovable-server3/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   └── server/      # Backend API (Express)
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
