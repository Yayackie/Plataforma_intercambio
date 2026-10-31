# Donaciones públicas e historial: guía de prueba

## Abrir
Ejecutar Abrir Campus Loop.cmd. Iniciar sesión con una cuenta de prueba y abrir Donaciones > Explorar.

## Ejemplos incorporados
- Juego de escuadras: cuenta prueba123@itesa.edu.mx.
- Bata de laboratorio: cuenta prueba456@itesa.edu.mx.
- Libro de cálculo: cuenta prueba789@itesa.edu.mx.

Se identifican como Demostración. Se incorporan una sola vez por base de datos, no se restauran al recargar si ya se retiraron o asignaron. Las cuentas y artículos son ficticios.

## Recorrido
1. Iniciar con prueba123@itesa.edu.mx / Prueba123! y solicitar la bata mediante Me interesa y Confirmar.
2. Iniciar en otro navegador o sesión con prueba456@itesa.edu.mx / Prueba456!.
3. En Mis donaciones, elegir a Prueba 123 entre los solicitantes.
4. Prueba 123 acepta la propuesta en Solicitudes y recibidas.
5. El donante informa la entrega y el destinatario confirma la recepción.
6. Ambas cuentas consultan Mi historial para revisar sus movimientos con fecha y hora.

Para publicar otro artículo: Donar un artículo > A la comunidad. Para una propuesta privada: A una persona, seleccionar destinatario y completar los datos.
La selección cierra las solicitudes de ese artículo y abre el seguimiento privado. Si se rechaza o cancela la propuesta, la oferta no se republica automáticamente; puede crearse una nueva publicación.

## Historial
Registra publicaciones públicas, solicitudes, asignaciones, propuestas privadas, aceptación, rechazo, cancelación y confirmaciones de entrega. Las devoluciones de préstamos también generan eventos para ambos participantes.
Las nuevas publicaciones locales de venta/préstamo y sus cambios de estado se registran en el navegador y aparecen junto a los eventos del servidor, con su origen identificado.
Los eventos anteriores no se reconstruyen. No se registran compras o ventas confirmadas porque aún no existe un flujo de compraventa con comprador identificado; cerrar una publicación se registra únicamente como cambio de estado.

## Verificación
- test-donations.cjs: donación privada, roles, estados y concurrencia.
- test-public-donations.cjs: semillas sin duplicados, privacidad de solicitantes, selección única, seguimiento privado, eventos por usuario y devoluciones.
- test-catalog-messages.cjs: regresión de mensajería y catálogos.
- TypeScript sin errores.
- Compilación de producción.
- Navegador Edge con dos sesiones: publicación pública nueva, solicitud, selección, aceptación, entrega y recepción; historial en ambas cuentas. Sin errores de página.
- Capturas de escritorio y pantalla de 390 px; sin desbordamiento horizontal.

La prueba del navegador dejó un artículo ficticio terminado llamado Prueba funcional de donación, visible en el historial de las cuentas 123 y 456. Los tres ejemplos iniciales siguen disponibles.

Cambios locales. Esta guía no acredita despliegue, PR revisado o issue cerrado.
