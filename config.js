export const config = {
    // Configuración del Bot
    bot: {
        name: 'WhatsApp AI Bot',
        version: '1.0.0',
        description: 'Bot de WhatsApp con respuestas de IA',
        autoResponse: true,
        respondToGroups: false,
        commandPrefix: '/'
    },

    // Configuración de AI
    ai: {
        provider: 'ollama', // 'ollama', 'lmstudio', 'openai', 'gemini'
        personality: 'helpful', // 'helpful', 'casual', 'professional', 'funny'
        maxResponseLength: 1000,
        responseTimeout: 30000,
        enableCache: true,
        cacheTimeout: 300000, // 5 minutos
        
        // Configuraciones por proveedor
        providers: {
            ollama: {
                enabled: true,
                url: 'http://localhost:11434',
                model: 'llama2', // Cambia por el modelo que tengas instalado
                temperature: 0.7,
                maxTokens: 500
            },
            
            lmstudio: {
                enabled: false,
                url: 'http://localhost:1234',
                model: 'local-model',
                temperature: 0.7,
                maxTokens: 500
            },
            
            openai: {
                enabled: false,
                apiKey: process.env.OPENAI_API_KEY || '',
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 500
            },
            
            gemini: {
                enabled: false,
                apiKey: process.env.GEMINI_API_KEY || '',
                model: 'gemini-pro',
                temperature: 0.7
            }
        }
    },

    // Configuración de conversaciones
    conversations: {
        maxMessagesPerConversation: 20,
        conversationTimeout: 24 * 60 * 60 * 1000, // 24 horas
        saveConversations: true,
        autoCleanup: true,
        cleanupInterval: 60 * 60 * 1000 // 1 hora
    },

    // Configuración de mensajes
    messages: {
        queueEnabled: true,
        maxRetries: 3,
        retryDelay: 5000,
        messageDelay: 1000, // Delay entre mensajes para evitar spam
        maxMessageLength: 4096
    },

    // Configuración de logging
    logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        saveToFile: false,
        logFile: 'bot.log'
    }
}

// Función para validar configuración
export function validateConfig() {
    const errors = []

    // Validar proveedor de AI
    if (!config.ai.providers[config.ai.provider]) {
        errors.push(`Proveedor de AI '${config.ai.provider}' no configurado`)
    }

    const provider = config.ai.providers[config.ai.provider]
    if (provider && !provider.enabled) {
        errors.push(`Proveedor de AI '${config.ai.provider}' está deshabilitado`)
    }

    // Validar configuraciones específicas
    if (config.ai.provider === 'openai' && !provider.apiKey) {
        errors.push('API Key de OpenAI requerida')
    }

    if (config.ai.provider === 'gemini' && !provider.apiKey) {
        errors.push('API Key de Gemini requerida')
    }

    if (errors.length > 0) {
        console.error('❌ Errores de configuración:')
        errors.forEach(error => console.error(`  - ${error}`))
        return false
    }

    console.log('✅ Configuración validada correctamente')
    return true
}