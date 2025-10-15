# E-commerce Backend — Parcial 3er Corte

Bienvenido al backend de la tienda de tecnologias. Este repositorio implementa una API serverless pensada para un flujo de compra simple y seguro: autenticación, CRUD de productos, carrito y checkout. Integra AWS Lambda, API Gateway, DynamoDB, Terraform para la infraestructura y GitHub Actions para CI/CD.

---

## 🚀 Resumen rápido

-   Arquitectura: Serverless (Lambda + API Gateway) + DynamoDB
-   Infraestructura: Terraform (IaC) — región por defecto: `us-west-1`
-   CI/CD: GitHub Actions ejecuta Terraform (init/plan/apply) en pushes a `main`
-   Objetivo: CRUD de productos, autenticación de usuarios y proceso de checkout (carrito)

---

## 🧭 Características principales

-   Registro e inicio de sesión de usuarios (JWT)
-   Gestión de productos (crear, listar)
-   Carrito de compras y proceso de pago (registro de orden)
-   Infraestructura declarativa con Terraform
-   Pipeline automatizado para desplegar infraestructura en AWS

---

## 🛠️ Tecnologías

-   AWS Lambda
-   Amazon API Gateway
-   Amazon DynamoDB
-   Terraform
-   GitHub Actions
-   Node.js / Python (esqueleto de lambdas; adapta según tu implementación)
-   jq, curl (para ejemplos)

---

## 📁 Estructura propuesta del repositorio

-   terraform/ — archivos Terraform (variables.tf, main.tf, outputs.tf)
-   src/lambdas/ — funciones Lambda (user_register, user_login, product_create, product_list, cart_create)
-   .github/workflows/ — workflow de CI/CD (deploy.yml)
-   README.md — este archivo
-   .gitignore
-   docs/ — documentación adicional (opcional)

---

## 🌐 Endpoints (API)

Nota: todas las rutas protegidas esperan header `Authorization: Bearer <JWT>`.

Usuarios

-   POST /user

    -   Body:

        ```json
        {
        	"name": "string",
        	"email": "string",
        	"password": "string",
        	"phone": "string"
        }
        ```

    -   Respuesta: 201 Created

        ```json
        {
        	"message": "Usuario registrado exitosamente",
        	"data": { "id": "uuid", "name": "...", "email": "...", "phone": "...", "createdAt": "..." }
        }
        ```

-   POST /user/login

    -   Body:

        ```json
        {
        	"email": "string",
        	"password": "string"
        }
        ```

    -   Respuesta: 200 OK

        ```json
        {
        	"message": "Login exitoso",
        	"token": "eyJ..."
        }
        ```

Productos

-   POST /product

    -   Headers: `Authorization: Bearer <token>`
    -   Body:

        ```json
        {
        	"name": "string",
        	"brand": "string",
        	"categories": ["string"],
        	"price": 123.45
        }
        ```

    -   Respuesta: 201 Created (producto con id y createdAt)

-   GET /product

    -   Respuesta: 200 OK

        ```json
        {
        	"data": [{ "uuid": "...", "name": "...", "brand": "...", "categories": ["..."], "price": 123.45 }]
        }
        ```

Carrito / Checkout

-   POST /cart

    -   Headers: `Authorization: Bearer <token>`
    -   Body:

        ```json
        {
        	"products": [{ "uuid": "id1" }, { "uuid": "id2" }],
        	"total": 234.56
        }
        ```

    -   Respuesta: 201 Created / 200 OK

        ```json
        {
        	"products": [{ "uuid": "id1" }, { "uuid": "id2" }],
        	"userId": "user-uuid",
        	"total": 234.56
        }
        ```

Ejemplo rápido con curl (registro):

```bash
curl -X POST https://<api-gateway>/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"pass123","phone":"3001112222"}'
```

---

## 🔐 Secrets y variables a configurar

En GitHub Actions (Secrets del repositorio) añade:

-   AWS_ACCESS_KEY_ID — credenciales con permisos para crear recursos (preferible IAM role limitado)
-   AWS_SECRET_ACCESS_KEY
-   AWS_REGION — por ejemplo `us-west-1`
-   JWT_SECRET — secreto para firmar JWTs (si lo usas en lambdas)
-   (Opcional) TF*BACKEND*\* — si usas backend remoto para Terraform (S3/DynamoDB)

Localmente (para pruebas o despliegue manual):

-   export AWS_ACCESS_KEY_ID=...
-   export AWS_SECRET_ACCESS_KEY=...
-   export AWS_REGION=us-west-1
-   export JWT_SECRET=...

Recomendación: usa roles con permisos mínimos y evita usar credenciales de root. Para CI, crea un usuario/role con políticas limitadas solo a los recursos necesarios.

---

## ⚙️ Despliegue (resumido)

1. Asegúrate de tener:

    - Terraform instalado (>= 1.3.0)
    - AWS CLI configurado o variables de entorno AWS\_\*
    - (Opcional) GitHub CLI para crear el repo y secrets

2. Configurar secrets en GitHub (AWS\_\*, JWT_SECRET, etc.)

3. Despliegue automático

    - Al hacer push a `main`, el workflow `.github/workflows/deploy.yml` ejecuta:
        - terraform init
        - terraform validate
        - terraform plan
        - terraform apply

4. Despliegue manual (local)

    ```bash
    cd terraform
    terraform init
    terraform plan -out=tfplan
    terraform apply -input=false tfplan
    ```

---

## 🏗️ Infraestructura (resumen técnico)

-   DynamoDB tables:

    -   `${project_name}-users` (PartitionKey: uuid, SortKey: email)
    -   `${project_name}-products` (PartitionKey: uuid, SortKey: name)
    -   `${project_name}-cart` (PartitionKey: uuid, SortKey: UserId)

-   IAM:

    -   Role para Lambdas con permisos:
        -   dynamodb:PutItem, GetItem, Scan, Query, UpdateItem (idealmente restringidos a ARNs de las tablas)
        -   logs:CreateLogGroup/Stream, PutLogEvents

-   Lambdas:
    -   user_register, user_login, product_create, product_list, cart_create
    -   Handler minimal que valida input y accede a DynamoDB

---

## ✅ Buenas prácticas sugeridas

-   Aplica principios SOLID y DRY en el código Lambda
-   Añade validaciones y manejo de errores robusto (status codes claros)
-   Usa variables de entorno y secretos para configuración
-   Restricción de permisos IAM por recurso (no usar Resource = "\*")
-   Agrega pruebas unitarias (mocha/jest/pytest) y linters
-   Sigue Conventional Commits para mensajes de commit

---

## 🧪 Pruebas y verificación

-   Test unitarios recomendados por lambda: funciones puras (validación, cálculo total, etc.)
-   Pruebas de integración: invocar endpoints contra un entorno de staging
-   Ver logs en CloudWatch para depurar Lambdas

---

## 🧾 Entregables (para evaluación)

-   Código del backend en este repositorio
-   Carpeta `terraform/` con la infraestructura
-   `src/lambdas/` con las funciones (o enlaces a implementaciones)
-   Video demostrativo mostrando registro, login, creación de producto y checkout

---

## 🛠️ Comandos útiles

Ver remotes:

```bash
git remote -v
```

Crear repo y push inicial con GitHub CLI:

```bash
gh auth login
gh repo create Yeizermarrugo/NOMBRE_REPO --private --source=. --remote=origin --push
```

Push a un remote existente sin perder commits:

```bash
git remote add nuevo https://github.com/Yeizermarrugo/NOMBRE_REPO.git
git push --all nuevo
git push --tags nuevo
```

---

## 🤝 Contribuir

-   Fork + PR
-   Sigue el estilo de commits (Conventional Commits recomendado)
-   Añade pruebas para nuevas funcionalidades
-   Documenta endpoints y cambios en `docs/`

---

## 📄 Licencia

Indica la licencia que prefieras (ej. MIT) o reemplaza por la que te pidan en la entrega.

---

## 📞 Contacto

Mantén un archivo CONTRIBUTE.md o un issue template si necesitas feedback del profesor o compañeros.

Gracias por revisar este backend — si quieres lo dejo listo en el repo (`README.md`) con ejemplos de cURL más detallados, o genero el `deploy.yml` y la estructura `terraform/` completa para que puedas commitear de una.
