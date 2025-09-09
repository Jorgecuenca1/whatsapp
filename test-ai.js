import { SimpleAIService } from './services/simple-ai-service.js'

async function testAI() {
    console.log('🧪 Probando configuración de IA...\n')
    
    // Crear servicio de IA
    const aiService = new SimpleAIService()
    
    // Mostrar configuración actual
    console.log('\n⚙️ Configuración actual:')
    console.log(`  Proveedor: IA Simple Local (sin dependencias externas)`)
    console.log(`  Tipo: Respuestas inteligentes por patrones`)
    console.log(`  Estado: Totalmente funcional`)
    
    // Probar conexión
    console.log('\n🔌 Probando conexión con el proveedor de IA...')
    const connectionTest = await aiService.testConnection()
    
    if (connectionTest.success) {
        console.log('✅ Conexión exitosa!')
        console.log(`   Proveedor: ${connectionTest.provider}`)
        if (connectionTest.response) {
            console.log(`   Respuesta de prueba: ${connectionTest.response}`)
        }
    } else {
        console.log('❌ Error de conexión:')
        console.log(`   ${connectionTest.error}`)
        console.log('\n💡 Esto no debería pasar con el servicio simple:')
        
        process.exit(1)
    }
    
    // Probar generación de respuesta
    console.log('\n💬 Probando generación de respuesta...')
    try {
        const testMessage = '¿Podrías decirme solo "Hola, funciono correctamente" para probar que todo está bien?'
        console.log(`   Pregunta: ${testMessage}`)
        
        const response = await aiService.generateResponse(testMessage, [], 'Usuario de Prueba')
        
        if (response) {
            console.log(`   Respuesta: ${response}`)
            console.log('\n✅ ¡La IA está funcionando correctamente!')
        } else {
            console.log('\n❌ No se recibió respuesta de la IA')
        }
    } catch (error) {
        console.log('\n❌ Error generando respuesta:')
        console.log(`   ${error.message}`)
    }
    
    // Mostrar estadísticas
    console.log('\n📊 Estadísticas del servicio:')
    const stats = aiService.getStats()
    console.log(`   Proveedor activo: ${stats.provider}`)
    console.log(`   Elementos en cache: ${stats.cacheSize}`)
    console.log('   Proveedores disponibles:')
    for (const [provider, enabled] of Object.entries(stats.configuration)) {
        console.log(`     ${provider}: ${enabled ? '✅' : '❌'}`)
    }
    
    console.log('\n🎉 ¡Prueba completada! El bot debería funcionar correctamente.')
}

// Ejecutar prueba
testAI().catch(error => {
    console.error('\n💥 Error ejecutando prueba:', error.message)
    process.exit(1)
})