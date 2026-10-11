# Cuentas de prueba

Estas credenciales son únicamente para demostrar Campus Loop. Los correos tienen el dominio solicitado, pero no se crean buzones ni se envía correo a esas direcciones.

| Correo | Contraseña | Rol |
| --- | --- | --- |
| prueba123@itesa.edu.mx | Prueba123! | Estudiante |
| prueba456@itesa.edu.mx | Prueba456! | Estudiante |
| prueba789@itesa.edu.mx | Prueba789! | Estudiante |
| admin123@itesa.edu.mx | Admin123! | Administrador |

El formulario empieza vacío. Se ingresa el correo completo y la contraseña, respetando mayúsculas y el signo de admiración. La inicialización versionada agrega las cuentas a bases existentes sin borrar usuarios anteriores. Los accesos anteriores con example.com dejan de admitirse por la validación del dominio.

## Probar una devolución

1. Iniciar como prueba456: es quien recibió el multímetro de prueba123.
2. Abrir Préstamos → Mis préstamos y devoluciones, pulsar Informar que lo devolví y confirmar. El recurso sigue prestado.
3. Cerrar sesión e iniciar como prueba123, dueño del multímetro.
4. Abrir el mismo apartado y confirmar que recibió el artículo. Solo entonces aparece como disponible.

La cuenta prueba789 no puede confirmar ese préstamo. También hay un segundo préstamo de vidriería, cuyo dueño es prueba789 y cuyo receptor es prueba123.

Durante la revisión se dejó el multímetro con la devolución informada y la recepción pendiente. Así se puede comprobar directamente el paso 3. En una base nueva ambas confirmaciones comienzan pendientes.

Las confirmaciones se conservan en la base local, no se reinician al recargar. Las cuentas pueden editarse o eliminarse desde administración; la inicialización no restaura contraseñas cambiadas ni cuentas borradas.
