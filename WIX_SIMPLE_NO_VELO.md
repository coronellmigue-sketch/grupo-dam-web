# Wix Simple (Sin Velo)

Si en tu editor no aparece Dev Mode/Velo, usa esta ruta.

## Idea

No usar backend en Wix.
Solo usar un archivo JSON publico en Wix Media.
Tu web lo lee desde `wixStateUrl`.

## Pasos

1. Sube tus imagenes a Wix Media Manager.
2. Copia sus URLs publicas.
3. Abre `dam-state.wix.json` en este proyecto y reemplaza URLs.
4. Sube ese JSON tambien a Wix Media Manager.
5. Copia la URL publica del JSON subido.
6. En `dam-cloud-config.js` pon:
   - `enabled: true`
   - `provider: 'wix'`
   - `wixStateUrl: 'URL_PUBLICA_DEL_JSON_EN_WIX'`
   - `wixManagerUrl: 'URL_DE_TU_DASHBOARD_WIX'`
7. Publica tu web.
8. En `admin.html` pulsa `Recargar desde Wix`.

## Como actualizar contenido despues

Cada vez que quieras cambios globales:
1. Editas `dam-state.wix.json`.
2. Lo vuelves a subir a Wix Media (mismo nombre).
3. Copias la nueva URL publica si cambia.
4. Recargas la web.

## Ventaja

- Cero backend
- Cero Velo
- Cero deploy complejo

## Limitacion

- La edicion de estado se hace en el archivo JSON, no en CMS visual.
- Pero es la forma mas simple y confiable sin Velo.
