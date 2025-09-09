import { Boom } from '@hapi/boom'
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    isJidBroadcast, 
    isJidGroup,
    fetchLatestBaileysVersion 
} from 'baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { SimpleAIService } from './services/simple-ai-service.js'
import { ConversationManager } from './services/conversation-manager.js'
import { MessageService } from './services/message-service.js'
import WebServer from './web-server.js'

class WhatsAppBot {
    constructor() {
        this.sock = null
        this.aiService = new SimpleAIService()
        this.conversationManager = new ConversationManager()
        this.messageService = new MessageService()
        this.webServer = new WebServer()
        this.isReady = false
        
        this.logger = pino({ 
            level: 'warn',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        })
    }

    async initialize() {
        try {
            console.log('🤖 Inicializando WhatsApp AI Bot...')
            
            // Iniciar servidor web
            await this.webServer.start()
            
            // Configurar callback para envío de mensajes desde la web
            this.webServer.setSendMessageCallback(async (phoneNumber, message) => {
                return await this.sendMessageToNumber(phoneNumber, message)
            })
            
            const { state, saveCreds } = await useMultiFileAuthState('auth_info')
            const { version, isLatest } = await fetchLatestBaileysVersion()
            
            console.log(`📱 Usando WhatsApp v${version.join('.')}, es la última: ${isLatest}`)
            this.webServer.addLog('info', `📱 Usando WhatsApp v${version.join('.')}, es la última: ${isLatest}`)

            this.sock = makeWASocket({
                version,
                logger: this.logger,
                printQRInTerminal: false,
                auth: state,
                generateHighQualityLinkPreview: true,
            })

            this.setupEventHandlers(saveCreds)
            
        } catch (error) {
            console.error('❌ Error al inicializar el bot:', error)
            this.webServer?.addLog('error', `❌ Error al inicializar el bot: ${error.message}`)
            process.exit(1)
        }
    }

    setupEventHandlers(saveCreds) {
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update
            
            if (qr) {
                console.log('📲 Escanea el código QR con tu WhatsApp:')
                console.log('🌐 También disponible en: http://localhost:3000')
                qrcode.generate(qr, { small: true })
                
                // Actualizar QR en el servidor web
                this.webServer.updateQR(qr)
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('🔌 Conexión cerrada debido a:', lastDisconnect?.error, 'Reconectando...', shouldReconnect)
                this.webServer.addLog('error', `🔌 Conexión cerrada: ${lastDisconnect?.error?.message || 'Desconocido'}`)
                this.webServer.setConnected(false)
                
                if (shouldReconnect) {
                    await this.initialize()
                }
            } else if (connection === 'open') {
                console.log('✅ Bot conectado exitosamente a WhatsApp!')
                this.webServer.addLog('success', '✅ Bot conectado exitosamente a WhatsApp!')
                this.webServer.setConnected(true)
                this.isReady = true
                await this.onReady()
            }
        })

        this.sock.ev.on('creds.update', saveCreds)
        
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.isReady) return
            
            const messages = m.messages || []
            
            for (const msg of messages) {
                if (!msg.message) continue
                if (msg.key.fromMe) continue
                if (isJidBroadcast(msg.key.remoteJid)) continue
                
                await this.handleIncomingMessage(msg)
            }
        })
    }

    async onReady() {
        console.log('🎉 Bot listo para recibir mensajes!')
        console.log('📋 Comandos disponibles:')
        console.log('  - /broadcast <mensaje> - Enviar mensaje a todos los contactos')
        console.log('  - /status - Ver estado del bot')
        console.log('  - /contacts - Ver contactos activos')
    }

    async handleIncomingMessage(msg) {
        try {
            const messageText = this.messageService.extractMessageText(msg)
            if (!messageText) return

            const senderJid = msg.key.remoteJid
            const senderName = msg.pushName || 'Usuario'
            const isGroup = isJidGroup(senderJid)
            
            console.log(`💬 Mensaje ${isGroup ? 'grupal' : 'privado'} de ${senderName}: ${messageText}`)
            
            // Actualizar estadísticas
            this.webServer.incrementMessage()
            this.webServer.addLog('info', `💬 Mensaje de ${senderName}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`)

            if (messageText.startsWith('/')) {
                await this.handleCommand(messageText, senderJid, senderName)
                return
            }

            if (!isGroup) {
                await this.handlePrivateMessage(messageText, senderJid, senderName)
            }
            
        } catch (error) {
            console.error('❌ Error al procesar mensaje:', error)
            this.webServer.addLog('error', `❌ Error al procesar mensaje: ${error.message}`)
        }
    }

    async handleCommand(command, senderJid, senderName) {
        const [cmd, ...args] = command.split(' ')
        
        switch (cmd) {
            case '/status':
                await this.sock.sendMessage(senderJid, { 
                    text: `🤖 Bot Status:\n✅ Activo\n👥 Conversaciones: ${this.conversationManager.getActiveConversationsCount()}\n🕒 Uptime: ${process.uptime().toFixed(0)}s` 
                })
                break
                
            case '/broadcast':
                if (args.length === 0) {
                    await this.sock.sendMessage(senderJid, { text: '❌ Uso: /broadcast <mensaje>' })
                    return
                }
                
                const broadcastMessage = args.join(' ')
                const contactCount = await this.broadcastMessage(broadcastMessage, senderJid)
                await this.sock.sendMessage(senderJid, { 
                    text: `📢 Mensaje enviado a ${contactCount} contactos` 
                })
                break
                
            case '/contacts':
                const activeContacts = this.conversationManager.getActiveConversationsCount()
                await this.sock.sendMessage(senderJid, { 
                    text: `👥 Conversaciones activas: ${activeContacts}` 
                })
                break
                
            default:
                await this.sock.sendMessage(senderJid, { 
                    text: '❓ Comando no reconocido. Usa /status, /broadcast o /contacts' 
                })
        }
    }

    async handlePrivateMessage(messageText, senderJid, senderName) {
        try {
            console.log(`🤔 Procesando mensaje de ${senderName}...`)
            
            this.conversationManager.addMessage(senderJid, 'user', messageText, senderName)
            
            // Actualizar conteo de conversaciones
            const activeConversations = this.conversationManager.getActiveConversationCount()
            this.webServer.updateConversations(activeConversations)
            
            const conversationHistory = this.conversationManager.getConversation(senderJid)
            const aiResponse = await this.aiService.generateResponse(messageText, conversationHistory, senderName)
            
            if (aiResponse) {
                await this.sock.sendMessage(senderJid, { text: aiResponse })
                this.conversationManager.addMessage(senderJid, 'assistant', aiResponse, 'Bot')
                console.log(`🤖 Respuesta enviada a ${senderName}`)
                this.webServer.addLog('success', `🤖 Respuesta enviada a ${senderName}`)
            }
            
        } catch (error) {
            console.error('❌ Error al generar respuesta AI:', error)
            await this.sock.sendMessage(senderJid, { 
                text: '🔧 Lo siento, tengo problemas técnicos. Intenta de nuevo más tarde.' 
            })
        }
    }

    async broadcastMessage(message, excludeJid = null) {
        try {
            const contacts = await this.sock.onWhatsApp(...Object.keys(this.conversationManager.conversations))
            let sentCount = 0
            
            for (const contact of contacts) {
                if (contact.jid === excludeJid) continue
                if (isJidGroup(contact.jid)) continue
                
                try {
                    await this.sock.sendMessage(contact.jid, { text: message })
                    sentCount++
                    await new Promise(resolve => setTimeout(resolve, 1000))
                } catch (error) {
                    console.error(`❌ Error enviando a ${contact.jid}:`, error)
                }
            }
            
            return sentCount
        } catch (error) {
            console.error('❌ Error en broadcast:', error)
            return 0
        }
    }

    async sendMessage(jid, message) {
        if (!this.isReady) {
            throw new Error('Bot no está listo')
        }
        
        try {
            await this.sock.sendMessage(jid, { text: message })
            console.log(`📤 Mensaje enviado a ${jid}`)
            return true
        } catch (error) {
            console.error(`❌ Error enviando mensaje a ${jid}:`, error)
            return false
        }
    }
    
    async sendMessageToNumber(phoneNumber, message) {
        if (!this.isReady || !this.sock) {
            console.error('❌ Bot no está listo para enviar mensajes')
            return false
        }
        
        try {
            // Convertir número de teléfono a JID de WhatsApp
            let cleanNumber = phoneNumber.replace(/\D/g, '')
            
            // Remover el '+' si está presente
            if (phoneNumber.startsWith('+')) {
                cleanNumber = phoneNumber.substring(1).replace(/\D/g, '')
            }
            
            const jid = cleanNumber + '@s.whatsapp.net'
            
            await this.sock.sendMessage(jid, { text: message })
            console.log(`📤 Mensaje de prueba enviado a ${phoneNumber} (${jid})`)
            this.webServer.incrementMessage()
            return true
            
        } catch (error) {
            console.error(`❌ Error enviando mensaje a ${phoneNumber}:`, error)
            return false
        }
    }
}

const bot = new WhatsAppBot()
bot.initialize().catch(console.error)

process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando bot...')
    bot.webServer?.stop()
    process.exit(0)
})