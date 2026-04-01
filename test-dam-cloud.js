#!/usr/bin/env node

// TESTING SCRIPT - Ejecutar en la consola de DevTools del admin.html

console.clear();
console.log('%c=== DAM CLOUD SYSTEM TEST ===', 'color: #00ff00; font-size: 16px; font-weight: bold');

// 1. Verificar Configuración
console.log('\n%c1. CONFIGURACIÓN', 'color: #ffff00; font-weight: bold');
var config = DAMCloud.config();
console.log('Enabled:', config.enabled);
console.log('GitHub Owner:', config.githubOwner);
console.log('GitHub Repo:', config.githubRepo);
console.log('GitHub Branch:', config.githubBranch);
console.log('State Path:', config.statePath);
console.log('Media Prefix:', config.mediaPrefix);

// 2. Verificar Token
console.log('\n%c2. AUTENTICACIÓN', 'color: #ffff00; font-weight: bold');
DAMCloud.getSession().then(function(session) {
    if (session) {
        console.log('%c✓ Token almacenado y válido', 'color: #00ff00');
    } else {
        console.log('%c✗ No hay token. Conectar con GitHub...', 'color: #ff6600');
    }
}).catch(function(error) {
    console.error('Error:', error);
});

// 3. Verificar Estado Remoto
console.log('\n%c3. ESTADO REMOTO', 'color: #ffff00; font-weight: bold');
DAMCloud.loadState().then(function(state) {
    console.log('Versión:', state.version);
    console.log('Actualizado:', state.updatedAt);
    console.log('Keys en kv:', Object.keys(state.kv || {}).length);
    console.log('Archivos media:', Object.keys(state.media || {}).length);
    
    // Muestra las primeras 5 media entries
    var mediaKeys = Object.keys(state.media || {}).slice(0, 5);
    mediaKeys.forEach(function(key) {
        var record = state.media[key];
        var url = DAMCloud.getMediaPublicUrl(key, state);
        console.log('  - ' + key + ':', {
            path: record.path,
            size: record.size + ' bytes',
            url: url
        });
    });
}).catch(function(error) {
    console.error('Error cargando estado:', error);
});

// 4. Verificar Media Local
console.log('\n%c4. MEDIA LOCAL (IndexedDB)', 'color: #ffff00; font-weight: bold');
DAMCloud.listMediaDbEntries().then(function(entries) {
    console.log('Total archivos en IndexedDB:', entries.length);
    entries.slice(0, 5).forEach(function(entry) {
        console.log('  - ' + entry.key + ':', {
            type: entry.value.type,
            size: entry.value.size + ' bytes'
        });
    });
}).catch(function(error) {
    console.error('Error:', error);
});

// 5. Test URL Construction
console.log('\n%c5. CONSTRUCCIÓN DE URLs', 'color: #ffff00; font-weight: bold');
console.log('Raw Base:', DAMCloud.config().visible === undefined ? 'https://raw.githubusercontent.com/coronellmigue-sketch/dam-cloud-sync/main' : 'Custom');
var testKey = 'test-image';
var testUrl = DAMCloud.getMediaPublicUrl(testKey);
console.log('URL Ejemplo (' + testKey + '):', testUrl);

console.log('%c=== FIN DEL TEST ===', 'color: #00ff00; font-size: 16px; font-weight: bold');

// REFERENCIA DE COMANDOS
console.log('\n%cCOMANDOS DISPONIBLES:', 'color: #00ccff; font-weight: bold');
console.log(`
// Ver configuración
DAMCloud.config()

// Cargar estado remoto
DAMCloud.loadState(true)  // force refresh

// Listar media local
DAMCloud.listMediaDbEntries()

// Verificar sesión
DAMCloud.getSession()

// Conectar GitHub
DAMCloud.signIn('tu_token_aqui')

// Ver URL pública de una media
DAMCloud.getMediaPublicUrl('dam-image-123')

// Forzar descarga desde GitHub
DAMCloud.hydrateMediaCache({ forceRefresh: true })

// Subir cambios a GitHub
// (Usar botón "Publicar cambios" en admin panel)
`);
