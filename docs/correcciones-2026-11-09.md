# Correcciones de sincronización — 9 de noviembre de 2026

- Las publicaciones de venta y préstamo, solicitudes y moderación se guardan en D1, con propietario obtenido de la sesión. Ya no dependen de localStorage.
- Actualización automática cada 2 segundos mientras la aplicación está abierta, además de al recuperar foco/conexión. Es sondeo periódico, no WebSocket ni notificación push con la página cerrada. La latencia real depende de la red y de la respuesta del servidor.
- Préstamos: solicitud, selección por el propietario y exclusión transaccional de asignaciones simultáneas. El artículo vuelve a estar disponible solo después de las dos confirmaciones de devolución.
- Avisos persistentes por cuenta: mensajes no leídos por conversación y novedades en donaciones, préstamos y publicaciones. Leer una conversación marca únicamente hasta el último mensaje mostrado. Los demás apartados tienen «Marcar como revisadas». Sonido suave opcional mediante «Activar sonido», habilitado por un gesto del usuario para respetar las restricciones del navegador.
- Fotos: JPG/PNG/WebP, compresión local, vista previa, persistencia compartida y presentación en tarjetas. Entrada de hasta 12 MB y resultado de hasta 400 000 caracteres base64. No hay bucket R2 configurado; los datos se guardan en D1.
- Donación disponible desde Publicar recurso; donaciones propias también aparecen en Mis publicaciones. Se conservan los flujos de solicitud y entrega.
- Tarjetas, solicitantes y botones de donaciones con espacios y distribución adaptable. «Acuerdos de entrega» explica las propuestas dirigidas a una persona.
- Doce carreras solicitadas, habilitables mediante checkbox; no se renombran ni eliminan. Categorías con alta, edición y eliminación. Los nombres históricos no se borran de publicaciones anteriores.
- Plazos enteros de 1 a 365 días, comprobados en interfaz y servidor.
- Publicaciones del prototipo: la copia original no se elimina del navegador. En Mis publicaciones, su propietario puede revisar y volver a compartir sus publicaciones antiguas. No es posible recuperar automáticamente información que solo existe en otros navegadores.

## Validación

- TypeScript (`tsc --noEmit`) y compilación de producción Vinext.
- `test-demo-accounts.cjs`, `test-loan-returns.cjs`, `test-donations.cjs`, `test-public-donations.cjs`, `test-catalog-messages.cjs`.
- `test-shared-marketplace.cjs`: persistencia entre cuentas, imágenes, plazos inválidos, propiedad, solicitudes, privacidad, lecturas acotadas y moderación.
- `test-shared-http.cjs`: servidor local real, tres sesiones y dos asignaciones concurrentes; una acepta y la otra responde 409. Solo ejecutable contra localhost; crea datos ficticios locales.
- Revisión visual local: publicación, tres modalidades, rechazo de -6 días, tarjetas de donaciones y desaparición de contador tras marcar revisado.

## Operación

No se borra ni reinicializa la base existente. Las tablas complementarias se crean de forma aditiva, como en los módulos existentes. Las fotos y conversaciones completas se consultan periódicamente; para un despliegue con gran volumen conviene separar imágenes a R2 y paginar/sincronizar solo cambios.
