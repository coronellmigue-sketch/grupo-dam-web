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
- 201: Hero principal (video/imagen de apertura)
- 202: Bloque Equipo DAM
- 203: Bloque Mision
- 204: Bloque Vision
- 205: Fondo de la seccion Pilares
- 206: Bloque Familia Viajera

### Destinos
- 301: Hero superior (video o imagen)
- 302 a 306: Tarjetas principales de destinos
- 307: Banner de contacto de la seccion
- 308: Tarjeta adicional de destino

### Conectate
- 401: Hero principal
- 402 a 404: Pantallas de celular (3 contenedores)
- 405: Tarjeta de chat
- 406: Banner de contacto

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
- 511-01 a 511-14
- 512-01 a 512-03
- 513-01 a 513-05
- 514-01 a 514-04
- 515-01 a 515-03
- 516-01 a 516-08
- 517-01 a 517-12
- 518-01
- 519-01 a 519-15
- 520-n01 a 520-n10 (Nacional)
- 520-i01 a 520-i10 (Internacional)
- 521-01 (Banner de Ultimo Minuto)
- 522-01 a 522-02
- 523-01 a 523-05
- 524-01

## Mapa simple de operacion (definitivo)

Usa esta tabla para no confundirte. Cada fila es un servicio y su cantidad exacta de flyers.

- Boletos Aereos: 1 contenedor -> `510-01`
- Hospedajes: 14 contenedores -> `511-01` a `511-14`
- Transporte Terrestre: 3 contenedores -> `512-01` a `512-03`
- Cruceros: 5 contenedores -> `513-01` a `513-05`
- Tarjeta de Asistencia: 4 contenedores -> `514-01` a `514-04`
- Renta de Autos: 3 contenedores -> `515-01` a `515-03`
- Pasadias: 8 contenedores -> `516-01` a `516-08`
- Tours y Excursiones: 12 contenedores -> `517-01` a `517-12`
- Paquetes Armados: 1 contenedor -> `518-01`
- Paquetes por Armar: 15 contenedores -> `519-01` a `519-15`
- Todo Incluido Nacional: 10 contenedores -> `520-n01` a `520-n10`
- Todo Incluido Internacional: 10 contenedores -> `520-i01` a `520-i10`
- Ultimo Minuto: 1 contenedor -> `521-01`
- Asesoria en Visado: 2 contenedores -> `522-01` a `522-02`
- Fechas Especiales: 5 contenedores -> `523-01` a `523-05`
- Beneficios Gourmet: 1 contenedor -> `524-01`

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
