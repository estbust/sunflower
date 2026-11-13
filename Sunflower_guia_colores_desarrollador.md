# SUNFLOWER PRESCHOOL — Guía de implementación visual
**Versión:** 1.0 · 12 de noviembre de 2026
**Objetivo:** aplicar la nueva identidad visual manteniendo el contenido, orden de secciones, llamadas a la acción, fotografías existentes, funcionalidades y SEO del sitio actual.
**Sitio de referencia:** https://sunflower.estbust1.workers.dev/

## 1. Sistema cromático exacto
| Token | Hex | Función |
|---|---|---|
| `--sf-forest` | `#496D50` | Títulos principales, botón primario, enlaces, pie de página. |
| `--sf-leaf` | `#5F833D` | Íconos, insignias y microdetalles decorativos (no texto pequeño). |
| `--sf-earth` | `#622B15` | Copy, títulos secundarios y texto en botones amarillos. |
| `--sf-sun` | `#FAD515` | Acentos, subrayados, bordes selectivos, CTA alternativo. |
| `--sf-mint` | `#EDF3E8` | Fondo del hero, alternancia de secciones, FAQ y paneles de privacidad. |
| `--sf-white` | `#FFFFFF` | Tarjetas, formularios y secciones de respiro visual. |

Reparto ilustrativo: 55% menta/superficies suaves, 20% blanco, 15% verdes, 7% café, 3% amarillo. Evitar usar amarillo para grandes fondos. Reservar el verde menta para superficies amplias y NO como texto principal.

## 2. Tipografía
- H1/H2/H3: **Fredoka** (600–700), verde bosque; títulos secundarios específicos en café.
- Cuerpo: **Nunito** (400–600), café tierra.
- Navegación, botones, campos y labels: **DM Sans** (500–700).
- Conservar palabras, jerarquías H1–H3, metadatos SEO y orden del DOM.

## 3. Componentes globales (en TODAS las páginas)
- Header/nav: fondo `#FFFFFF`, texto `#622B15`, estado activo y enlaces hover `#496D50`, línea de estado activo amarilla `#FAD515`. Mantener logo original con fondo transparente y tamaño actual razonable.
- CTA principal `Request Information`: relleno `#496D50`, texto blanco; hover fondo `#622B15` y texto blanco. No cambiar texto ni URL.
- CTA secundario `Call Our Campus`/llamadas: borde y texto `#496D50`; fondo transparente/blanco. Hover verde bosque/blanco.
- Títulos H1/H2: `#496D50`; eyebrow/etiqueta superior `#622B15`.
- Párrafos: `#622B15`; no usar verde hoja en texto pequeño sobre menta/blanco.
- Tarjetas: fondo blanco, borde verde bosque transparente al 23%, sombra suave verde, radios existentes aproximados de 20 px; amarillo solo como borde inferior fino o detalle.
- Iconos de sistema: `#5F833D`; números de pasos relleno verde bosque/blanco para contraste AA.
- Footer: fondo `#496D50`, texto/enlaces blancos, acentos amarillos.
- Formularios: blanco, borde `#496D50`, texto `#622B15`, enfoque claro y visible.
- Accesibilidad: texto pequeño blanco/verde bosque 5.86:1; verde bosque/menta 5.18:1; café/menta 9.91:1; café/amarillo 7.78:1. **No** usar blanco sobre amarillo (1.44:1) ni verde hoja como texto pequeño sobre blanco (4.37:1) o menta (3.87:1).

## 4. Implementación página por página

### A. Home `/`
1. Hero: conservar exactamente `Preschool & Child Care in Anchorage, AK` y párrafo. Fondo menta; H1 verde bosque; texto café; CTA verde bosque; segundo CTA outline verde bosque. Conservar imagen destacada y disposición texto/foto.
2. Frase `Play Learn Grow Belong`: mantener copy y orden; superficie blanca en cápsula o banda sutil, tipografía Fredoka café, pequeños acentos amarillos.
3. `Our Core Foundations / An Educational Philosophy Centered on Children`: fondo menta, encabezados verdes, tarjetas blancas para Inquiry-Led Play, Outdoor Discovery, Emotional Growth, Expressive Arts. Iconos verde hoja, detalles amarillos.
4. `Life at Sunflower / A Glimpse into Our Classrooms`: fondo blanco, fotos existentes sin filtros intensos; bordes redondeados y títulos verde bosque.
5. `Learning Pathways / Programs Designed for Every Developmental Stage`: fondo menta; tarjetas blancas con imágenes y nombres de Toddler Care, Preschool Program y School-Age Care; links/íconos verde bosque.
6. `What Sets Us Apart / Included in Every Sunflower Program`: blanco o menta según alternancia; tres tarjetas blancas, títulos café, iconos verde hoja, línea amarilla fina.
7. `Admissions Journey / How Our Admissions Process Works`: fondo blanco, pasos 1–3 en verde bosque, conectores amarillos discretos; mantener instrucciones y aviso de admisiones.
8. FAQ: fondo menta, acordeones blancos, títulos verdes, iconos de expandir en verde hoja; conservar textos y comportamiento del acordeón.

### B. About Us `/about/` (ajustar ruta al repositorio real)
- Hero o intro: fondo menta, H1 verde bosque, cuerpo café, fotos intactas.
- Historia y filosofía: fondo blanco, títulos verde bosque, citas/bloques destacados con café.
- Seguridad y bienestar: fondo menta, tarjetas blancas; iconos verde hoja. Mantener todos los diferenciales ya aprobados (CPR, primeros auxilios, capacitación, revisión de antecedentes, cámaras, acceso seguro, etc.) sin agregar afirmaciones nuevas.
- Equipo y confianza: fotos reales, blanco de fondo; credenciales en etiquetas menta con texto bosque.
- CTA final: verde bosque/blanco; mantener CTA y acción actuales.

### C. Programs overview `/programs/`
- Hero: menta / H1 verde bosque / párrafo café.
- Tres tarjetas de programas: blanco, imagen real, acento amarillo mínimo; botones verde bosque/blanco.
- Sección `Included in Every Sunflower Program`: tarjetas blancas sobre menta o blanco alternado; iconos verde hoja.
- Tabs de `Explore a Typical Daily Rhythm`: activo verde bosque con texto blanco; inactivo fondo blanco, borde verde bosque; tablas/horarios blancos con bloques alternos menta, horas verde bosque.

### D. Toddler Care `/programs/toddler-care/`
- Hero menta con H1 verde bosque y foto.
- Cuatro áreas de desarrollo: tarjetas blancas / iconos verde hoja / títulos café.
- Ambiente del aula: fondo blanco, detalles amarillos mínimos.
- Horario diario: encabezados café, horas verde bosque, filas alternadas blanco/menta, bordes suaves.
- Mantener el contenido actual y el aviso de admisiones.

### E. Preschool `/programs/preschool/`
- Misma arquitectura cromática de Toddler Care para consistencia.
- Centros de aprendizaje: tarjetas blancas con títulos café y señalización de acento amarillo.
- Kindergarten Readiness: fondo menta y tres tarjetas blancas.
- Day Schedule: horas verde bosque, filas blanco/menta, no alterar horas ni textos.

### F. Before & After / School-Age Care `/programs/school-age-care/`
- Hero menta con título verde bosque.
- Pilares de enriquecimiento: tarjetas blancas y iconos verde hoja.
- Opciones de cuidado: tarjetas blancas sobre menta; detalles amarillos únicamente donde ayuden a escanear.
- Timeline de tarde: filas alternas blanco/menta con horas verde bosque.

### G. Enrollment `/enrollment/`
- Hero menta con H1 verde bosque.
- `What Our Families Say`: fondo blanco, reseñas en tarjetas blancas con borde suave; estrellas amarillas y autor en café; no alterar citas.
- `Child Privacy & Data Protection Notice`: superficie menta, borde izquierdo verde bosque y texto café; evitar usar amarillo como color principal del aviso.
- Bloque de contacto/ubicación: blanco; títulos verdes; enlaces verde bosque.
- `Submit Enrollment Inquiry`: formulario blanco sobre franja menta; labels café, campos blancos con borde verde bosque; botón submit verde bosque/blanco.
- `What Happens After Submitting an Inquiry?`: fondo blanco, pasos y líneas amarillas sutiles.
- **No tocar** nombres de inputs, validación de información sensible, integraciones, Turnstile, Web3Forms, acciones de formulario, ni mensajes legales.

### H. Contact `/contact/` (ajustar ruta al repositorio real)
- Hero menta y H1 verde bosque.
- Datos de contacto y horario: tarjetas blancas, iconos verde hoja, teléfonos/enlaces verde bosque.
- Formulario/contacto: campos blancos, labels café, CTA verde bosque/blanco; mantener enlaces de contacto y seguridad.
- Mapa: mantener integración, contenedor blanco con borde verde; CTA de dirección verde bosque.
- Tour: conservar horarios y texto original si aparecen en página.

### I. Gallery `/gallery/` (ajustar ruta al repositorio real)
- Intro menta con H1 verde bosque.
- Galería sobre blanco, fotos originales y su aspecto natural; no añadir una capa verde permanente sobre fotografías.
- Filtros/categorías si existen: activo verde bosque/blanco, inactivo blanco/verde bosque, hover con borde verde.
- Cierre de la página: bloque menta y CTA verde bosque.

## 5. Orden recomendado de trabajo
1. Añadir tokens de color y fuentes; mapear componentes globales header, botones, enlaces, tarjetas, footer.
2. Adaptar Home y solicitar aprobación del diseño antes de propagar estilos.
3. Adaptar páginas Programs y sus tres programas con clases compartidas.
4. Adaptar About y Gallery; conservar fotos y copy.
5. Adaptar Enrollment y Contact, con QA completo de formularios.
6. Revisar desktop (1440px), tablet (768px) y móvil (390px), estados hover/focus, accesibilidad, imágenes y contraste.

## 6. No modificar
- Copy de páginas, títulos SEO, metadescripciones, H1/H2, rutas/slug y canonicals.
- Enlaces, formularios, reCAPTCHA/Turnstile, Web3Forms, teléfonos, correo, consentimiento o analytics.
- Horarios, edades y afirmaciones de servicios sin revisión institucional. Si el contenido actual tiene discrepancias internas, abrir ticket por separado sin resolverlas mediante un cambio de paleta.
- Archivos fuente del logotipo. Usar export original transparente del logo nuevo, no recortar el logo de una captura de pantalla.


> Nota: el mockup es una dirección artística de referencia. El documento y el CSS especifican cómo aterrizarla sobre el sitio REAL conservando su estructura y contenido exactos. Las páginas About, Contact y Gallery no estuvieron disponibles para inspección íntegra en la consulta web y sus instrucciones son recomendaciones para las secciones existentes, no un inventario verificado de cada bloque.
