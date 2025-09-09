export class SimpleAIService {
    constructor() {
        this.responses = {
            greetings: [
                "¡Hola! ¿Cómo puedo ayudarte hoy?",
                "¡Hola! ¿En qué te puedo asistir?",
                "¡Saludos! ¿Qué necesitas?",
                "¡Hola! ¿Cómo estás? ¿En qué te puedo ayudar?"
            ],
            questions: [
                "Esa es una buena pregunta. Déjame pensarlo...",
                "Interesante pregunta. Mi opinión es que...",
                "Hmm, sobre eso puedo decirte que...",
                "Es un tema complejo, pero creo que..."
            ],
            general: [
                "Entiendo lo que me dices. ¿Podrías darme más detalles?",
                "Eso suena interesante. Cuéntame más al respecto.",
                "Comprendo. ¿Hay algo específico en lo que te pueda ayudar?",
                "Me parece bien. ¿Necesitas ayuda con algo más?"
            ],
            thanks: [
                "¡De nada! Siempre es un placer ayudar.",
                "¡No hay problema! Estoy aquí para ayudarte.",
                "¡Con gusto! ¿Necesitas algo más?",
                "¡Perfecto! Me alegra poder ayudarte."
            ],
            goodbye: [
                "¡Hasta pronto! Que tengas un buen día.",
                "¡Nos vemos! Cuídate mucho.",
                "¡Adiós! Siempre puedes escribirme cuando necesites ayuda.",
                "¡Hasta la vista! Que todo te vaya muy bien."
            ]
        }

        this.patterns = {
            greetings: /\b(hola|hello|hi|buenas|saludos|que tal)\b/i,
            questions: /\b(qué|que|como|cómo|cuando|cuándo|donde|dónde|por qué|porque)\b/i,
            thanks: /\b(gracias|thank you|thanks|muchas gracias)\b/i,
            goodbye: /\b(adiós|adios|bye|nos vemos|hasta luego|chao)\b/i
        }

        this.contextResponses = new Map()
        this.lastResponses = new Map()
    }

    async generateResponse(message, conversationHistory = [], senderName = 'Usuario') {
        try {
            const messageText = message.toLowerCase().trim()
            
            // Evitar repetir la misma respuesta
            const lastResponse = this.lastResponses.get(senderName)
            
            // Detectar patrones en el mensaje
            let responseType = 'general'
            
            if (this.patterns.greetings.test(messageText)) {
                responseType = 'greetings'
            } else if (this.patterns.questions.test(messageText)) {
                responseType = 'questions'
            } else if (this.patterns.thanks.test(messageText)) {
                responseType = 'thanks'
            } else if (this.patterns.goodbye.test(messageText)) {
                responseType = 'goodbye'
            }

            // Generar respuesta contextual
            let response = this.getContextualResponse(messageText, responseType, conversationHistory, senderName)
            
            // Evitar repetir la misma respuesta
            if (response === lastResponse) {
                const alternatives = this.responses[responseType]
                response = alternatives[Math.floor(Math.random() * alternatives.length)]
            }
            
            // Personalizar con el nombre
            response = this.personalizeResponse(response, senderName)
            
            // Guardar la última respuesta
            this.lastResponses.set(senderName, response)
            
            return response
            
        } catch (error) {
            console.error('Error generando respuesta:', error)
            return "Disculpa, tuve un pequeño problema procesando tu mensaje. ¿Podrías intentar de nuevo?"
        }
    }

    getContextualResponse(message, type, history, senderName) {
        // Respuestas específicas basadas en contenido
        if (message.includes('programacion') || message.includes('código') || message.includes('programming')) {
            return "¡Me encanta la programación! ¿En qué lenguaje estás trabajando? Puedo ayudarte con dudas sobre desarrollo."
        }
        
        if (message.includes('whatsapp') || message.includes('bot')) {
            return "¡Exacto! Soy un bot de WhatsApp creado para ayudarte. Puedo mantener conversaciones y responder a tus preguntas."
        }
        
        if (message.includes('tiempo') || message.includes('clima')) {
            return "No tengo acceso a datos del tiempo en tiempo real, pero te recomiendo revisar una app del clima local."
        }
        
        if (message.includes('ayuda') || message.includes('help')) {
            return "¡Por supuesto que te ayudo! Puedes preguntarme lo que necesites. También puedes usar comandos como /status para ver información del bot."
        }

        if (message.includes('nombre') || message.includes('como te llamas')) {
            return "Soy WhatsApp AI Bot, tu asistente virtual. ¡Es un placer conocerte!"
        }

        // Respuestas basadas en el historial de conversación
        if (history.length > 0) {
            const lastMessage = history[history.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
                if (message.includes('si') || message.includes('sí') || message.includes('ok')) {
                    return "¡Perfecto! ¿En qué más te puedo ayudar?"
                }
                if (message.includes('no')) {
                    return "Entiendo. ¿Hay algo más en lo que pueda asistirte?"
                }
            }
        }

        // Respuesta por defecto según el tipo
        const responses = this.responses[type]
        return responses[Math.floor(Math.random() * responses.length)]
    }

    personalizeResponse(response, senderName) {
        // Agregar el nombre ocasionalmente para personalizar
        if (Math.random() < 0.3 && senderName && senderName !== 'Usuario') {
            const personalizations = [
                `, ${senderName}`,
                ` ${senderName}`,
                `. ¿Verdad, ${senderName}?`
            ]
            const personalization = personalizations[Math.floor(Math.random() * personalizations.length)]
            
            // Insertar la personalización apropiadamente
            if (response.endsWith('.') || response.endsWith('!') || response.endsWith('?')) {
                response = response.slice(0, -1) + personalization + response.slice(-1)
            } else {
                response += personalization
            }
        }
        
        return response
    }

    // Método compatible con la interfaz original
    async testConnection() {
        return {
            success: true,
            provider: 'simple-ai',
            response: 'OK - IA simple funcionando correctamente'
        }
    }

    getStats() {
        return {
            provider: 'simple-ai',
            cacheSize: this.lastResponses.size,
            configuration: {
                simple: true,
                local: true,
                patterns: Object.keys(this.patterns).length
            }
        }
    }

    // Agregar nueva respuesta personalizada
    addCustomResponse(pattern, responses) {
        if (!Array.isArray(responses)) {
            responses = [responses]
        }
        this.responses[pattern] = responses
        this.patterns[pattern] = new RegExp(pattern, 'i')
    }

    // Obtener estadísticas de uso
    getUsageStats() {
        return {
            totalUsers: this.lastResponses.size,
            responseTypes: Object.keys(this.responses).length,
            customPatterns: Object.keys(this.patterns).length
        }
    }
}