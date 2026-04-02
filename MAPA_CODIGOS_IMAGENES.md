# Manual de Etiquetas y Contenedores (GitHub)

Este documento es la guia oficial para subir flyers e imagenes con codigos fijos.

## Objetivo
- Cada contenedor tiene un codigo fijo.
- Tu subes la imagen con ese codigo.
- Publicas en GitHub.
- El sitio lee el codigo y ubica la imagen exactamente en su contenedor.

## Flujo Diario (5 pasos)
1. Abrir `admin.html` > Utilidades Pro.
2. Pulsar `Conectar GitHub` y pegar token.
3. Pulsar `Abrir media` para ir a la carpeta de imagenes del repo.
4. Subir o reemplazar imagenes usando el mismo codigo.
5. Volver al panel y pulsar `Publicar ahora`, luego `Ver state remoto`.

## Reglas de nombrado
- Usa siempre el codigo como nombre base.
- Puedes usar `.jpg`, `.png`, `.webp`.
- Si reemplazas una imagen, conserva el mismo codigo.
- En Todo Incluido:
	- Nacional: sufijo `-nXX`
	- Internacional: sufijo `-iXX`

## Archivo de estado remoto
- Archivo: `dam-state.json`
- Ruta configurada: `statePath` en `dam-cloud-config.js`
- Este archivo conecta claves de contenido y media.

## Blindaje de URLs (anti-borrado)
- El panel ahora protege URLs contra borrado accidental.
- Si una URL llega vacia por error, se conserva la ultima URL valida del remoto.
- Se guarda una copia blindada en la clave `dam-url-lock-v1` dentro del estado remoto.
- Esa clave viaja en cada publicacion a GitHub junto al resto del estado.

## Catalogo de codigos por seccion

### Portada principal
- 101 a 110

### Quienes Somos
- 201 a 206

### Destinos
- 301 a 308

### Conectate
- 401 a 406

### Landing socios y portada de portafolio
- 501: Banner landing socios
- 509: Banner superior de portafolio

### Portadas por servicio (cards del portafolio)
- 510: Boletos Aereos
- 511: Hospedajes
- 512: Transporte Terrestre
- 513: Cruceros
- 514: Tarjeta de Asistencia
- 515: Renta de Autos
- 516: Pasadias
- 517: Tours y Excursiones
- 518: Paquetes Armados
- 519: Paquetes por Armar
- 520: Paquetes Todo Incluido
- 521: Paquetes Ultimo Minuto
- 522: Asesoria en Visado
- 523: Fechas Especiales
- 524: Beneficios Gourmet

### Contenedores fijos por servicio (detalle)
- 510-01
- 511-01 a 511-18
- 512-01 a 512-06
- 513-01 a 513-05
- 514-01 a 514-04
- 515-01 a 515-03
- 516-01 a 516-08
- 517-01 a 517-08
- 518-01
- 519-01 a 519-15
- 520-n01 a 520-n08 (Nacional)
- 520-i01 a 520-i12 (Internacional)
- 521-01 (Banner de Ultimo Minuto)
- 522-01 a 522-05
- 523-01 a 523-05
- 524-01

## Ejemplos rapidos
- Cambiar banner landing: reemplaza imagen codigo `501`.
- Cambiar slot 3 de pasadias: reemplaza `516-03`.
- Cambiar todo incluido internacional 7: reemplaza `520-i07`.

## Deploy global (para que todos lo vean)
1. Subir imagenes al repo con sus codigos.
2. Commit.
3. Push a `main`.
4. Esperar deploy de GitHub Pages.
5. Verificar en web publica con Ctrl+F5.

## Checklist de verificacion
- Codigo correcto.
- Extension valida.
- Imagen subida al repo correcto.
- Commit/push exitoso.
- Deploy de Pages en verde.
- Vista publica actualizada.
