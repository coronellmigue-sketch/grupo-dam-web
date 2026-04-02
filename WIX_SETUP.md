# Wix Setup

## Objetivo

Wix sera el origen real del contenido.
Tu web actual seguira publicada donde esta, pero leera un estado publico desde Wix.

El flujo final sera:
1. Editas contenido y multimedia en Wix.
2. Wix expone un endpoint JSON publico.
3. Tu web carga ese JSON al abrir.
4. Cualquier visitante ve los cambios al recargar.

## Lo que ya quedo preparado en el codigo

- `dam-cloud.js` ahora soporta proveedor `wix`.
- `admin.html` queda orientado a `Abrir Wix` y `Recargar desde Wix`.
- Las paginas publicas pueden hidratar `localStorage` y media desde un endpoint Wix.
- `dam-cloud-config.js` queda listo para que solo pongas tus URLs reales.

## Paso 1. Activar Velo y CMS en Wix

1. Abre tu sitio en Wix.
2. Activa `Dev Mode` o `Velo`.
3. Activa `CMS / Content Manager`.

## Paso 2. Crear las colecciones

### Coleccion 1: `DamKv`
Campos:
- `key` : Text
- `value` : Rich Text o Long Text

Uso:
- Aqui guardas valores que hoy viven en `localStorage`.
- Guarda el valor exactamente como texto.
- Si el valor es JSON, pegalos como JSON string valido.

### Coleccion 2: `DamMedia`
Campos:
- `key` : Text
- `publicUrl` : URL
- `active` : Boolean
- `updatedAt` : Date and Time
- `contentType` : Text
- `size` : Number

Uso:
- Sube la imagen o video a Wix Media Manager.
- Copia su URL publica.
- Pegala en `publicUrl`.
- Pon `active = true`.

## Paso 3. Crear el endpoint HTTP en Wix

1. En Wix crea el archivo `backend/http-functions.js`.
2. Copia y pega el contenido del archivo `wix-http-functions.js` de este repo.
3. Publica el sitio en Wix.

El endpoint quedara asi:

`https://TU-DOMINIO-WIX/_functions/damState`

## Paso 4. Que registros crear en `DamKv`

Crea estos `key` primero:

- `dam-site-texts`
- `dam-hero-slider-images`
- `dam-carousel-slide-1`
- `dam-carousel-slide-2`
- `dam-carousel-slide-3`
- `dam-carousel-slide-4`
- `dam-carousel-slide-5`
- `dam-carousel-slide-6`
- `landing-texts`
- `portfolio-texts`
- `portfolio-service-content-v2`
- `portfolio-last-minute-packages-v1`

### Ejemplos de valores

#### `dam-site-texts`
```json
{"about":"Texto de quienes somos","recommended":"Texto recomendado","news":"Texto novedades"}
```

#### `dam-hero-slider-images`
```json
["https://static.wixstatic.com/media/uno.jpg","https://static.wixstatic.com/media/dos.jpg"]
```

#### `dam-carousel-slide-1`
```json
{"image":"https://static.wixstatic.com/media/slide1.jpg","title":"Titulo 1","desc":"Descripcion 1"}
```

#### `landing-texts`
```json
{"title":"Beneficios exclusivos para ti","text":"Texto de landing","buttonText":"Continuar al portafolio"}
```

## Paso 5. Que registros crear en `DamMedia`

Crea estos `key` de media.

### Quienes Somos
- `who-series-img-201`
- `who-series-img-202`
- `who-series-img-203`
- `who-series-img-204`
- `who-series-img-205`
- `who-series-img-206`

### Destinos
- `dest-series-301`
- `dest-series-302`
- `dest-series-303`
- `dest-series-304`
- `dest-series-305`
- `dest-series-306`
- `dest-series-307`
- `dest-series-308`

### Conectate
- `connect-series-401`
- `connect-series-402`
- `connect-series-403`
- `connect-series-404`
- `connect-series-405`
- `connect-series-406`

### Landing / Socios
- `landing-series-501`
- `portfolio-banner-509`

### Portafolio de servicios
- `portfolio-series-510`
- `portfolio-series-511`
- `portfolio-series-512`
- `portfolio-series-513`
- `portfolio-series-514`
- `portfolio-series-515`
- `portfolio-series-516`
- `portfolio-series-517`
- `portfolio-series-518`
- `portfolio-series-519`
- `portfolio-series-520`
- `portfolio-series-521`
- `portfolio-series-522`
- `portfolio-series-523`
- `portfolio-series-524`

### Flyers legacy
- `flyer-img-101`
- `flyer-img-102`
- `flyer-img-103`
- `flyer-img-104`
- `flyer-img-105`
- `flyer-img-106`
- `flyer-img-107`
- `flyer-img-108`
- `flyer-img-109`
- `flyer-img-110`

## Paso 6. Configurar la web actual

Edita `dam-cloud-config.js` y reemplaza:

- `enabled: true`
- `wixStateUrl: "https://TU-DOMINIO-WIX/_functions/damState"`
- `wixManagerUrl: "https://manage.wix.com/dashboard/..."`

Si no sabes el `wixManagerUrl`, puedes dejarlo vacio y simplemente editar en Wix manualmente.

## Paso 7. Como administrarlo en el dia a dia

1. Entras a Wix.
2. Subes imagenes a Media Manager.
3. Pegas la URL publica en `DamMedia`.
4. Editas textos y JSON ligeros en `DamKv`.
5. Publicas el sitio Wix.
6. Tu web externa mostrara los cambios al recargar.

## Recomendacion practica

Empieza por estas piezas primero:
1. `DamMedia` de Quienes Somos
2. `dam-hero-slider-images`
3. `dam-carousel-slide-1` a `dam-carousel-slide-3`
4. `dam-site-texts`

Con eso validas el flujo completo sin cargar toda la operacion de una vez.

## Nota importante

Con esta ruta, Wix es el panel real de contenido.
Tu `admin.html` queda util para revisar y recargar, pero la publicacion final se hace desde Wix.
