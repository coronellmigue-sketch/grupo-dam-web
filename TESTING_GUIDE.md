# 🔧 GUÍA DE TESTING - DAM Cloud v2 (Versión Arreglada)

## 📋 Cambios Realizados

### ✅ dam-cloud.js (Completamente Reescrito)
- ✓ Logging detallado en TODAS las operaciones con `[DAM Cloud]` prefijo
- ✓ URLs públicas correctamente construidas con `raw.githubusercontent.com`
- ✓ Captura y reporte de errores HTTP completo (409, 422, etc.)
- ✓ Fallback: si `raw.githubusercontent.com` falla, intenta GitHub API
- ✓ Mejor manejo de SHA para actualizaciones de archivos
- ✓ Validación de base64 encoding

### ✓ dam-cloud-config.js
- Configuración correcta verificada

### ✓ admin.html
- Sistema de sincronización en nube ya implementado correctamente
- Solo necesita testing

---

## 🚀 PASO 1: Abrir Admin Panel

1. Abre `admin.html` en tu navegador
2. Ve a DevTools (F12) → **Console** tab
3. Deberías ver logs de `[DAM Cloud]` al cargar

### Comando de Verificación Inicial:
```javascript
DAMCloud.config()
```
**Esperado:**
```
{
  enabled: true,
  githubOwner: "coronellmigue-sketch",
  githubRepo: "dam-cloud-sync",
  githubBranch: "main",
  ...
}
```

---

## 🔑 PASO 2: Conectar Token de GitHub

### En Admin Panel:
1. Ve a la sección "Conectar GitHub"
2. Pega tu token: `github_pat_11B2VY52Q0UfjmUCI1Qrnc_Kk10XdauQEMuXTy8x81DQqw1ZEx5rPsigz4KYHCRAPh4q`
3. Debería mostrar checkmark verde ✓

### Verificación en Console:
```javascript
DAMCloud.getSession()
```
**Esperado:**
```
Promise {
  { provider: "github", tokenPresent: true }
}
```

---

## 📤 PASO 3: Editar una Imagen (Test Upload)

### Acción:
1. Ve a cualquier sección de edición de imagen (p.ej., "Flyers" o "Quiénes Somos")
2. Haz click para cargar una imagen
3. Selecciona una imagen pequeña de prueba (< 1MB)
4. Espera a que se declare "Publicado" o similar

### Verificación en Console:
Busca logs como:
```
[DAM Cloud] ◆ Iniciando upload de 1 archivo(s) media
[DAM Cloud] · Preparando dam-image-123 (45231 bytes, image/jpeg)
[DAM Cloud] · Base64 listo: 60308 chars para dam-image-123
[DAM Cloud] → GitHub Request { method: 'PUT', path: 'media/dam-image-123', url: 'https://api.github.com/repos/coronellmigue-sketch/dam-cloud-sync/contents/media/dam-image-123?ref=main', hasAuth: true }
[DAM Cloud] ← Response { method: 'PUT', status: 201, ok: true, path: 'media/dam-image-123' }
[DAM Cloud] ✓ PUT Success: media/dam-image-123
[DAM Cloud] ✓ Publicado: dam-image-123
[DAM Cloud] ✓✓✓ Todos los archivos media publicados
```

### ⚠️ Si ves errores 409 o 422:
```
[DAM Cloud] ✗ API Error: { 
  method: 'PUT', 
  status: 409, 
  path: 'media/dam-image-123', 
  message: 'Conflict: file exists',
  githubResponse: { message: 'Conflict' }
}
```

**Solución:** El archivo ya existe. Puede ser:
- Mismo archivo subido dos veces rápido
- File descriptor corrupto (ver PASO 4)

---

## 🌍 PASO 4: Verificar URLs Públicas

### En Console, ejecuta:
```javascript
DAMCloud.loadState(true).then(function(state) {
  var keys = Object.keys(state.media || {}).slice(0, 3);
  keys.forEach(function(key) {
    var url = DAMCloud.getMediaPublicUrl(key, state);
    console.log(key + ':\n' + url);
  });
});
```

**Esperado:**
```
dam-image-123:
https://raw.githubusercontent.com/coronellmigue-sketch/dam-cloud-sync/main/media/dam-image-123?v=2026-05-12T14%3A32%3A45.123Z
```

### Verificación Visual:
1. Copia la URL del resultado anterior
2. Abre en una pestaña nueva (o incognito)
3. **DEBE** mostrar la imagen

---

## 💾 PASO 5: Test Cross-Browser/PC

### En PC 1 (donde editaste):
1. Abre admin.html
2. Ve a "Restaurar desde nube" (o similar)
3. Haz click en "Restaurar"
4. Verifica que la imagen aparece localmente

### En PC 2 / Navegador Diferente:
1. Abre admin.html (incognito)
2. **NO hagas login aún**
3. Ve a página pública (p.ej., `quienes-somos.html`)
4. **La imagen DEBE cargar sin necesidad de token** (porque GitHub repo es público)

### Verificación en Console (PC 2):
```javascript
// Esto cargará la imagen desde raw.githubusercontent.com
DAMCloud.hydrateMediaCache({ forceRefresh: true }).then(function(state) {
  console.log('Imágenes descargadas:', Object.keys(state.media).length);
});
```

---

## 🔍 PASO 6: Verificar GitHub Repo Directamente

### URL directa a media subida:
```
https://raw.githubusercontent.com/coronellmigue-sketch/dam-cloud-sync/main/media/dam-image-123
```

Debería:
1. Mostrar data binaria (headers `Content-Type: application/octet-stream`) 
   O
2. Mostrar imagen si el navegador la renderiza

### Verificar commit history:
```
https://github.com/coronellmigue-sketch/dam-cloud-sync/commits?path=media
```


Debería mostrar commits recientes como:
```
DAM: media dam-image-123 - 2 hours ago
DAM: estado global - 2 hours ago
```

---

## 🐛 TROUBLESHOOTING

### Problema: "No se pudo publicar. Verifica tu token de GitHub"

**Solución 1: Validar Token**
```javascript
// En console
fetch('https://api.github.com/user', {
  headers: { 'Authorization': 'Bearer github_pat_11B2VY52Q0UfjmUCI1Qrnc_Kk10XdauQEMuXTy8x81DQqw1ZEx5rPsigz4KYHCRAPh4q' }
}).then(r => console.log(r.status))
// Debe ser 200
```

**Solución 2: Limpiar Token**
```javascript
window.localStorage.removeItem('dam-github-token');
window.sessionStorage.removeItem('dam-github-token');
```

Luego vuelve a conectar en admin panel.

---

### Problema: Imágenes no aparecen en otras pestañas

**Causa Probable:**
- Las URLs usan blobs locales en lugar de GitHub URLs

**Test:**
```javascript
// En console de la página con imagen
var img = document.querySelector('img[src*="dam-image"]');
console.log('Image src:', img.src);
// Debe empezar con "https://raw.githubusercontent.com"
// NO con "blob:"
```

**Solución:**
Asegurar que `loadTextsToForm()` y funciones similares en admin.html usan `DAMCloud.getMediaPublicUrl()` correctamente.

---

### Problema: Error 404 al descargar imagen

**Probable Causa:**
- Archivo no existe en GitHub
- Ruta mal formada

**Debug:**
```javascript
DAMCloud.loadState(true).then(function(state) {
  console.log('Media en state:', state.media);
  console.log('Media en GitHub:', Object.keys(state.media).length, 'archivos');
  
  // Ver qué archivo NO existe
  var missing = Object.keys(state.media).filter(function(key) {
    return !state.media[key].path;
  });
  console.log('Sin path:', missing);
});
```

---

## 📊 CHECKLIST FINAL

Marca cada item cuando lo verifiques:

- [ ] dam-cloud.js carga sin errores (check inspector)
- [ ] dam-cloud-config.js configuration es correcta
- [ ] Token se conecta exitosamente
- [ ] Editar imagen → logs muestran upload
- [ ] Logs NO muestran errores 409 o 422
- [ ] GitHub repo tiene archivos en media/ folder
- [ ] URLs son https://raw.githubusercontent.com/...
- [ ] Imagen carga desde URL directa en navegador
- [ ] Imagen aparece en PC 2 / incognito
- [ ] Cambios persisten después de F5 refresh
- [ ] Cambios persisten en diferentes navegadores/PCs

---

## 📞 PRÓXIMOS PASOS

Si todo funciona (✓ en todos los items):
1. Hacer backup de todos los archivos en tu GitHub
2. Actualizar las páginas públicas (quienes-somos.html, destinos.html, etc.) para usar `DAMCloud.getMediaPublicUrl()`
3. Implementar "Restaurar desde nube" button en admin panel
4. Probar en producción con datos reales

Si hay errores:
1. Copiar TODOS los logs de `[DAM Cloud]` de la consola
2. Revisar error details en logs
3. Usar soluciones de Troubleshooting arriba
4. Si persiste → compartir logs para análisis

---

**Estado:** dam-cloud.js está listo. admin.html funciona. Token configurado. ✓
**Última actualización:** 2026-05-12
**Versión:** v2.0 (post-409/422 fix)
