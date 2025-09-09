import fs from 'fs/promises'
import path from 'path'

export class ConversationManager {
    constructor() {
        this.conversations = new Map()
        this.maxMessagesPerConversation = 20
        this.conversationTimeout = 24 * 60 * 60 * 1000 // 24 hours
        this.dataFile = 'conversations.json'
        
        this.loadConversations()
        this.startCleanupTimer()
    }

    async loadConversations() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8')
            const conversationsData = JSON.parse(data)
            
            for (const [jid, conversation] of Object.entries(conversationsData)) {
                this.conversations.set(jid, {
                    ...conversation,
                    lastActivity: new Date(conversation.lastActivity)
                })
            }
            
            console.log(`📚 Cargadas ${this.conversations.size} conversaciones desde archivo`)
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Error cargando conversaciones:', error)
            }
        }
    }

    async saveConversations() {
        try {
            const conversationsData = {}
            
            for (const [jid, conversation] of this.conversations.entries()) {
                conversationsData[jid] = {
                    ...conversation,
                    lastActivity: conversation.lastActivity.toISOString()
                }
            }
            
            await fs.writeFile(this.dataFile, JSON.stringify(conversationsData, null, 2))
        } catch (error) {
            console.error('❌ Error guardando conversaciones:', error)
        }
    }

    addMessage(jid, role, content, senderName = 'Usuario') {
        if (!this.conversations.has(jid)) {
            this.conversations.set(jid, {
                messages: [],
                participants: new Set(),
                createdAt: new Date(),
                lastActivity: new Date(),
                totalMessages: 0,
                context: {
                    userPreferences: {},
                    topics: [],
                    mood: 'neutral'
                }
            })
        }

        const conversation = this.conversations.get(jid)
        
        const message = {
            role,
            content,
            timestamp: new Date(),
            senderName,
            id: this.generateMessageId()
        }

        conversation.messages.push(message)
        conversation.participants.add(senderName)
        conversation.lastActivity = new Date()
        conversation.totalMessages++

        if (conversation.messages.length > this.maxMessagesPerConversation) {
            const removedMessages = conversation.messages.splice(0, conversation.messages.length - this.maxMessagesPerConversation)
            console.log(`🧹 Limpiados ${removedMessages.length} mensajes antiguos de la conversación ${jid}`)
        }

        this.updateConversationContext(jid, message)
        this.saveConversations()

        return message.id
    }

    updateConversationContext(jid, message) {
        const conversation = this.conversations.get(jid)
        if (!conversation) return

        const content = message.content.toLowerCase()
        
        if (content.includes('gracias') || content.includes('excelente') || content.includes('perfecto')) {
            conversation.context.mood = 'positive'
        } else if (content.includes('problema') || content.includes('error') || content.includes('mal')) {
            conversation.context.mood = 'negative'
        } else {
            conversation.context.mood = 'neutral'
        }

        const topics = this.extractTopics(content)
        conversation.context.topics = [...new Set([...conversation.context.topics, ...topics])].slice(-10)
    }

    extractTopics(content) {
        const topics = []
        const keywords = {
            'tecnologia': ['programar', 'código', 'software', 'app', 'web', 'tecnología'],
            'salud': ['medicina', 'doctor', 'salud', 'enfermedad', 'tratamiento'],
            'negocio': ['empresa', 'negocio', 'trabajo', 'dinero', 'vender'],
            'educacion': ['estudiar', 'aprender', 'curso', 'educación', 'escuela'],
            'entretenimiento': ['juego', 'película', 'música', 'diversión']
        }

        for (const [topic, words] of Object.entries(keywords)) {
            if (words.some(word => content.includes(word))) {
                topics.push(topic)
            }
        }

        return topics
    }

    getConversation(jid) {
        const conversation = this.conversations.get(jid)
        if (!conversation) return []

        return conversation.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            senderName: msg.senderName,
            timestamp: msg.timestamp
        }))
    }

    getConversationContext(jid) {
        const conversation = this.conversations.get(jid)
        return conversation ? conversation.context : null
    }

    getConversationStats(jid) {
        const conversation = this.conversations.get(jid)
        if (!conversation) return null

        return {
            totalMessages: conversation.totalMessages,
            participantsCount: conversation.participants.size,
            participants: Array.from(conversation.participants),
            createdAt: conversation.createdAt,
            lastActivity: conversation.lastActivity,
            topics: conversation.context.topics,
            mood: conversation.context.mood,
            messagesInMemory: conversation.messages.length
        }
    }

    getAllConversationsStats() {
        const stats = {
            totalConversations: this.conversations.size,
            activeConversations: 0,
            totalMessages: 0,
            topicDistribution: {},
            moodDistribution: { positive: 0, negative: 0, neutral: 0 }
        }

        const now = new Date()
        const activeThreshold = 60 * 60 * 1000 // 1 hour

        for (const conversation of this.conversations.values()) {
            stats.totalMessages += conversation.totalMessages

            if (now - conversation.lastActivity < activeThreshold) {
                stats.activeConversations++
            }

            stats.moodDistribution[conversation.context.mood]++

            for (const topic of conversation.context.topics) {
                stats.topicDistribution[topic] = (stats.topicDistribution[topic] || 0) + 1
            }
        }

        return stats
    }

    clearConversation(jid) {
        if (this.conversations.has(jid)) {
            this.conversations.delete(jid)
            this.saveConversations()
            return true
        }
        return false
    }

    getActiveConversationsCount() {
        const now = new Date()
        const activeThreshold = 60 * 60 * 1000 // 1 hour
        
        let activeCount = 0
        for (const conversation of this.conversations.values()) {
            if (now - conversation.lastActivity < activeThreshold) {
                activeCount++
            }
        }
        
        return activeCount
    }

    cleanupOldConversations() {
        const now = new Date()
        const cutoffTime = now - this.conversationTimeout
        let removedCount = 0

        for (const [jid, conversation] of this.conversations.entries()) {
            if (conversation.lastActivity < cutoffTime) {
                this.conversations.delete(jid)
                removedCount++
            }
        }

        if (removedCount > 0) {
            console.log(`🧹 Limpiadas ${removedCount} conversaciones inactivas`)
            this.saveConversations()
        }

        return removedCount
    }

    startCleanupTimer() {
        setInterval(() => {
            this.cleanupOldConversations()
        }, 60 * 60 * 1000) // Check every hour
    }

    generateMessageId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }

    searchConversations(query) {
        const results = []
        const searchTerm = query.toLowerCase()

        for (const [jid, conversation] of this.conversations.entries()) {
            const matchingMessages = conversation.messages.filter(msg => 
                msg.content.toLowerCase().includes(searchTerm) ||
                msg.senderName.toLowerCase().includes(searchTerm)
            )

            if (matchingMessages.length > 0) {
                results.push({
                    jid,
                    matchingMessages: matchingMessages.length,
                    lastMatch: matchingMessages[matchingMessages.length - 1],
                    totalMessages: conversation.totalMessages
                })
            }
        }

        return results.sort((a, b) => b.lastMatch.timestamp - a.lastMatch.timestamp)
    }

    getActiveConversationCount() {
        return this.conversations.size
    }

    exportConversation(jid) {
        const conversation = this.conversations.get(jid)
        if (!conversation) return null

        return {
            jid,
            stats: this.getConversationStats(jid),
            messages: conversation.messages,
            exportDate: new Date()
        }
    }
}