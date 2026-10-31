# Revisión de requisitos e interfaz

Fecha: 10 de octubre de 2026.

## Resultado

Campus Loop es un prototipo parcial; no cumple todavía la especificación completa. Mostrar una pantalla o una confirmación no demuestra que exista un flujo multiusuario persistente. Esta revisión combina lectura del código con comprobaciones de interfaz; no certifica seguridad, rendimiento ni disponibilidad.

Referencias locales revisadas:

- Fase 2 / Requerimientos del Sistema e Historias de Usuario Versión r1.1.pdf: referencia principal, RF-01 a RF-13 y RNF-01 a RNF-06.
- Fase 2 / Resultados de Pruebas.pdf: evidencia previa de recorridos; páginas 26–27 distinguen acciones comprobadas de módulos pendientes.
- Fase 1 / Entregables / ISC / Diagramas de Diseño.pdf: arquitectura esperada con API, almacenamiento de publicaciones, transacciones, mensajes, fotos y correo.

Los documentos originales permanecen fuera del repositorio del programa. La revisión no modifica ni sustituye su aprobación académica.

## Matriz de cumplimiento actualizada

| Requisito | Estado | Evidencia y pendiente |
| --- | --- | --- |
| RF-01 Acceso institucional | Parcial | Acceso manual con dominio ITESA obligatorio en cliente y servidor. Sesión HttpOnly persistida con vencimiento y cierre de sesión. Falta verificar la propiedad del correo institucional. |
| RF-02 Perfiles | Implementado en prototipo | Edición de perfil con identidad obtenida de sesión. Estudiantes solo editan su cuenta y no pueden elevar rol, cambiar correo ni estado; administración requiere rol verificado en servidor. |
| RF-03 Publicaciones | Parcial | Existe formulario y alta local. Falta materia; la fotografía solo conserva su nombre durante el formulario y no se almacena ni se muestra. Las condiciones actuales no coinciden con Nuevo / Usado excelente / Usado aceptable. |
| RF-04 Modalidades | Implementado en prototipo | Venta, préstamo y donación con precio o plazo requerido. Pendiente validar y guardar las operaciones en servidor. |
| RF-05 Filtros | Parcial | Carrera, semestre y categoría combinables. Se corrigió la ocultación de filtros en móvil. Faltan materia y condición; limpiar filtros solo aparece cuando no hay resultados. |
| RF-06 Sugerencias | Implementado en prototipo | Inicio conserva recomendaciones y ahora cruza carrera y semestre, excluyendo artículos propios, ocultos y no disponibles. Usa datos locales. |
| RF-07 Mensajería | Implementado entre cuentas | Conversaciones privadas y mensajes persistidos en D1, con identidad y participantes verificados en servidor. Búsqueda por nombre/correo parcial; un hilo por pareja de cuentas. Publicaciones con ownerId abren el chat del propietario; las antiguas sin propietario registrado abren búsqueda manual. Falta una asociación persistente entre conversación y publicación. |
| RF-08 Estados | Parcial | Mercado sigue con estados locales. Los recursos vinculados a préstamos toman su estado de D1 y no pueden liberarse manualmente desde Mis publicaciones. |
| RF-09 Devolución | Implementado para préstamos registrados | D1 guarda participantes y confirmaciones. El prestatario informa devolución y solo después el dueño confirma recepción. El servidor autentica la cuenta y rechaza a terceros. Falta el alta de nuevas solicitudes y aceptación del préstamo desde catálogo. |
| RF-10 Correos | No implementado | No hay servicio ni programación de recordatorios y confirmaciones. Se retiró el texto de interfaz que prometía enviarlos. |
| RF-11 Moderación | Parcial | Reportes locales con motivo fijo. Ocultar funciona localmente; resolver una incidencia de usuario no suspende la cuenta. La suspensión del directorio es una operación diferente. Faltan motivo editable, relación por ID y permisos de servidor. |
| RF-12 Búsqueda | Implementado en prototipo | Busca nombre/descripción y respeta filtros; estado vacío y limpieza comprobados en navegador. |
| RF-13 Reseñas | No implementado / especificación incompleta | Aparece en el listado y HU-14 de r1.1, pero no tiene ficha detallada ni criterios de aceptación. Debe precisarse antes de implementarlo. |
| RNF-01 Seguridad | Parcial; no certificado para producción | Sesiones HttpOnly/SameSite con expiración, tokens aleatorios guardados como hash, validación de origen y autorización de usuarios/préstamos en servidor. Sigue pendiente reemplazar SHA-256 de contraseñas, limitar intentos de inicio de sesión y separar las cuentas demo de un despliegue real. |
| RNF-02 Usabilidad | Parcial | Se conserva publicación en tres pasos. Interfaz simplificada y filtros móviles visibles. Faltan los campos de RF-03 y comprobación completa de todos los recorridos con usuarios. |
| RNF-03 Rendimiento | No verificado | No hay mediciones p95 ni pruebas de concurrencia. La rapidez con seis ejemplos locales no demuestra el requisito. |
| RNF-04 Disponibilidad | Parcial / no verificado | Préstamos y sesiones ya persisten en D1. Catálogos y conversaciones también persisten en D1; publicaciones y reportes aún usan localStorage. Sin evidencia de recuperación, copias de seguridad o disponibilidad del servicio. |
| RNF-05 Compatibilidad | Parcialmente verificado | Revisión visual en navegador integrado con tamaños de escritorio y móvil. Pendiente ejecutar la matriz Chrome / Edge / Firefox en dispositivos reales. |
| RNF-06 Escalabilidad | Parcial | Catálogo académico persistente y compartido entre perfiles, altas de usuarios, publicaciones y filtros. Renombrar conserva equivalencias con nombres anteriores y actualiza carreras de cuentas. Pendiente validar escalabilidad con carga real. |

## Cambios de esta entrega

- Acceso en una tarjeta con marca ITESA, credenciales y selector de demostración; sin portada promocional.
- Navegación conservada: inicio, catálogo, publicaciones, mensajes, préstamos y administración por rol.
- Inicio enfocado en recomendaciones por carrera y semestre, con estado vacío útil.
- Eliminados fecha fija, índice de confianza inventado, cifras de impacto, avatares decorativos, cifras de comunidad, vistas inventadas y contador fijo de mensajes.
- Eliminados campana sin acción y buscador superior que no transfería el texto al catálogo.
- Tarjetas compactas, superficies claras, acento institucional y títulos directos.
- Eliminadas afirmaciones de verificación, privacidad y notificaciones que el código no acredita.
- Búsqueda de conversaciones conectada; filtros existentes visibles también en móvil.
- El perfil se guarda con el ID de la cuenta actual, sin enviar el ID fijo de un administrador.

## Prioridades siguientes

1. Hashing de contraseñas, limitación de intentos y separación de demostración/producción; las sesiones y permisos de usuarios/préstamos ya existen.
2. Persistencia de publicaciones, fotografías y reportes; alta de nuevas solicitudes de préstamo.
3. Completar publicación y filtros con materia y condición según r1.1.
4. Completar solicitud y aceptación de préstamos, y correos automáticos. La devolución doble para préstamos registrados ya está implementada.
5. Moderación efectiva, definición de reseñas y pruebas funcionales, de seguridad, carga y compatibilidad.

## Límites locales

La inicialización incorpora una migración versionada que agrega las cuatro cuentas ficticias también a bases existentes, sin borrar usuarios ni sobrescribir cuentas que ya tengan esos correos. Se ejecuta una sola vez para respetar posteriores cambios de contraseña y eliminaciones.

El informe evita asignar un porcentaje: hay criterios de distinta importancia y faltan pruebas de servidor para sostener una cifra.

## Verificación de esta entrega

- Catálogo probado en navegador integrado: búsqueda sin coincidencias y recuperación de resultados al limpiar.
- Revisión visual en vista de escritorio y móvil: catálogo, navegación y formulario. Sin desbordamiento horizontal en las pantallas móviles inspeccionadas.
- Formulario: intentar avanzar vacío muestra los campos faltantes y conserva el paso actual.
- Mensajes: la búsqueda por nombre reduce la lista de conversaciones.
- Tras corregir la inicialización, se verificó el acceso de las cuatro cuentas ficticias mediante /api/session en la base local existente. La regresión scripts/test-demo-accounts.cjs comprueba bases vacías y pobladas, credenciales incorrectas, conservación de usuarios, cambios de contraseña y eliminaciones.
- `git diff --check`: sin errores.
- `tsc --noEmit --incremental false`: aprobado después de actualizar las API de usuarios y sesiones. Los ocho errores previos de tipos quedaron corregidos.
- La compilación de producción se ejecutó directamente con `node scripts/run-framework.mjs build`, después de que el helper no encontrara su ruta de npm.

No se enviaron mensajes a terceros ni correos reales, ni se modificaron registros de usuarios para estas pruebas. No se realizó un despliegue del sitio alojado: esta entrega se guarda en código local y GitHub.

## Iteración: acceso institucional, Mercado y Préstamos

- Petición: quitar el selector de credenciales, usar cuentas ITESA, separar ventas de préstamos y exigir recepción confirmada por el dueño.
- Acceso sin cuentas visibles ni datos precargados. Nuevas cuentas ficticias documentadas en `docs/cuentas-prueba.md`.
- Mercado contiene ventas y donaciones. Préstamos contiene su catálogo y la pestaña de seguimiento; Inicio también separa las recomendaciones.
- Confirmación previa en diálogo; el prestatario no libera el artículo. La segunda confirmación pertenece exclusivamente al dueño autenticado.
- Se retiraron los préstamos preconfirmados de los datos del navegador; los registros actuales están en D1 y se inicializan sin confirmaciones.
- API `/api/loans`: GET devuelve préstamos de la cuenta y estados del catálogo; PATCH recibe solo el ID y usa la sesión para decidir qué participante confirma.
- Nuevas tablas creadas de manera idempotente: `user_sessions` y `loans`. La inicialización versionada `institutional-loans-v1` incorpora dos préstamos ficticios entre las nuevas cuentas.
- Regresión `node scripts/test-loan-returns.cjs`: orden de confirmaciones, terceros, persistencia, repetición, visibilidad por cuenta, sesiones, cierre, origen y usuarios suspendidos.
- API local: sin sesión 401, dueño antes de devolución 409, tercero 403; un actorId/rol enviado por cliente no cambia la identidad.
- Navegador: Mercado excluye préstamos; Préstamos excluye ventas/donaciones; acceso manual, cierre de sesión, aviso de devolución al 50% y botón de recepción en la cuenta del dueño comprobados.
- El préstamo ficticio del multímetro quedó pendiente de recepción para que el usuario pueda comprobar el último paso con prueba123.

La doble confirmación registra la declaración de ambas cuentas; no constituye por sí sola evidencia física de la entrega. No se envían correos automáticos en esta versión.

## Iteración: perfil de consulta e inicio simplificado (11 de octubre de 2026)

- El panel de cuenta muestra nombre, correo, rol y datos académicos sin campos editables. El botón Configurar mi perfil abre una pantalla independiente con validación, estado de guardado y errores.
- Se conservan dos roles, según aclaración del usuario: Estudiante y Administrador. Administración ya incluye creación, edición, suspensión/reactivación y eliminación de cuentas; sus endpoints verifican la sesión y el rol.
- Inicio presenta dos tarjetas diferenciadas para Mercado y Préstamos. Se eliminan los accesos y mensajes vacíos duplicados, conservando recomendaciones separadas por modalidad cuando existen.
- Validación: TypeScript, compilación de producción y regresión de cuentas aprobados. Revisión en navegador del inicio, perfil sin entradas editables, navegación a Configuración y guardado exitoso sin salir de la pantalla.


## Iteración: catálogo editable y mensajería por participantes (11 de octubre de 2026)

- Carreras y categorías se agregan o renombran en D1. Las carreras renombradas se actualizan en las cuentas; las publicaciones locales resuelven nombres anteriores mediante equivalencias.
- Cada cambio de catálogo o gestión de cuentas exige la contraseña actual del administrador. El servidor comprueba rol, sesión, origen y contraseña en la operación; la contraseña no se conserva en localStorage. Cinco errores de confirmación bloquean nuevos intentos durante cinco minutos.
- Se retiran conversaciones simuladas y su almacenamiento compartido en el navegador. Cada hilo pertenece a dos cuentas; ni terceros ni administradores ajenos pueden consultarlo o escribir. El destinatario ve los mensajes recibidos. Actualización periódica cada cinco segundos.
- Nueva conversación permite buscar al menos dos caracteres del nombre o correo. Por ejemplo, admin encuentra admin123@itesa.edu.mx; hay que seleccionar el resultado, nunca se escoge automáticamente una coincidencia ambigua. Las cuentas suspendidas y la cuenta propia se excluyen de la búsqueda.
- Comprobación: pruebas aisladas en SQLite de privacidad, identidad del remitente, suspensión, hilos duplicados, persistencia del catálogo, migración de carrera, contraseña y bloqueo. Pruebas de rutas verifican 401/403 y que actorId/senderId enviados por cliente no permiten acceder a un chat ajeno. Regresiones de cuentas y devoluciones, TypeScript y compilación de producción.
- Revisión de interfaz en escritorio y móvil: edición de categoría, rechazo de contraseña incorrecta, guardado válido y restauración del nombre original; búsqueda, creación de hilo y envío/recepción entre cuentas de prueba.
- Límite: reportes siguen siendo un prototipo local; su diálogo de confirmación no sustituye una futura API de moderación. No se han añadido notificaciones por correo, cifrado de extremo a extremo ni almacenamiento de publicaciones en servidor.
