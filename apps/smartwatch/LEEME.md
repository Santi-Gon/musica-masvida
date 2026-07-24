# Música Más Vida - Smartwatch App (Flutter Wear OS)

Este directorio contiene el código fuente para la Práctica 11 y 12 (App de Smartwatch) reescrita en **Flutter**.

## Requisitos
1. **Flutter SDK** instalado en tu computadora.
2. **Android Studio** instalado (con el SDK de Android y herramientas de línea de comandos).
3. Un emulador de **Wear OS** creado en tu *Device Manager* de Android Studio.

## Cómo ejecutar este proyecto

Dado que creamos esta estructura manualmente para adaptarnos al requisito de Flutter, necesitas ejecutar un par de comandos para inicializar el proyecto correctamente en tu máquina:

1. Abre una terminal en esta misma carpeta (`apps/smartwatch`).
2. Ejecuta el comando para descargar las dependencias:
   ```bash
   flutter pub get
   ```
3. Ejecuta el comando para crear la carpeta `android` con la configuración nativa que requiere Flutter para correr:
   ```bash
   flutter create . --platforms=android
   ```
   *(Este comando es seguro y no borrará el código de `lib/main.dart` que ya creamos).*
4. Abre tu emulador de Wear OS desde Android Studio.
5. Ejecuta la aplicación:
   ```bash
   flutter run
   ```

## Notas sobre la conexión a la API
- En el archivo `lib/main.dart`, la variable `apiUrl` está configurada como `http://10.0.2.2:3000/...`.
- `10.0.2.2` es una IP especial que usan los emuladores de Android Studio para conectarse al `localhost` de tu computadora donde está corriendo el Backend (`apps/api`).
- Si pruebas esto en un reloj físico real, debes cambiar esa IP por la IP local de tu computadora en tu red Wi-Fi (ejemplo: `192.168.1.75`).
