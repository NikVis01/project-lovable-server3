# Project Features Documentation

## Overview

This is a comprehensive sales training platform that combines AI-powered conversational practice with real-time speech transcription and detailed performance evaluation. The application helps sales professionals improve their skills through realistic AI interactions and data-driven feedback.

## Architecture

The project is built using a modern monorepo structure with two main applications:

- **Frontend**: Next.js 15 web application with React 19
- **Backend**: Express.js API server with Socket.IO for real-time communication
- **Database**: PostgreSQL with Prisma ORM
- **AI Services**: Integration with Anthropic Claude, ElevenLabs, and Google Cloud Speech-to-Text

## Core Features

### 1. AI-Powered Conversational Training

**Location**: `apps/web/src/components/conversational-ai.tsx`

- **Real-time Voice Conversations**: Direct integration with ElevenLabs Conversational AI for natural speech interactions
- **Multiple AI Agents**: Support for different AI personalities (Eagle, Owl, Peacock, Dove) for varied training scenarios
- **WebRTC Communication**: High-quality, low-latency voice communication using WebRTC protocol
- **Live Transcription**: Real-time speech-to-text conversion during conversations
- **Auto-retry Connection**: Automatic reconnection on network failures with 3-second delay
- **Volume Control**: Built-in mute/unmute functionality during conversations
- **Session Management**: Complete conversation lifecycle management with unique session IDs

### 2. Speech Transcription System

**Location**: Multiple components including `speech-transcription.tsx`, `system-audio-recorder.tsx`

- **Google Cloud Speech-to-Text**: Advanced speech recognition with support for multiple languages
- **Real-time Processing**: Live interim and final transcription results
- **Dual Audio Recording**: Separate recording of user input and system output
- **WebM Audio Format**: Efficient audio compression for storage and transmission
- **Socket.IO Integration**: Real-time bidirectional communication between client and server
- **Microphone Permission Management**: Automatic permission requests and error handling

### 3. Performance Evaluation System

**Location**: `apps/web/src/components/evaluation-display.tsx`, `apps/server/src/services/eval/`

#### Comprehensive Analysis Features:

- **Talk Ratio Analysis**: Breakdown of speaking time between salesperson and client across conversation segments
- **Sentiment Analysis**: Real-time sentiment tracking of client responses throughout the conversation
- **Question Quality Assessment**: Identification and categorization of effective vs. ineffective questions
- **Filler Word Detection**: Analysis of speech patterns and identification of unnecessary filler words
- **Strengths & Weaknesses**: Automated identification of performance strengths and areas for improvement
- **Actionable Recommendations**: AI-generated specific recommendations for performance enhancement

#### Data Visualization:

- **Visual Talk Ratio**: Color-coded progress bars showing speaking time distribution
- **Sentiment Tracking**: Real-time sentiment indicators with color-coded badges (Positive/Neutral/Negative)
- **Activity Cards**: Apple-style activity cards for performance metrics
- **Tabbed Interface**: Organized presentation of different evaluation categories

### 4. Authentication & User Management

**Location**: `apps/web/src/lib/auth-client.ts`, Better Auth integration

- **Better Auth Integration**: Modern authentication system with multiple provider support
- **Session Management**: Secure session handling with JWT tokens
- **User Profile Management**: Complete user account management
- **Email Verification**: Built-in email verification system
- **OAuth Support**: Ready for social login integrations

### 5. Dashboard & Analytics

**Location**: `apps/web/src/app/dashboard/page.tsx`

- **Performance Overview**: Comprehensive dashboard showing key metrics
- **Session Statistics**: Today's calls, weekly progress, average scores
- **Quick Actions**: Direct access to pre-call setup, live recording, and session history
- **Agent Feed**: Real-time feed of AI agent activities and updates
- **Responsive Design**: Fully responsive layout optimized for desktop and mobile

### 6. Session Management System

**Location**: Database models and API endpoints

#### Session Features:

- **Session Lifecycle**: Complete tracking from start to finish with timestamps
- **Audio Storage**: Persistent storage of both input and output audio files
- **Session Status Tracking**: ACTIVE, ENDED, ERROR status management
- **Unique Session IDs**: CUID-based unique identifiers for each session
- **Metadata Storage**: Language code, transcript data, and audio URLs

#### Database Models:

- **TranscriptSession**: Core session data with audio URLs and transcripts
- **Evaluation**: Detailed evaluation results linked to sessions
- **ConvAIAgent**: AI agent configuration and management
- **User Management**: Complete user, session, and account models

### 7. Audio Processing Pipeline

**Location**: `apps/server/src/services/` and audio routers

- **Dual Stream Recording**: Simultaneous recording of user input and system output
- **Google Cloud Storage**: Secure cloud storage for audio files with organized folder structure
- **Audio Format Support**: WebM audio format with efficient compression
- **Stream Processing**: Real-time audio stream processing and analysis
- **File Management**: Organized storage by session ID with timestamped filenames

### 8. Real-time Communication

**Location**: Socket.IO implementation across client and server

- **WebSocket Communication**: Persistent bidirectional communication for live features
- **Real-time Transcription**: Live updates of speech-to-text results
- **Session Synchronization**: Real-time session state synchronization
- **Error Handling**: Robust error handling with automatic reconnection
- **Event-driven Architecture**: Clean separation of concerns using event-based communication

### 9. Modern UI/UX Components

**Location**: `apps/web/src/components/ui/` and custom components

#### Design System:

- **Radix UI Integration**: Professional component library with accessibility
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **shadcn/ui Components**: Modern, customizable UI components
- **Dark/Light Theme**: Built-in theme switching capability
- **Responsive Design**: Mobile-first responsive design approach

#### Custom Components:

- **Agent Manager**: Complete agent configuration and management interface
- **Mock Call Interface**: Simulated call environment for practice
- **Session History**: Comprehensive session browsing and management
- **Evaluation Charts**: Interactive charts and graphs for performance data

### 10. Development & Deployment Features

#### Development Tools:

- **TypeScript**: Full type safety across frontend and backend
- **Hot Reload**: Fast development with hot module replacement
- **ESLint & Prettier**: Code quality and formatting enforcement
- **Prisma Studio**: Visual database management interface

#### Build & Deployment:

- **Docker Support**: Containerized deployment with docker-compose
- **Database Migrations**: Version-controlled database schema changes
- **Environment Configuration**: Flexible environment-based configuration
- **Production Optimization**: Built-in optimization for production deployments

## API Endpoints

### Audio & Transcription

- `POST /api/transcribe` - Start speech transcription
- `POST /api/upload` - Upload audio files
- `GET /api/sessions/:id/audio` - Retrieve session audio

### ElevenLabs Integration

- `GET /api/elevenlabs/agents` - List available AI agents
- `GET /api/elevenlabs/conversation-token` - Get conversation token for WebRTC

### Evaluation System

- `POST /api/eval/:sessionId` - Generate evaluation for completed session
- `GET /api/eval/:sessionId` - Retrieve existing evaluation

### Session Management

- `GET /api/sessions` - List user sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session status

## Technology Stack

### Frontend Technologies

- **Next.js 15**: React-based web framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Tanstack Query**: Server state management
- **Socket.IO Client**: Real-time communication
- **ElevenLabs React SDK**: Voice AI integration

### Backend Technologies

- **Express.js**: Web application framework
- **Socket.IO**: Real-time bidirectional communication
- **Prisma**: Next-generation ORM
- **PostgreSQL**: Relational database
- **Better Auth**: Modern authentication solution
- **Anthropic SDK**: Claude AI integration
- **ElevenLabs SDK**: Voice AI services
- **Google Cloud**: Speech-to-Text and Storage services

### Development & Deployment

- **Bun**: Fast JavaScript runtime and package manager
- **Docker**: Containerization platform
- **TSDown**: TypeScript build tool
- **ESLint**: Code linting and quality
- **Prisma Migrate**: Database schema management

## Security Features

- **Authentication**: Secure user authentication with session management
- **Input Validation**: Zod-based request validation
- **CORS Protection**: Configurable CORS policies
- **Environment Variables**: Secure configuration management
- **Audio File Security**: Secure cloud storage with access controls
- **Session Security**: Secure session tokens and expiration handling

## Performance Optimizations

- **WebRTC**: Low-latency voice communication
- **Efficient Bundling**: Optimized JavaScript bundles
- **Image Optimization**: Next.js automatic image optimization
- **Database Indexing**: Optimized database queries
- **Caching**: Strategic caching for improved performance
- **Streaming**: Real-time data streaming for live features

## Extensibility

The platform is designed for easy extension with:

- **Modular Architecture**: Clean separation of concerns
- **Plugin System**: Easy integration of new AI services
- **API-first Design**: RESTful API design for integrations
- **Component Library**: Reusable UI components
- **Event System**: Extensible event-driven architecture
- **Configuration Management**: Flexible configuration options

This comprehensive feature set makes the platform ideal for sales training, interview practice, and general communication skills development with AI-powered feedback and analysis.

⏺ Sales Call Workflow Features Analysis

I've thoroughly analyzed your sales training platform's
complete workflow. Here's a detailed breakdown of the three
main phases:

1. Pre-Call Sales Preparation Features

Location: apps/web/src/app/dashboard/pre-call/page.tsx

🤖 AI Agent Management System

- Custom Agent Creation: Create personalized AI agents with
  custom voices and personalities
- DISC Personality Training: Train with 4 specific client
  types:
  - 🕊 Dove (Amiable/Relationship-oriented) - Peaceful,
    cooperative, values trust
  - 🦚 Peacock (Expressive/Social) - Outgoing, optimistic,
    enjoys recognition
  - 🦉 Owl (Analytical/Detail-oriented) - Logical, methodical,
    data-driven
  - 🦅 Eagle (Driver/Results-oriented) - Bold, decisive,
    goal-focused

🎯 Advanced Configuration Options

- Voice Selection: Choose from multiple ElevenLabs voices with
  live previews
- Talk Speed Control: Adjustable TTS speed (0.70x - 1.20x)
- Multi-Language Support: 9 languages including English,
  Spanish, French, German
- Custom System Prompts: Define agent personality, role, and
  behavior
- First Message Configuration: Set conversation starters

🎧 Real-Time Voice Conversation

- WebRTC Integration: Low-latency, high-quality voice
  communication
- Live Transcription: Real-time speech-to-text during
  conversations
- Auto-Retry Connection: Automatic reconnection with 3-second
  delays
- Volume Controls: Built-in mute/unmute functionality

2. Current Interview/Call Real-Time Insights

Location: apps/web/src/app/dashboard/current-call/page.tsx

🎙️ Dual-Stream Recording System

- Sales Rep Recording: Microphone input with echo cancellation
- Client Audio Capture: System audio recording via screen
  share
- Simultaneous Processing: Both streams recorded and
  transcribed in parallel
- Smart Tab Switching: Auto-switches between Sales/Client
  views based on activity

📊 Live Performance Indicators

- Real-Time Transcription: Separate transcripts for sales rep
  and client
- Activity Visualization: Pulsing indicators show who's
  speaking
- Conversation Counters: Live count of interactions per person
- Audio Playback: Recorded audio available immediately after
  stopping

🔄 Session Management

- Unique Session IDs: CUID-based tracking for each
  conversation
- Cloud Storage: Audio files automatically uploaded to Google
  Cloud
- Status Tracking: ACTIVE/ENDED/ERROR states with timestamps
- WebM Format: Efficient audio compression for storage

3. Post-Call Evaluation & Mock Interview Features

Location: apps/web/src/app/dashboard/post-call/page.tsx

📈 Advanced Performance Analytics (Enhanced with Apple
Activity Cards)

- Talk Ratio Analysis: Visual breakdown of speaking time
  (Target: 40% you, 60% client)
- Client Sentiment Tracking: Real-time sentiment analysis with
  color-coded indicators
- Question Quality Assessment: AI identifies effective vs.
  ineffective questions
- Speech Pattern Analysis: Filler word detection and
  recommendations
- Performance Scoring: Apple Watch-style activity rings for
  key metrics

🎯 Comprehensive Evaluation Display (5-Tab Interface)

1. Overview: Strengths, weaknesses, and recommendations
2. Talk Ratio: Visual conversation breakdown with Apple
   Activity Cards
3. Sentiment: Client sentiment timeline and analysis
4. Questions: Categorized effective vs. ineffective questions
5. Speech: Filler word analysis and speech improvement tips

🤖 AI-Powered Mock Coaching System

- Dual-Phase AI Coach:
  - Phase 1: Performance feedback based on evaluation
  - Phase 2: Mock client practice with realistic scenarios
- Context-Aware Training: AI references actual conversation
  data
- Personalized Recommendations: Specific improvement areas
  from real calls
- Realistic Objections: AI presents challenges similar to
  original conversations

💡 Intelligence Features

- Smart Prompt Generation: Creates coaching prompts from
  actual call data
- Performance Correlation: Links evaluation data with practice
  scenarios
- Conversation Memory: AI remembers context from original
  calls
- Progressive Training: Focuses on identified weak areas

🔄 Complete Workflow Integration

Pre-Call → Current Call → Post-Call forms a seamless learning
loop:

1. Prepare with customized AI agents matching target client
   personalities
2. Execute with real-time recording, transcription, and
   performance monitoring
3. Improve through detailed evaluation, AI coaching, and
   targeted mock practice
4. Iterate by applying learnings to next pre-call preparation

This creates a comprehensive sales training ecosystem that
combines AI-powered practice, real-time performance
monitoring, and data-driven improvement recommendations.
