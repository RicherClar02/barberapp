# Prompt Figma Make v2 — BarberApp

> **Por qué v2:** en la v1 Figma ignoró la dirección visual y devolvió la paleta marrón
> que ya teníamos (#4A2C0A, #8B5E3C, #C49A6C), Poppins+Inter, emojis como iconos y hex
> hardcodeados en lugar de tokens. La v2 le entrega el archivo de tokens ya escrito para
> que no pueda inventarse la paleta.

## Reglas de uso

1. **Chat nuevo.** No continúes el proyecto anterior: arrastra el contexto marrón.
2. **Una pasada por rol.** Prompt A (barbero) y Prompt B (cliente) en proyectos separados.
3. Si en la primera respuesta ves un marrón o un emoji, corta y responde:
   *"Rehaz esto: usaste marrón y emojis, ambos están prohibidos en el brief. Reescribe
   theme.css con el bloque que te di y usa solo iconos Lucide."*

---

## PROMPT A — App del barbero

```
Diseña 4 pantallas de una app móvil para barberos, en español, 393×852.

═══════════════════════════════════════════════════════════
PARTE 1 — SISTEMA DE DISEÑO. NO NEGOCIABLE.
═══════════════════════════════════════════════════════════

Escribe EXACTAMENTE este contenido en src/styles/theme.css. No cambies ni un
valor. No agregues colores nuevos. No uses oklch.

:root {
  --bg:            #0E0E11;
  --surface:       #17171B;
  --surface-2:     #1F1F24;
  --border:        rgba(255,255,255,0.07);
  --border-strong: rgba(255,255,255,0.14);

  --text:    #FAFAF7;
  --text-2:  #A0A0A8;
  --text-3:  #6B6B74;

  --brass:       #E0A33E;
  --brass-press: #C98F32;
  --on-brass:    #17120A;

  --success: #4ADE80;
  --warn:    #FBBF24;
  --danger:  #F87171;

  --radius:      14px;
  --radius-full: 999px;
}

PROHIBIDO — si aparece cualquiera de estos, el diseño está mal:
- Los colores #4A2C0A, #8B5E3C, #C49A6C, #F5EFE6, #E8E0D8 o cualquier marrón,
  beige, crema o café. La app es OSCURA. Fondo carbón, no crema.
- Las fuentes Poppins e Inter.
- Emojis de cualquier tipo: ✂️ 💰 ⏰ ☀️ 🌙 ✨ 📍 ♛ y todos los demás. Cero.
  Los iconos son SIEMPRE lucide-react, stroke 1.5, tamaño 20 o 24.
- Colores hexadecimales escritos dentro de los componentes. Nada de
  className="bg-[#4A2C0A]". Todo consume las variables vía clases Tailwind:
  bg-bg, bg-surface, text-text, text-text-2, bg-brass, text-brass, border-border.
- Sombras (shadow-*, box-shadow). La jerarquía se hace SOLO con la luminosidad
  de la superficie y bordes de 1px.
- Radios distintos de 14px o 999px. Solo esos dos en toda la app.
- Gradientes de dos colores en botones o fondos.

TIPOGRAFÍA:
- Títulos: Bricolage Grotesque, peso 700-800, letter-spacing -0.03em.
- Cuerpo: Geist, pesos 400 y 500.
- Cárgalas desde Google Fonts en src/styles/fonts.css.
- Escala exacta, sin valores intermedios: 48 / 34 / 26 / 20 / 16 / 14 / 12.
- Precios y horas: font-variant-numeric: tabular-nums, peso 700.
- Nunca pongas dos tamaños consecutivos de la escala juntos. Si un título es 34,
  el texto de al lado es 16 o 14, nunca 26.

USO DEL LATÓN (--brass):
Máximo 2 elementos por pantalla. Solo en: el botón de acción principal, la cifra
de dinero destacada, y el item activo de la barra inferior. Todo lo demás es
blanco, gris o el color semántico que corresponda. Si más de dos cosas brillan,
ninguna destaca.

ESPACIADO: grid de 4pt. Margen lateral 20px. Separación entre secciones 32px.

═══════════════════════════════════════════════════════════
PARTE 2 — PANTALLAS
═══════════════════════════════════════════════════════════

Solo estas 4. No generes librería de componentes completa (nada de volcar los 57
componentes de shadcn). Crea únicamente los componentes que estas pantallas usan.

1. AGENDA DEL DÍA
   Header: fecha en display 34px, nombre del barbero en 14px --text-2.
   Fila de 3 métricas: cortes del día, ganado hoy, próxima cita. Sin icono
   decorativo: el número manda, con etiqueta de 12px debajo.
   Timeline vertical: línea de 1px con nodos por cita. Cada cita muestra avatar,
   nombre, servicio, precio y rango horario.
   La cita EN CURSO se distingue con borde --brass y expande sus acciones:
   WhatsApp, Completar, No-show. Las demás citas no muestran acciones.
   Marcador de hora actual: línea horizontal --danger cruzando el timeline,
   posicionada según la hora, con la hora en la etiqueta.
   Huecos libres entre citas: texto tenue "Libre 10:40 – 11:20" en --text-3.

2. CALENDARIO MENSUAL
   Cuadrícula de días. Cada día con cita lleva un punto debajo del número cuyo
   color indica la carga: --success 1-2, --warn 3-5, --brass 6-8, --danger 9+.
   Día seleccionado: círculo --brass con texto --on-brass.
   Día sin horario configurado: número tachado al 40% de opacidad.
   Debajo de la cuadrícula, lista de las citas del día seleccionado.

3. GANANCIAS
   Selector de periodo: Hoy / Semana / Mes como chips de radio 999px.
   Cifra principal en 48px --brass, con la comisión configurada debajo en 14px.
   Gráfico de barras por hora, barras en --brass, sin ejes ni grid visibles
   salvo las etiquetas de hora en 12px --text-3.
   Detalle de cortes: filas con hora, cliente, servicio, precio total y tu parte.
   El precio total en --text-2 y tu parte en --text con peso 700, para que se lea
   cuál es cuál.
   Sección "Cerca del corte gratis": clientes con barra de progreso hacia 10
   cortes, la barra en --brass sobre --surface-2.

4. MI TARJETA
   Carnet digital del barbero, formato vertical, fondo --surface-2 con borde
   --border-strong. Foto, nombre en 26px, especialidad en --brass 14px, rating
   con estrellas, barbería a la que pertenece, y 3 métricas en fila.
   Debajo del carnet: últimas 3 reseñas.
   Abajo, botón de compartir. IMPORTANTE: debe ser visible sobre fondo oscuro —
   borde --border-strong y texto --text, nunca borde blanco sobre blanco.

5. BARRA INFERIOR fija: Agenda, Calendario, Ganancias, Tarjeta. Icono Lucide de
   20px más etiqueta de 12px. Activo en --brass, inactivo en --text-3.

═══════════════════════════════════════════════════════════
PARTE 3 — ESTADOS
═══════════════════════════════════════════════════════════
Incluye para cada pantalla su estado vacío (sin citas hoy, sin ganancias aún,
sin reseñas) y su skeleton de carga. Son parte del entregable.

Datos de ejemplo en pesos colombianos: precios entre $20.000 y $45.000.
Nombres colombianos.
```

---

## PROMPT B — App del cliente

```
Diseña 6 pantallas de una app móvil de reservas de barbería, en español, 393×852.

[PEGA AQUÍ LA PARTE 1 COMPLETA DEL PROMPT A — el bloque de tokens, la lista de
prohibiciones, la tipografía, el uso del latón y el espaciado. Es idéntica.]

Añade a las reglas de la Parte 1:

FOTOGRAFÍA: la foto de la barbería es el elemento dominante de cada tarjeta, no
un thumbnail. Mínimo el 60% del alto de la tarjeta, con un degradado de --bg
desde abajo hacia transparente arriba, y el texto encima del degradado. Usa fotos
reales de barberías y cortes de pelo, no rectángulos grises.

RITMO: prohibido el patrón de tres tarjetas idénticas en fila. En cada listado,
el primer elemento es grande y a ancho completo, y los siguientes van más
compactos. Densidad alta: no rellenes con padding, llena con contenido.

═══════════════════════════════════════════════════════════
PANTALLAS
═══════════════════════════════════════════════════════════

1. INICIO
   Header con saludo y nombre, ciudad como chip pulsable de 999px, campana con
   contador, avatar. Buscador debajo, sobre --surface.
   Carrusel de anuncios patrocinados con indicadores de página.
   Sección "Destacadas": scroll horizontal de tarjetas verticales con badge de
   plan (Premium / Estándar / Básico) — el badge Premium en --brass, los otros en
   --surface-2 con texto --text-2. Sin corona ni ningún símbolo decorativo.
   Sección "Cerca de ti": tarjetas horizontales con distancia en km, rating,
   precio desde, y botón de reservar.

2. DETALLE DE BARBERÍA
   Hero con galería de fotos deslizable, nombre en 34px sobre el degradado,
   rating y dirección. Tabs: Servicios / Reseñas / Info.
   Botón de reservar fijo abajo, sobre fondo --bg con borde superior.

3. FLUJO DE RESERVA — 4 pasos en una sola pantalla con indicador de progreso:
   elegir servicio → elegir barbero → elegir fecha y hora → confirmar.
   Los slots de hora como chips de 999px; el seleccionado en --brass, el ocupado
   tachado y al 40%.

4. MIS CITAS
   Tabs Próximas / Historial. Cada cita con badge de estado. Los 6 estados:
   Pendiente --warn, Confirmada --brass, En curso --brass, Completada --success,
   Cancelada --danger, No asistió --text-3. El badge es texto sólido del color
   sobre un fondo del mismo color al 15% de opacidad.

5. MAPA
   Mapa en modo oscuro que combine con --bg. Pines en --brass. Tarjeta deslizable
   abajo con la barbería seleccionada.

6. PERFIL
   Avatar, datos, y lista de opciones en filas sobre --surface separadas por
   bordes de 1px. Sin iconos de colores.

7. BARRA INFERIOR: Inicio, Buscar, Citas, Mapa, Perfil.

Incluye estados vacíos y skeletons. Precios en pesos colombianos, nombres
colombianos.
```

---

## Al recibir el resultado — checklist de 30 segundos

Antes de pasármelo, abre `src/styles/theme.css` y verifica:

- [ ] `--bg` es `#0E0E11`. Si dice `#F5EFE6`, Figma volvió a ignorar el brief.
- [ ] No aparece `#4A2C0A` en ningún archivo.
- [ ] `fonts.css` carga Bricolage Grotesque y Geist, no Poppins/Inter.
- [ ] Ningún archivo `.tsx` contiene `bg-[#` o `text-[#`.
- [ ] Ningún archivo contiene emojis.
- [ ] Los dos zips (barbero y cliente) tienen el `theme.css` **idéntico**.

Ese último punto es el que falló en la v1 y el que más trabajo cuesta arreglar después.
