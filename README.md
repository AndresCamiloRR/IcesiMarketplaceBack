# Taller NestJS

Este proyecto forma parte del curso de "Computación en Internet 3" del pregrado de Ingeniería de Sistemas en la Universidad Icesi, Cali, Colombia.

## Contribuyentes
|Nombre | Código | 
|---------|-----------------|
|Andrés Camilo Romero Ruiz|andrescamiloromero22@gmail.com|
|Camilo Carmona Valencia|cami.car.val@outlook.com|

## Objetivos del Proyecto
Desarrollar una aplicación backend robusta con Nest.js que utilice TypeScript para un tipado fuerte y Postgres para la persistencia de datos. La aplicación permitirá realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) en usuarios, categorías y productos, además de manejar la autenticación (jwt) y autorización (roles) de usuarios y las interacciones necesarias entre las 3 entidades para desarrollar el backend de una aplicación similar a un marketplace pero sin entrar en consideraciones de pagos.

## Despliegue
El proyecto se encuentra desplegado en la siguiente url: https://fixed-bellanca-icesi-11a012a9.koyeb.app/.

Existen dos bases de datos, la de producción y la de testing.

Nota: Dado que el despliegue se realizó de forma gratuita, despues de un periodo de inactividad es posible que se demore en volver a levantarse.

Como el proyecto esta siendo hosteado en un servicio externo, no tenemos control sobre la estabilidad de la conección con el servidor.

## Ejecución
1. Clonar el repositorio
2. Tener instalado de forma global npm y yarn
3. Instalar las dependencias a través del comando 
    ```console
    yarn install
    ```
    ó

    ```console
    npm install
    ```
4. Crear el archivo .env el cual deberá tener las siguientes variables (Estos valores son privados):
    ```txt
    # Configuración db
    DATABASE_URL= 'tu url de conexión a tu db postgres'
    
    # Configuración jwt
    JWT_SECRET= Tu clave JWT
    JWT_EXPIRES_IN= el tiempo en que expira tu jwt

    # Configuración de voyage
    VONAGE_API_KEY = sample
    VONAGE_API_SECRET = sample

    # Configuración de mailgun
    MAILGUN_API_KEY = sample
    MAILGUN_DOMAIN = sample

    # Configuración de twilio
    TWILIO_ACCOUNT_SID = AC12345678910112
    TWILIO_AUTH_TOKEN = sample
    TWILIO_PHONE_NUMBER = 12345678908
    ```

5. Ejecutar el proyecto
    ```console
    yarn build
    yarn start
    ```

    ó

    ```console
    yarn build
    yarn start dev
    ```

## Pruebas con jest

Es suficiente con únicamente correr alguno de los siguientes comandos:

```console
# Si solo quieres que corra los tests
yarn test
# Si quieres observar la cobertura
yarn test:cov
```

## Postman
1. Abrir postman
2. Dirigirse arriba a la izquierda en las tres líneas
3. File >> Import >> Elegir el Json que se encuentra en el repo
4. Ejecutar las requests

## Informe

El informe se encuentra en: 