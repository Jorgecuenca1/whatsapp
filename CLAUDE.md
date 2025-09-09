# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **WhatsApp AI Bot** built with Node.js that uses the Baileys library to connect to WhatsApp Web and provides automatic AI-powered responses. The bot can maintain conversations with multiple users and supports various local and cloud AI providers including Ollama, LM Studio, OpenAI, and Google Gemini.

## Project Architecture

### Core Components
- **`index.js`** - Main bot application with WhatsApp connection and event handling
- **`services/ai-service.js`** - AI integration layer supporting multiple providers
- **`services/conversation-manager.js`** - Conversation history and context management
- **`services/message-service.js`** - Message processing and queuing utilities
- **`config.js`** - Centralized configuration management

### Key Features
- Multi-user conversation management with context persistence
- Local AI support (Ollama, LM Studio) for privacy
- Cloud AI support (OpenAI, Gemini) as alternatives
- Message broadcasting capabilities
- Conversation caching and cleanup
- Command system for bot management

## Development Commands

### Setup and Installation
```bash
# Install dependencies
npm install

# Copy environment configuration
copy .env.example .env
```

### Running the Bot
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

# Test AI configuration
npm run test-ai
```

### AI Provider Testing
```bash
# Test current AI configuration
node test-ai.js
```

## Configuration

### Main Configuration (`config.js`)
- **AI Provider Settings**: Configure Ollama, LM Studio, OpenAI, or Gemini
- **Bot Personality**: Choose between helpful, casual, professional, or funny
- **Conversation Management**: Set message limits, timeouts, and cleanup intervals
- **Message Queue**: Configure retry attempts, delays, and rate limiting

### Environment Variables (`.env`)
```
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
AI_PROVIDER=ollama
OLLAMA_MODEL=llama2
```

## AI Provider Setup

### Ollama (Recommended for Privacy)
```bash
# Install Ollama, then download a model
ollama pull llama2
ollama pull mistral
```

### LM Studio
1. Download and install LM Studio
2. Load a model and start local server
3. Configure URL in `config.js`

### Cloud Providers
- Set API keys in `.env` file
- Enable provider in `config.js`

## Bot Commands

### User Commands (in WhatsApp)
- `/status` - Show bot status and statistics
- `/broadcast <message>` - Send message to all contacts (admin only)
- `/contacts` - View active conversation count

### Administrative Features
- Automatic conversation cleanup after 24 hours of inactivity
- Message queuing with retry logic
- Response caching for performance
- Conversation export capabilities

## Authentication and Data Storage

### WhatsApp Authentication
- **`auth_info/`** - Contains WhatsApp session data (never delete)
- QR code scanning required on first run
- Session persists across bot restarts

### Conversation Data
- **`conversations.json`** - Persistent conversation history
- Automatic cleanup of old conversations
- Context-aware responses using conversation history

## Development Guidelines

### Adding New AI Providers
1. Add provider configuration to `config.js`
2. Implement generation method in `ai-service.js`
3. Add provider validation in `validateConfig()`
4. Update test script for new provider

### Message Processing Flow
1. WhatsApp message received → `handleIncomingMessage()`
2. Text extraction → `messageService.extractMessageText()`
3. Conversation context → `conversationManager.getConversation()`
4. AI response generation → `aiService.generateResponse()`
5. Response sending → `sock.sendMessage()`

### Error Handling
- All API calls include timeout and retry logic
- Fallback responses when AI service fails
- Comprehensive logging for debugging
- Graceful handling of WhatsApp disconnections

## Security Considerations

- Local AI providers (Ollama/LM Studio) keep data private
- API keys stored in environment variables only
- WhatsApp session data isolated in `auth_info/` directory
- No external data transmission with local AI setup

## Performance Optimization

- Response caching reduces AI API calls
- Message queuing prevents rate limiting
- Conversation cleanup prevents memory leaks
- Configurable message history limits