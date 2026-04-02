# Control de Portafolio en Wix

## Objetivo

Mantener en Wix el mismo control que tenias en Utilidades Pro para:
- Subir flyers sin limite por servicio (donde aplique).
- Separar Paquetes Todo Incluido por categoria nacional/internacional.
- Controlar orden visual.
- Elegir exactamente que imagen aparece en cada servicio.

## Como funciona internamente en tu web

La web de socios usa dos fuentes:
1. `portfolio-service-content-v2` (en kv): define titulo, subtitulo y lista de flyers por servicio.
2. `media` (en DamMedia): resuelve la imagen real de cada flyer por clave.

Cada flyer del portafolio se muestra si existen ambas cosas:
1. Entrada en `portfolio-service-content-v2` con `flyers[].id`.
2. Entrada en DamMedia con key:
`portfolio-service-flyer-<serviceId>-<flyerId>`

## IDs de servicios (usar exactamente estos)

- boletos-aereos
- hospedajes
- transporte-terrestre
- cruceros
- tarjeta-asistencia
- renta-autos
- pasadias
- tours-excursiones
- paquetes-armados
- paquetes-por-armar
- paquetes-todo-incluido
- paquetes-ultimo-minuto
- asesoria-visado
- fechas-especiales
- beneficios-gourmet

## Regla de limite por servicio

Servicios con 1 flyer maximo:
- boletos-aereos
- paquetes-armados
- paquetes-ultimo-minuto
- beneficios-gourmet

Servicios sin limite aparente:
- hospedajes
- transporte-terrestre
- cruceros
- tarjeta-asistencia
- renta-autos
- pasadias
- tours-excursiones
- paquetes-por-armar
- paquetes-todo-incluido
- asesoria-visado
- fechas-especiales

## Plantilla JSON para DamKv

Key: `portfolio-service-content-v2`

Value (ejemplo base):

{
  "paquetes-todo-incluido": {
    "title": "Paquetes Todo Incluido",
    "subtitle": "Seccion separada por categoria nacional e internacional.",
    "flyers": [
      { "id": "pti-nac-01", "category": "nacional" },
      { "id": "pti-nac-02", "category": "nacional" },
      { "id": "pti-int-01", "category": "internacional" },
      { "id": "pti-int-02", "category": "internacional" }
    ]
  },
  "asesoria-visado": {
    "title": "Asesoria en Visado",
    "subtitle": "Documentacion, procesos y acompanamiento.",
    "flyers": [
      { "id": "visado-01" },
      { "id": "visado-02" }
    ]
  },
  "pasadias": {
    "title": "Pasadias",
    "subtitle": "Escapadas y experiencias cortas.",
    "flyers": [
      { "id": "pasadias-01" },
      { "id": "pasadias-02" },
      { "id": "pasadias-03" }
    ]
  },
  "tours-excursiones": {
    "title": "Tours y Excursiones",
    "subtitle": "Actividades y recorridos por destino.",
    "flyers": [
      { "id": "tours-01" },
      { "id": "tours-02" }
    ]
  }
}

## Plantilla de registros en DamMedia para que se vean las imagenes

Por cada flyer del JSON anterior, crea un registro en DamMedia:

1. key: portfolio-service-flyer-paquetes-todo-incluido-pti-nac-01
   publicUrl: URL publica Wix Media
   active: true

2. key: portfolio-service-flyer-paquetes-todo-incluido-pti-nac-02
   publicUrl: URL publica Wix Media
   active: true

3. key: portfolio-service-flyer-paquetes-todo-incluido-pti-int-01
   publicUrl: URL publica Wix Media
   active: true

4. key: portfolio-service-flyer-paquetes-todo-incluido-pti-int-02
   publicUrl: URL publica Wix Media
   active: true

5. key: portfolio-service-flyer-asesoria-visado-visado-01
   publicUrl: URL publica Wix Media
   active: true

6. key: portfolio-service-flyer-pasadias-pasadias-01
   publicUrl: URL publica Wix Media
   active: true

Y asi sucesivamente.

## Control de orden

El orden visual se define por el orden en `flyers` dentro del JSON.
Ejemplo:
- Si quieres que `pti-int-02` aparezca primero en internacional, ponlo de primero en la lista.

## Control de categoria nacional/internacional

Solo aplica al servicio `paquetes-todo-incluido`.
Cada flyer debe llevar:
- category: nacional
- o category: internacional

## Flujo diario recomendado (rapido)

1. Subes imagen al Media Manager de Wix.
2. Copias URL publica.
3. Si es flyer nuevo, agregas id en `portfolio-service-content-v2`.
4. Creas/actualizas registro DamMedia con key exacta.
5. Publicas Wix.
6. En tu panel local, boton Recargar desde Wix.

## Errores comunes y solucion

1. No aparece un flyer:
- Verifica que exista en JSON y en DamMedia con la key exacta.
- Verifica `active = true`.

2. Aparece en servicio equivocado:
- Revisa que `serviceId` en la key DamMedia sea el correcto.

3. No separa nacional/internacional:
- Revisa que `category` sea exactamente `nacional` o `internacional`.

4. Orden incorrecto:
- Reordena la lista `flyers` en el JSON.
