import fetch from 'node-fetch'
import { config } from '../config.js'

export class AIService {
    constructor() {
        this.config = config.ai
        this.conversationContexts = new Map()
        this.responseCache = new Map()
        this.cacheTimeout = config.ai.cacheTimeout || 5 * 60 * 1000
    }

    loadConfig() {
        return {
            // Ollama local AI (recomendado para privacidad)
            ollama: {
                enabled: true,
                url: 'http://localhost:11434',
                model: 'llama2', // o 'llama2:7b', 'mistral', 'codellama', etc.
                temperature: 0.7,
                maxTokens: 500
            },
            
            // OpenAI API (opcional)
            openai: {
                enabled: false,
                apiKey: process.env.OPENAI_API_KEY || '',
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 500
            },
            
            // Google Gemini (opcional)
            gemini: {
                enabled: false,
                apiKey: process.env.GEMINI_API_KEY || '',
                model: 'gemini-pro',
                temperature: 0.7
            },

            // LM Studio local (alternativa a Ollama)
            lmstudio: {
                enabled: false,
                url: 'http://localhost:1234',
                model: 'local-model',
                temperature: 0.7,
                maxTokens: 500
            },

            // Configuración general
            general: {
                provider: 'ollama', // 'ollama', 'openai', 'gemini', 'lmstudio'
                timeout: 30000,
                retryAttempts: 2,
                enableCache: true,
                personality: 'helpful' // 'helpful', 'casual', 'professional', 'funny'
            }
        }
    }

    async generateResponse(message, conversationHistory = [], senderName = 'Usuario') {
        try {
            const cacheKey = this.generateCacheKey(message, conversationHistory)
            
            if (this.config.enableCache) {
                const cachedResponse = this.getFromCache(cacheKey)
                if (cachedResponse) {
                    console.log('📋 Respuesta obtenida desde cache')
                    return cachedResponse
                }
            }

            const systemPrompt = this.buildSystemPrompt(senderName)
            const contextualMessage = this.buildContextualMessage(message, conversationHistory, senderName)
            
            let response = null
            
            switch (this.config.provider) {
                case 'ollama':
                    response = await this.generateWithOllama(systemPrompt, contextualMessage)
                    break
                case 'lmstudio':
                    response = await this.generateWithLMStudio(systemPrompt, contextualMessage)
                    break
                case 'openai':
                    response = await this.generateWithOpenAI(systemPrompt, contextualMessage)
                    break
                case 'gemini':
                    response = await this.generateWithGemini(systemPrompt, contextualMessage)
                    break
                default:
                    throw new Error(`Proveedor de AI no soportado: ${this.config.provider}`)
            }

            if (response && this.config.enableCache) {
                this.addToCache(cacheKey, response)
            }

            return this.postProcessResponse(response)
            
        } catch (error) {
            console.error('❌ Error generando respuesta AI:', error)
            return this.getFallbackResponse(message)
        }
    }

    buildSystemPrompt(senderName) {
        const personalities = {
            helpful: `Eres un asistente inteligente y útil. Responde de manera clara, concisa y servicial. Tu nombre es WhatsApp AI Bot.`,
            casual: `Eres un amigo virtual relajado y casual. Usa un lenguaje informal y natural. Sé amigable pero no demasiado efusivo.`,
            professional: `Eres un asistente profesional y cortés. Mantén un tono formal pero cálido. Proporciona respuestas precisas y bien estructuradas.`,
            funny: `Eres un asistente con buen sentido del humor. Incluye humor apropiado en tus respuestas cuando sea natural hacerlo.`
        }

        const basePrompt = personalities[this.config.personality] || personalities.helpful

        return `${basePrompt}

Instrucciones importantes:
- Responde siempre en español
- Mantén las respuestas cortas (máximo 2-3 párrafos)
- Sé natural y conversacional
- Si no sabes algo, admítelo honestamente
- No generes contenido inapropiado o dañino
- El usuario se llama ${senderName}
- Estás conversando por WhatsApp, así que adapta tu estilo

Contexto: Eres un bot de WhatsApp que ayuda a los usuarios con sus consultas.`
    }

    buildContextualMessage(message, conversationHistory, senderName) {
        let contextMessage = ''
        
        if (conversationHistory.length > 0) {
            contextMessage += 'Historial de conversación:\n'
            
            const lastMessages = conversationHistory.slice(-6)
            for (const msg of lastMessages) {
                const role = msg.role === 'user' ? msg.senderName || 'Usuario' : 'Bot'
                contextMessage += `${role}: ${msg.content}\n`
            }
            
            contextMessage += '\n'
        }
        
        contextMessage += `${senderName}: ${message}`
        
        return contextMessage
    }

    async generateWithOllama(systemPrompt, message) {
        const ollamaConfig = this.config.providers.ollama
        if (!ollamaConfig.enabled) {
            throw new Error('Ollama no está habilitado')
        }

        const response = await fetch(`${ollamaConfig.url}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: ollamaConfig.model,
                prompt: `${systemPrompt}\n\n${message}\n\nBot:`,
                stream: false,
                options: {
                    temperature: ollamaConfig.temperature,
                    num_predict: ollamaConfig.maxTokens
                }
            }),
            timeout: this.config.responseTimeout
        })

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`)
        }

        const data = await response.json()
        return data.response?.trim()
    }

    async generateWithLMStudio(systemPrompt, message) {
        const lmConfig = this.config.providers.lmstudio
        if (!lmConfig.enabled) {
            throw new Error('LM Studio no está habilitado')
        }

        const response = await fetch(`${lmConfig.url}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: lmConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: lmConfig.temperature,
                max_tokens: lmConfig.maxTokens
            }),
            timeout: this.config.responseTimeout
        })

        if (!response.ok) {
            throw new Error(`LM Studio API error: ${response.status}`)
        }

        const data = await response.json()
        return data.choices[0]?.message?.content?.trim()
    }

    async generateWithOpenAI(systemPrompt, message) {
        const openaiConfig = this.config.providers.openai
        if (!openaiConfig.enabled || !openaiConfig.apiKey) {
            throw new Error('OpenAI no está configurado')
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: openaiConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: openaiConfig.temperature,
                max_tokens: openaiConfig.maxTokens
            }),
            timeout: this.config.responseTimeout
        })

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        return data.choices[0]?.message?.content?.trim()
    }

    async generateWithGemini(systemPrompt, message) {
        const geminiConfig = this.config.providers.gemini
        if (!geminiConfig.enabled || !geminiConfig.apiKey) {
            throw new Error('Gemini no está configurado')
        }

        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(geminiConfig.apiKey)
        const model = genAI.getGenerativeModel({ model: geminiConfig.model })

        const prompt = `${systemPrompt}\n\n${message}`
        const result = await model.generateContent(prompt)
        const response = await result.response
        
        return response.text()?.trim()
    }

    postProcessResponse(response) {
        if (!response) return null
        
        response = response.trim()
        
        if (response.startsWith('Bot:')) {
            response = response.substring(4).trim()
        }
        
        response = response.replace(/\n+/g, '\n')
        
        if (response.length > this.config.maxResponseLength) {
            response = response.substring(0, this.config.maxResponseLength - 3) + '...'
        }
        
        return response
    }

    getFallbackResponse(message) {
        const fallbackResponses = [
            "Disculpa, tengo problemas para procesar tu mensaje en este momento. ¿Podrías intentar de nuevo?",
            "Lo siento, mi sistema de AI está experimentando dificultades. ¿Puedes reformular tu pregunta?",
            "Ups, algo salió mal con mi respuesta automática. ¿Podrías intentar nuevamente?",
            "Disculpa la demora, estoy teniendo problemas técnicos. ¿Puedes repetir tu consulta?"
        ]
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
    }

    generateCacheKey(message, conversationHistory) {
        const historyString = conversationHistory.slice(-3).map(msg => msg.content).join('|')
        const combined = `${message}|${historyString}`
        
        return Buffer.from(combined).toString('base64').substring(0, 50)
    }

    addToCache(key, response) {
        this.responseCache.set(key, {
            response,
            timestamp: Date.now()
        })
        
        setTimeout(() => {
            this.responseCache.delete(key)
        }, this.cacheTimeout)
    }

    getFromCache(key) {
        const cached = this.responseCache.get(key)
        if (!cached) return null
        
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.responseCache.delete(key)
            return null
        }
        
        return cached.response
    }

    async testConnection() {
        const testMessage = "Hola, responde solo con 'OK' si funciona correctamente"
        
        try {
            const response = await this.generateResponse(testMessage, [], 'Test')
            return {
                success: true,
                provider: this.config.general.provider,
                response: response?.substring(0, 100)
            }
        } catch (error) {
            return {
                success: false,
                provider: this.config.general.provider,
                error: error.message
            }
        }
    }

    getStats() {
        return {
            provider: this.config.general.provider,
            cacheSize: this.responseCache.size,
            configuration: {
                ollama: this.config.ollama.enabled,
                openai: this.config.openai.enabled,
                gemini: this.config.gemini.enabled,
                lmstudio: this.config.lmstudio.enabled
            }
        }
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig }
        console.log('⚙️ Configuración de AI actualizada')
    }
}