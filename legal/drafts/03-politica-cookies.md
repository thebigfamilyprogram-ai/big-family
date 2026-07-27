> ⚠️ **BORRADOR — NO PUBLICAR SIN REVISIÓN LEGAL**
> Este documento es un borrador técnico-legal elaborado con asistencia de IA. No constituye asesoría legal vinculante. Debe ser revisado y aprobado por un abogado colombiano antes de publicarse.

---

# POLÍTICA DE COOKIES Y ALMACENAMIENTO LOCAL
## Plataforma Big Family
**Versión:** 1.0 — Borrador  
**Fecha de preparación del borrador:** Julio 2026  
**Última actualización publicada:** [COMPLETAR al publicar]

---

## 1. ¿QUÉ SON LAS COOKIES?

Las cookies son pequeños archivos de texto que un sitio web almacena en el navegador del usuario cuando este lo visita. Permiten que el sitio recuerde información entre visitas (como la sesión iniciada) sin necesidad de que el usuario la ingrese cada vez.

Además de las cookies, existen otros mecanismos de almacenamiento local en el navegador:
- **`localStorage`:** almacenamiento persistente en el dispositivo del usuario; no se envía al servidor automáticamente; persiste entre cierres del navegador.
- **`sessionStorage`:** almacenamiento temporal que se borra cuando el usuario cierra la pestaña o el navegador.

Esta política cubre los tres mecanismos.

---

## 2. COOKIES QUE UTILIZA LA PLATAFORMA

### 2.1 Cookies esenciales — necesarias para que la Plataforma funcione

Estas cookies no pueden desactivarse sin que la Plataforma deje de funcionar correctamente. No almacenan información de identificación personal más allá de lo necesario para mantener la sesión.

| Cookie | Función | Duración | Proveedor |
|---|---|---|---|
| `sb-[projectId]-auth-token` y cookies relacionadas de Supabase Auth | Mantienen la sesión del usuario autenticado. Sin ellas, el usuario tendría que iniciar sesión en cada visita. Son generadas y gestionadas por Supabase mediante su librería `@supabase/ssr`. | Duración de la sesión (o conforme a la política de Supabase) | Supabase (ver [supabase.com/privacy](https://supabase.com/privacy)) |
| `NEXT_LOCALE` | Guarda el idioma seleccionado por el usuario (español, inglés, francés, portugués, árabe). Se configura cuando el usuario cambia el idioma en el menú de navegación. | 1 año | Primera parte (Big Family) |

**Base legal:** estas cookies son estrictamente necesarias para la prestación del servicio. No se requiere consentimiento adicional bajo la mayoría de marcos aplicables para cookies de sesión y preferencias de idioma esencial.

---

## 3. ALMACENAMIENTO LOCAL (`localStorage`) — PREFERENCIAS E INTERFAZ

La Plataforma utiliza `localStorage` del navegador para guardar preferencias de interfaz de usuario. A diferencia de las cookies, estos datos no se envían al servidor — permanecen únicamente en el dispositivo del usuario. No se utilizan para rastrear al usuario ni para fines comerciales.

| Clave | Función | Afecta a |
|---|---|---|
| `bf-theme` | Guarda la preferencia de tema visual: claro (`light`), oscuro (`dark`) o automático según el sistema operativo (`auto`). | Todos los usuarios |
| `bf-dashboard-progress-open` | Recuerda si el panel de progreso del dashboard estaba expandido o colapsado. | Estudiantes |
| `app-sb-{rol}-{sección}` | Guarda el estado colapsado/expandido de cada sección del menú lateral según el rol del usuario. | Todos los usuarios |
| `pz-ref-{moduleId}-{i}` | Caché temporal de las reflexiones escritas por el estudiante en la personalización de módulos, para no perderlas ante un cierre accidental. | Estudiantes |
| `pz-ent-{moduleId}` | Caché temporal del entregable escrito en la personalización de módulos. | Estudiantes |
| `tab_switches_video` | Contador de veces que el usuario cambió de pestaña durante la visualización de un módulo de video. Forma parte del sistema de integridad del aprendizaje (anti-trampa). Este valor se transmite al servidor al completar el módulo. | Estudiantes |

**Datos sensibles en `localStorage`:** ninguno de los valores anteriores contiene datos personales identificables más allá del contexto técnico de uso de la interfaz, a excepción de las reflexiones escritas en `pz-ref-*` y `pz-ent-*`, que contienen texto libre redactado por el estudiante y persisten solo en su propio dispositivo.

---

## 4. ALMACENAMIENTO DE SESIÓN (`sessionStorage`) — DATOS TEMPORALES

| Clave | Función | Afecta a |
|---|---|---|
| `bf_result` | Guarda temporalmente el resultado del test de perfil de liderazgo BFI-44 durante el flujo de onboarding, para traspasarlo entre las páginas del test y la página de resultados. Se elimina automáticamente cuando el usuario cierra la pestaña o el navegador. | Estudiantes durante el onboarding |

Este dato es temporal y se usa únicamente para la experiencia de flujo continuo en el onboarding; el resultado definitivo se almacena permanentemente en la base de datos de Supabase.

---

## 5. MONITOREO DE ERRORES — SENTRY

La Plataforma utiliza **Sentry** (sentry.io), un servicio de monitoreo de errores técnicos. Cuando ocurre un error técnico en la aplicación (ya sea en el navegador del usuario o en el servidor), Sentry puede recibir:

- La traza del error y el código fuente involucrado.
- La URL donde ocurrió el error.
- Información técnica del navegador y sistema operativo.
- Metadatos de rendimiento (en el 10% de las sesiones, para optimización técnica).

Sentry **no está configurado para recibir identificadores de usuario ni datos personales etiquetados** en la configuración actual de la Plataforma. No obstante, las trazas de error pueden incluir indirectamente información contextual de la sesión.

Los datos enviados a Sentry se procesan conforme a su propia [política de privacidad](https://sentry.io/privacy/).

---

## 6. LO QUE NO UTILIZAMOS

La Plataforma Big Family **no utiliza** ninguna de las siguientes categorías de cookies o tecnologías de rastreo:

- ❌ **Cookies analíticas** de terceros (Google Analytics, Matomo, Plausible, Hotjar, Clarity, etc.).
- ❌ **Cookies publicitarias o de retargeting** (Meta Pixel, Google Ads, LinkedIn Insight Tag, etc.).
- ❌ **Cookies de redes sociales** para seguimiento cruzado entre plataformas.
- ❌ **Fingerprinting** u otras técnicas de identificación sin cookies.

Si en el futuro se incorpora alguna de estas tecnologías, esta Política se actualizará antes de su activación, y se implementará el mecanismo de consentimiento correspondiente.

---

## 7. CÓMO GESTIONAR LAS COOKIES

El usuario puede controlar las cookies directamente desde la configuración de su navegador:

- **Chrome:** Configuración → Privacidad y seguridad → Cookies y otros datos de sitios
- **Firefox:** Ajustes → Privacidad y seguridad → Cookies y datos del sitio
- **Safari:** Preferencias → Privacidad → Gestionar datos de sitios web
- **Edge:** Configuración → Cookies y permisos del sitio

**Advertencia:** deshabilitar las cookies esenciales (especialmente las de sesión de Supabase Auth) impedirá iniciar sesión en la Plataforma.

Para borrar los datos de `localStorage`, el usuario puede hacerlo desde las herramientas de desarrollador del navegador (F12 → Application → Local Storage → big-family-nu.vercel.app → Limpiar).

---

## 8. ACTUALIZACIONES

Esta Política puede actualizarse cuando se incorporen nuevas tecnologías o cambien los proveedores. Los cambios materiales se notificarán conforme a lo establecido en la Política de Tratamiento de Datos Personales.

---

## 9. CONTACTO

Para preguntas sobre el uso de cookies o almacenamiento local:

**Correo electrónico:** [COMPLETAR: correo oficial de contacto]

---

> ⚠️ **FIN DEL BORRADOR — REQUIERE REVISIÓN LEGAL**
> Este documento no puede publicarse en la Plataforma sin la aprobación previa de un abogado colombiano.
