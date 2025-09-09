export class MessageService {
    constructor() {
        this.messageQueue = []
        this.isProcessing = false
    }

    extractMessageText(msg) {
        try {
            if (!msg.message) return null
            
            if (msg.message.conversation) {
                return msg.message.conversation
            }
            
            if (msg.message.extendedTextMessage?.text) {
                return msg.message.extendedTextMessage.text
            }
            
            if (msg.message.imageMessage?.caption) {
                return msg.message.imageMessage.caption
            }
            
            if (msg.message.videoMessage?.caption) {
                return msg.message.videoMessage.caption
            }
            
            return null
        } catch (error) {
            console.error('❌ Error extrayendo texto del mensaje:', error)
            return null
        }
    }

    formatPhoneNumber(phoneNumber) {
        let formatted = phoneNumber.toString().replace(/\D/g, '')
        
        if (!formatted.startsWith('57') && formatted.length === 10) {
            formatted = '57' + formatted
        }
        
        return formatted + '@s.whatsapp.net'
    }

    isValidMessage(messageText) {
        if (!messageText || typeof messageText !== 'string') return false
        if (messageText.trim().length === 0) return false
        if (messageText.length > 4096) return false
        return true
    }

    async queueMessage(jid, message, priority = 'normal') {
        if (!this.isValidMessage(message)) {
            throw new Error('Mensaje inválido')
        }

        const messageObj = {
            jid,
            message,
            priority,
            timestamp: Date.now(),
            attempts: 0,
            maxAttempts: 3
        }

        if (priority === 'high') {
            this.messageQueue.unshift(messageObj)
        } else {
            this.messageQueue.push(messageObj)
        }

        if (!this.isProcessing) {
            this.processMessageQueue()
        }
    }

    async processMessageQueue() {
        if (this.isProcessing || this.messageQueue.length === 0) return
        
        this.isProcessing = true
        
        while (this.messageQueue.length > 0) {
            const messageObj = this.messageQueue.shift()
            
            try {
                await this.sendQueuedMessage(messageObj)
                await this.delay(1000)
            } catch (error) {
                messageObj.attempts++
                
                if (messageObj.attempts < messageObj.maxAttempts) {
                    console.log(`🔄 Reintentando mensaje (${messageObj.attempts}/${messageObj.maxAttempts})`)
                    this.messageQueue.push(messageObj)
                    await this.delay(5000)
                } else {
                    console.error(`❌ Falló el envío después de ${messageObj.maxAttempts} intentos:`, error)
                }
            }
        }
        
        this.isProcessing = false
    }

    async sendQueuedMessage(messageObj) {
        throw new Error('sendQueuedMessage debe ser implementado por la clase padre')
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    createTextMessage(text) {
        return { text }
    }

    createImageMessage(imageBuffer, caption = '') {
        return {
            image: imageBuffer,
            caption
        }
    }

    createContactMessage(vcard) {
        return {
            contacts: {
                displayName: 'Contact',
                contacts: [{
                    vcard
                }]
            }
        }
    }

    createLocationMessage(latitude, longitude, name = 'Ubicación') {
        return {
            location: {
                degreesLatitude: latitude,
                degreesLongitude: longitude,
                name
            }
        }
    }

    getMessageStats() {
        return {
            queueLength: this.messageQueue.length,
            isProcessing: this.isProcessing,
            highPriorityCount: this.messageQueue.filter(m => m.priority === 'high').length
        }
    }
}