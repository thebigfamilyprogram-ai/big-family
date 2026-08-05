> ⚠️ **BORRADOR — NO PUBLICAR SIN REVISIÓN LEGAL**
> Este documento es un borrador técnico-legal elaborado con asistencia de IA. No constituye asesoría legal vinculante. Debe ser revisado y aprobado por un abogado colombiano con experiencia en protección de datos y plataformas educativas antes de publicarse.

---

# POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES
## Plataforma Big Family
**Versión:** 1.0 — Borrador  
**Fecha de preparación del borrador:** Julio 2026  
**Última actualización publicada:** [COMPLETAR al publicar]  
**Marco legal:** Ley 1581 de 2012, Decreto 1074 de 2015, Ley 1098 de 2006 (Colombia)

---

## 1. IDENTIFICACIÓN DEL RESPONSABLE DEL TRATAMIENTO

**Nombre o razón social:** [COMPLETAR: nombre legal exacto — e.g., "Fundación Big Family" o nombre registrado ante Cámara de Comercio]  
**NIT / Documento de identificación:** [COMPLETAR]  
**Representante legal:** [COMPLETAR: nombre completo]  
**Domicilio:** [COMPLETAR: dirección física, ciudad, departamento]  
**Correo electrónico de contacto para asuntos de datos personales:** [COMPLETAR: correo oficial — actualmente se conoce `thebigfamilyprogram@gmail.com`; confirmar si es el canal designado para ejercer derechos de Habeas Data]  
**Plataforma:** big-family-nu.vercel.app

---

## 2. ÁMBITO DE APLICACIÓN

Esta política aplica a todos los datos personales recolectados, almacenados, usados o transferidos a través de la Plataforma Big Family, incluyendo los datos de estudiantes (incluyendo menores de edad), coordinadores, expositores, y padres o acudientes que interactúan con la Plataforma.

---

## 3. PRINCIPIOS RECTORES

El tratamiento de datos personales en la Plataforma se rige por los principios establecidos en la Ley 1581 de 2012:

- **Legalidad:** el tratamiento se realiza con base en las autorizaciones y disposiciones legales aplicables.
- **Finalidad:** los datos se recolectan para las finalidades específicas descritas en esta Política, informadas previamente al titular.
- **Libertad:** el tratamiento solo se realiza con el consentimiento previo, expreso e informado del titular.
- **Veracidad y calidad:** los datos deben ser verídicos, completos y actualizados.
- **Transparencia:** el titular tiene derecho a conocer la información existente sobre él.
- **Acceso y circulación restringida:** los datos solo son accesibles a quienes tengan autorización y para las finalidades declaradas.
- **Seguridad:** se adoptan medidas técnicas y administrativas para proteger los datos contra acceso no autorizado.
- **Confidencialidad:** los datos se tratan con reserva, incluso tras finalizar la relación con el titular.

---

## 4. DATOS PERSONALES RECOLECTADOS Y FINALIDADES

### 4.1 Identificación y cuenta de usuario

**Datos recolectados:**
- Nombre completo (`display_name`)
- Dirección de correo electrónico
- Contraseña (almacenada en formato hash — Big Family no tiene acceso a la contraseña en texto plano)
- Foto de perfil y nombre de cuenta de Google (solo cuando el registro se realiza vía Google OAuth)
- Rol en la plataforma (estudiante / coordinador / expositor)
- Código de acceso institucional utilizado en el registro
- Colegio o institución educativa asignada
- Grado escolar (2° a 11°) — para estudiantes
- Nombre de usuario público (`username`) — para el portafolio

**Finalidades:**
- Crear y gestionar la cuenta del usuario en la Plataforma.
- Verificar que el usuario está vinculado a una institución participante del programa.
- Determinar el nivel de contenido (Junior o Senior) correspondiente al grado escolar.
- Permitir el acceso al rol correcto de la Plataforma.
- Habilitar el portafolio público del estudiante en `/p/[username]`.

**Base legal:** ejecución de la relación de uso de la Plataforma (prestación del servicio educativo) y consentimiento del titular.

---

### 4.2 Datos de contacto de acudiente — MENORES DE EDAD (CATEGORÍA PROTEGIDA)

**Datos recolectados:**
- Correo electrónico del padre, madre o acudiente responsable (`guardian_email`)

**Quién proporciona este dato:** el propio estudiante o quien lo registra, durante el proceso de registro, cuando el grado escolar seleccionado corresponde al nivel Junior (grados 2° a 7°).

**Finalidades:**
- Identificar a un adulto responsable vinculado al menor en la Plataforma.
- Servir como canal de comunicación con el acudiente en caso de situaciones que requieran su conocimiento o autorización.
- Prerequisito para futuros flujos de consentimiento parental relacionados con el procesamiento de datos sensibles del menor (perfil psicométrico generado por IA — ver sección 4.3).

**Base legal:** Ley 1098 de 2006 (Código de la Infancia y la Adolescencia) y Artículo 7 de la Ley 1581 de 2012, que exigen garantías especiales para el tratamiento de datos de menores.

**Nota:** los estudiantes Junior ya registrados antes de la implementación de este campo (julio 2026) no tienen `guardian_email` registrado en el sistema. Big Family tomará medidas para solicitar este dato retroactivamente — **[PENDIENTE: confirmar con la organización si se iniciará un proceso de actualización retroactiva y cómo se instrumentalizará]**.

---

### 4.3 PERFIL PSICOMÉTRICO GENERADO POR INTELIGENCIA ARTIFICIAL — CATEGORÍA DE MAYOR RIESGO

> **Atención:** Esta sección describe el tratamiento de datos derivados del test de perfil de liderazgo (BFI-44). Por su naturaleza psicométrica, su generación por un sistema de IA de un tercero (Anthropic, empresa radicada en Estados Unidos), y por involucrar a menores de edad, esta es la categoría de datos con más restricciones legales en todo el sistema.

**Datos recolectados:**
- Respuestas individuales al test BFI-44 (44 preguntas para nivel Senior, 20 para Junior), en escala de 1 a 5
- Puntuaciones calculadas en las 5 dimensiones del modelo Big Five (Apertura, Responsabilidad, Extraversión, Amabilidad, Estabilidad Emocional)
- Arquetipo de liderazgo derivado de los scores
- Descripción personalizada de liderazgo generada por el modelo Claude de Anthropic
- Historial de respuestas y resultados (tabla `leadership_assessments` en la base de datos)

**Finalidades:**
- Personalizar el contenido educativo de los módulos al perfil del estudiante.
- Mostrar al estudiante su arquetipo y fortalezas de liderazgo dentro de la Plataforma.
- Permitir al coordinador visualizar el perfil de su grupo de estudiantes con fines pedagógicos.

**Base legal:** consentimiento informado del titular (o de su acudiente, en el caso de menores).

**⚠️ ADVERTENCIA DE GAP NO RESUELTO — [PENDIENTE DE IMPLEMENTACIÓN ANTES DE PUBLICAR ESTA CLÁUSULA]:**

A la fecha de elaboración de este borrador, el flujo técnico del test BFI-44 **no incluye una pantalla de consentimiento explícito** antes de enviar las respuestas a la API de Anthropic para generar el perfil. El test se presenta, el estudiante responde la última pregunta, y la llamada a la API ocurre automáticamente. Esto significa que:

1. El Artículo 7 de la Ley 1581 de 2012 (tratamiento de datos de menores) está siendo potencialmente incumplido respecto a los estudiantes Junior.
2. Esta cláusula no puede publicarse describiendo un consentimiento que aún no se solicita.

**Esta cláusula quedará habilitada para publicación solo después de que se implemente el paso técnico de consentimiento previo a la generación del perfil de liderazgo.** Ver sección de Gaps Conocidos al final del documento.

**Sobre la naturaleza del perfil:** el perfil de liderazgo es una **herramienta pedagógica** de autoconocimiento, basada en el modelo Big Five de personalidad (John & Srivastava, 1999). No es un diagnóstico psicológico ni clínico, no sustituye la valoración de un profesional de la salud mental, y no determina ninguna decisión de admisión, evaluación académica o tratamiento del estudiante fuera de la Plataforma.

---

### 4.4 Datos académicos y de progreso

**Datos recolectados:**
- Progreso en módulos (completado/en progreso/no iniciado) y avance en video
- Intentos y respuestas a los quizzes de cada módulo
- XP (puntos de experiencia) acumulados
- Insignias (badges) obtenidas
- Proyecto Capstone IDEMR: texto, imágenes y PDFs subidos, URLs de video de YouTube/Vimeo, calificación del coordinador
- Metas personales (Goals)
- Great Venture: metas, creencias, paradigma, equipo y planes (datos JSONB) — puede incluir nombres de otros estudiantes del equipo
- Reflexiones y autoevaluaciones en personalización de módulos (guardadas en localStorage del navegador y en la base de datos)
- Evaluación del coordinador sobre el proyecto del estudiante

**Finalidades:**
- Hacer seguimiento al progreso educativo del estudiante dentro del programa.
- Calcular el XP y desbloquear insignias según los logros alcanzados.
- Permitir que el coordinador evalúe el proyecto Capstone y tome decisiones sobre la certificación.
- Emitir el certificado de finalización del programa cuando se cumplan los requisitos.

**Base legal:** ejecución del programa educativo y consentimiento del titular.

---

### 4.5 Datos públicos del portafolio y certificación

**Datos expuestos públicamente sin autenticación:**

| Ruta pública | Datos visibles | Configurable por el usuario |
|---|---|---|
| `/p/[username]` (portafolio) | Nombre, avatar, arquetipo de liderazgo, perfil Big Five, estadísticas, capstone, Great Venture, universidades de interés | Sí — la visibilidad general del portafolio y de secciones específicas se controla en Configuración. **Estudiantes Senior (grados 8°-11°): público por defecto al registrarse. Estudiantes Junior (grados 2°-7°): privado por defecto al registrarse** (corregido en Sesión 21 — ver nota abajo). En ambos casos el estudiante puede cambiar la visibilidad manualmente en cualquier momento. |
| `/certificacion/[id]` | Nombre, arquetipo, número de certificado, fecha | **No** — el diploma es público por diseño para permitir su verificación |
| `/verify/[certId]` | Nombre, colegio, fecha de certificación | **No** — la verificación pública es parte del propósito del certificado |

> **Nota para acudientes de menores:** el portafolio de un estudiante Junior nace privado. Si el estudiante decide activamente cambiarlo a público desde su configuración, su nombre y perfil de liderazgo pasan a ser visibles para cualquier persona en internet sin autenticación — esa decisión queda en manos del propio estudiante, sin aprobación previa del acudiente. El diploma y la verificación son siempre públicos, independientemente del nivel.
>
> **Corrección retroactiva:** los estudiantes Junior registrados antes de esta corrección tenían el portafolio público por defecto (mismo comportamiento que Senior). Se ejecutó una migración (`20260805000000_junior_portfolio_private_default.sql`) para ponerlos en privado, salvo que ya estuvieran en privado. [PENDIENTE: confirmar fecha exacta en que esta migración se aplicó a producción — a la fecha de este borrador solo existe como archivo SQL, aún no ejecutada contra la base de datos real].

**Finalidades:** permitir que el estudiante comparta su trayectoria y certificación con terceros (universidades, empleadores). La verificación pública garantiza la autenticidad del certificado ante quienes lo reciban.

**Base legal:** consentimiento del titular (para portafolio configurable) y finalidad legítima del programa educativo (para diploma y verificación).

---

### 4.6 Comunicación dentro y fuera de la Plataforma

**Datos recolectados:**
- Mensajes del chat en tiempo real (Team Hub) por colegio
- Reacciones y comentarios en proyectos de otros usuarios
- Notificaciones generadas por el sistema
- Feed de actividad del programa
- Correo electrónico — para envío de notificaciones transaccionales (proyecto evaluado, módulo publicado, eventos) a través del proveedor Resend

**Finalidades:**
- Facilitar la comunicación educativa entre estudiantes del mismo colegio.
- Notificar al usuario sobre eventos relevantes del programa (evaluación de su proyecto, aprobación de reintento de quiz, nuevos eventos).

**Base legal:** ejecución del servicio educativo y consentimiento del titular.

---

### 4.7 Datos técnicos y de seguridad

**Datos recolectados:**
- Cookies de sesión de autenticación Supabase (identifican al usuario autenticado)
- Cookie de idioma (`NEXT_LOCALE`)
- Preferencias de interfaz almacenadas en `localStorage` del navegador (tema dark/light, estado del panel de progreso, estado del menú lateral)
- Dirección IP — utilizada por el sistema de limitación de solicitudes (rate limiting) en los endpoints de IA para prevenir uso abusivo
- Registros de errores técnicos enviados a Sentry (proveedor de monitoreo de errores) — contienen trazas de error, URLs visitadas y metadatos técnicos del navegador; sin embargo, **no incluyen datos de usuario explícitamente etiquetados** en la configuración actual

**Finalidades:**
- Mantener la sesión del usuario autenticada de forma segura.
- Preservar las preferencias de idioma e interfaz entre sesiones.
- Prevenir el abuso de los endpoints de inteligencia artificial.
- Detectar y corregir errores técnicos de la Plataforma.

**Base legal:** interés legítimo en la seguridad y funcionamiento técnico de la Plataforma.

---

## 5. ENCARGADOS DEL TRATAMIENTO (TERCEROS)

Los siguientes proveedores procesan datos en nombre de Big Family en su calidad de encargados del tratamiento. Big Family ha celebrado o se compromete a celebrar los acuerdos correspondientes con cada uno de ellos para garantizar el nivel adecuado de protección de datos:

| Proveedor | Función | Datos que recibe | Ubicación |
|---|---|---|---|
| **Supabase** | Base de datos, autenticación, almacenamiento de archivos, comunicación en tiempo real | Prácticamente la totalidad de los datos personales de la Plataforma | [COMPLETAR: confirmar región del proyecto en el dashboard de Supabase — probablemente AWS us-east-1, Virginia, EE.UU., o South America, São Paulo, Brasil] |
| **Google (OAuth)** | Autenticación alternativa mediante cuenta de Google | Nombre, correo electrónico y foto de perfil de Google (solo usuarios que eligen este método de registro) | Estados Unidos |
| **Anthropic (Claude API)** | Generación del perfil de liderazgo y arquetipo a partir de las respuestas del test BFI-44; personalización de contenido de módulos; generación de insights de datos para coordinadores y administradores | Respuestas del test psicométrico del estudiante, nombre, nivel (Junior/Senior), scores Big Five calculados | Estados Unidos — **transferencia internacional de datos, incluidos datos sensibles de menores de edad** |
| **Resend** | Envío de correos electrónicos transaccionales | Dirección de correo electrónico del destinatario y contenido del mensaje | [COMPLETAR: confirmar región] |
| **Vercel** | Hosting y despliegue de la aplicación | Metadatos de tráfico (IPs, User-Agent, rutas solicitadas) en sus servidores de borde | Estados Unidos (CDN global) |
| **Sentry** | Monitoreo de errores técnicos en cliente y servidor | Trazas de error, URLs visitadas, metadatos técnicos del navegador; sin datos de usuario explícitamente etiquetados en la configuración actual | [COMPLETAR: confirmar si el proyecto usa el endpoint europeo (`ingest.de.sentry.io`) o el americano — ambos aparecen en la configuración de seguridad del sistema] |

> **Nota sobre transferencias internacionales:** El uso de Anthropic para generar perfiles psicométricos de menores implica una transferencia internacional de datos sensibles hacia los Estados Unidos. Esta transferencia debe ser informada explícitamente al titular (o su acudiente) y, de acuerdo con el artículo 26 de la Ley 1581 de 2012, requiere autorización específica cuando los datos se transfieren a países que no ofrecen niveles de protección adecuados. **[PENDIENTE: verificar con abogado si EE.UU. cumple los requisitos del art. 26 o si se requiere cláusula contractual adicional con Anthropic].**

---

## 6. DERECHOS DEL TITULAR

De conformidad con la Ley 1581 de 2012 y el Decreto 1074 de 2015, el titular de los datos (o su representante legal, en el caso de menores de edad) tiene derecho a:

1. **Conocer** los datos personales que Big Family trata sobre el titular.
2. **Actualizar y rectificar** los datos cuando sean inexactos, incompletos u obsoletos.
3. **Solicitar prueba** de la autorización otorgada para el tratamiento de sus datos.
4. **Ser informado** sobre el uso que Big Family ha dado a sus datos.
5. **Presentar quejas** ante la Superintendencia de Industria y Comercio (SIC) cuando considere que sus derechos han sido vulnerados (ver www.sic.gov.co).
6. **Revocar la autorización** para el tratamiento de sus datos, cuando no exista un deber legal o contractual que lo impida. La revocación puede implicar la imposibilidad de acceder a la Plataforma.
7. **Solicitar la supresión** de sus datos, en los mismos términos del numeral anterior.
8. **Acceder gratuitamente** a sus datos personales al menos una vez al mes.

### Procedimiento para ejercer los derechos

El titular o su representante puede ejercer sus derechos enviando una comunicación escrita a:

**Correo electrónico:** [COMPLETAR: correo oficial designado para Habeas Data — actualmente conocido como `thebigfamilyprogram@gmail.com`; confirmar si este es el canal oficial]  
**Asunto:** Solicitud de Habeas Data — [nombre del titular]

La solicitud debe incluir: nombre completo del titular, correo electrónico registrado en la Plataforma, descripción clara del derecho que desea ejercer, y copia del documento de identidad (o del acudiente, si el titular es menor de edad).

**Tiempos de respuesta** (según Ley 1581/2012):
- Consultas sobre datos propios: **10 días hábiles**, prorrogables por 5 días hábiles adicionales con notificación al titular.
- Reclamos (solicitudes de corrección, supresión, revocación): **15 días hábiles**, prorrogables por 8 días hábiles adicionales con notificación al titular.

---

## 7. CONSERVACIÓN DE DATOS

| Categoría de datos | Período de conservación |
|---|---|
| Datos de cuenta (identificación, correo, rol) | Durante la vigencia de la cuenta activa + [COMPLETAR: e.g., "24 meses"] tras la inactividad o cierre |
| Datos académicos y de progreso | Durante la vigencia de la cuenta + el período anterior |
| Perfil psicométrico BFI-44 | Durante la vigencia de la cuenta + [COMPLETAR] — considerar si debe haber período máximo dado que se trata de datos de menores |
| Proyecto Capstone (archivos en Storage) | [COMPLETAR: definir si se eliminan al cerrar la cuenta o se conservan por un período post-cierre] |
| Registros de certificación (`issued_certificates`) | [COMPLETAR: estos registros permiten verificar autenticidad — podría justificarse una retención más larga, e.g., "indefinidamente" o "hasta que el certificado sea revocado"] |
| Correos de acudiente (`guardian_email`) | Mientras la cuenta del menor esté activa |
| Logs técnicos de Sentry | Conforme a las políticas de retención de Sentry — confirmar con el proveedor |

> **Nota:** los plazos de conservación deben ser definidos de forma razonada por la organización y revisados por un abogado. Los marcados como [COMPLETAR] no pueden ser dejados en blanco en la versión publicable.

---

## 8. ELIMINACIÓN DE CUENTA Y RETIRO DEL PROGRAMA

Cuando un estudiante se retira del colegio o del programa, o cuando un usuario solicita la eliminación de su cuenta:

- Los datos de identificación y de sesión se eliminan de la base de datos activa.
- El portafolio público deja de ser accesible.
- Los datos académicos e historial pueden conservarse en forma anonimizada para fines estadísticos del programa **[PENDIENTE: confirmar si Big Family realizará esta anonimización, cómo y por cuánto tiempo]**.
- Los archivos subidos a los buckets de Storage de Supabase (imágenes, PDFs de proyectos) **[PENDIENTE: confirmar si se eliminan automáticamente al borrar la cuenta o si deben eliminarse manualmente]**.
- El registro de certificación (`issued_certificates`) puede conservarse para garantizar la verificabilidad futura del certificado ya emitido, salvo que el titular solicite expresamente su eliminación y no exista impedimento legal.

---

## 9. INCIDENTES DE SEGURIDAD

En caso de incidente de seguridad que comprometa datos personales, Big Family:

1. Tomará medidas inmediatas para contener el incidente.
2. Notificará a la Superintendencia de Industria y Comercio (SIC) dentro de los plazos establecidos por la normativa vigente.
3. Notificará a los titulares afectados cuando el incidente pueda causar un riesgo significativo para sus derechos o libertades, incluyendo, en el caso de menores, a sus acudientes registrados.
4. Documentará el incidente, las medidas tomadas y las lecciones aprendidas.

---

## 10. MENORES DE EDAD — DISPOSICIONES ESPECIALES

De conformidad con el Artículo 7 de la Ley 1581 de 2012 y la Ley 1098 de 2006 (Código de la Infancia y la Adolescencia), el tratamiento de datos de menores de edad está sujeto a las siguientes condiciones adicionales:

- La autorización para el tratamiento de datos de menores debe ser otorgada por quien esté legalmente facultado para dar el consentimiento en nombre del menor (padre, madre, tutor o acudiente legalmente reconocido).
- El tratamiento debe responder al interés superior del menor y garantizar el respeto de sus derechos fundamentales prevalentes.
- La Plataforma determina el nivel Junior (grados 2° a 7°) a partir del grado escolar declarado en el registro, y no a partir de la edad.

**⚠️ CLÁUSULA CONDICIONADA — [PENDIENTE DE IMPLEMENTACIÓN]:**

> "Antes de que el estudiante Junior complete el test de perfil de liderazgo, la Plataforma solicita la autorización explícita del acudiente registrado para el procesamiento de las respuestas mediante inteligencia artificial."

Esta cláusula describe el estado objetivo del sistema una vez se implemente el flujo de consentimiento previo para el test BFI-44. **No puede incluirse en la versión publicable del documento mientras el flujo técnico no esté implementado.**

---

## 11. VIGENCIA Y ACTUALIZACIONES

Esta Política entra en vigencia en la fecha de su publicación en la Plataforma: **[COMPLETAR al publicar]**.

Big Family puede actualizar esta Política cuando sea necesario. Cualquier cambio material será notificado a los titulares con **[COMPLETAR: e.g., 15 días]** de anticipación a través de la Plataforma y/o por correo electrónico al correo registrado.

---

## GAPS PENDIENTES — Estado a julio 2026

1. ✅ **Captura de `guardian_email` obligatoria para Junior** — RESUELTO. Implementado en julio 2026.
2. ❌ **Consentimiento explícito antes de generar el perfil de liderazgo vía IA** — NO RESUELTO. Es el hueco legal más serio. La sección 4.3 está marcada como [PENDIENTE] hasta su implementación.
3. ❓ **Coordinación con el documento de matrícula del colegio** — No verificable desde el código. Confirmar con las instituciones participantes si tienen política de tratamiento propia y cómo se articula con esta.
4. ❓ **Registro en el RNBD de la SIC** — verificar con abogado si aplica según la naturaleza jurídica y tamaño de la organización.
5. ❓ **Región de alojamiento de Supabase, Resend y Sentry** — Confirmar en los dashboards de cada proveedor para completar la tabla de encargados.
6. ❓ **Transferencia internacional a Anthropic (Art. 26 Ley 1581)** — Verificar con abogado si se requiere cláusula contractual adicional.
7. ⚠️ **Portfolio público por defecto para menores** — RESUELTO A NIVEL DE CÓDIGO (Sesión 21): Junior nace privado, Senior nace público, toggle manual disponible para ambos sin restricción. Migración retroactiva escrita para los Junior ya registrados. **No confirmado en producción** — bloqueado porque la migración previa que añade la columna `grade` (`20260722000000_guardian_email.sql`) tampoco se ha ejecutado contra la base de datos real todavía. No marcar como resuelto ante el usuario final hasta confirmar que ambas migraciones corrieron en el SQL Editor de Supabase.
8. ❓ **Plazos de conservación de datos** — Todos los campos [COMPLETAR] deben ser definidos por la organización.

---

> ⚠️ **FIN DEL BORRADOR — REQUIERE REVISIÓN LEGAL**
> Este documento no puede publicarse en la Plataforma sin la aprobación previa de un abogado colombiano licenciado con experiencia en protección de datos personales, plataformas educativas y datos de menores de edad.
