# Contribuir a DevHub

¡Gracias por tu interés! DevHub es construido por estudiantes, para gente que
está aprendiendo — los PRs de principiantes son bienvenidos de verdad.

## Antes de empezar

1. Levanta el proyecto localmente ([README.md](README.md), sección "Levantarlo" — necesitas también la API).
2. Busca un issue abierto (los marcados `good first issue` son el mejor punto de
   entrada) o abre uno describiendo lo que quieres cambiar **antes** de codear.

## Flujo de trabajo

- Ramas: **`dev`** es la rama de trabajo; **`main`** es estable. Los PRs van a `dev`.
- Nombra tu rama: `feat/lo-que-agrega`, `fix/lo-que-arregla`, `docs/lo-que-documenta`.
- Commits en presente y descriptivos (`feat: agrega filtro por rama en deploy`).
- Un PR = un cambio. PRs gigantes se revisan lento o se rechazan.

## Convenciones de código (no negociables)

- **TypeScript strict** — nada de `any` sin justificación en comentario.
- **Componentes standalone + Signals** — sin NgModules nuevos; control flow
  moderno (`@if`/`@for`).
- **Todo texto visible pasa por i18n** (`| t` con clave en `public/i18n/es.json`
  Y `en.json`) — nada hardcodeado en templates.
- Estilos con los tokens SCSS del proyecto (`--dp-*`); soporta tema claro y oscuro.
- Llamadas HTTP solo vía los servicios de `core/services/` (respetan el contrato
  `{success, data}` / `{success, error}` de la API).
- La UI nunca decide permisos: puede ocultar botones por rol, pero la autoridad
  es siempre el backend.

## Qué NO aceptamos

- Features que cobren por seguridad (va contra el principio del proyecto).
- Dependencias pesadas para problemas chicos.
- Cambios de stack (Express/Angular se quedan — ver `docs/06_DECISIONES.md` del workspace).

## Licencia de tus contribuciones

Usamos el modelo estándar **inbound = outbound** con **DCO** (sin CLA):

1. Firma cada commit con `git commit -s`, que agrega la línea
   `Signed-off-by: Tu Nombre <tu@email>`. Con ella certificas el
   **Developer Certificate of Origin**: que tienes derecho a contribuir ese
   código (es tuyo o compatible con AGPLv3).
2. Tu contribución queda licenciada bajo **AGPL-3.0-only** — la misma licencia
   del proyecto, ni más ni menos.

No pedimos cesión de derechos ni licencias extra: tu código sigue siendo tuyo.
(La AGPL ya permite al proyecto ofrecer su propia nube gestionada, así que no
necesitamos nada más.)

## Reportar bugs y vulnerabilidades

- Bugs normales → issue con pasos para reproducir.
- **Vulnerabilidades de seguridad → NO abras issue público.** Sigue [SECURITY.md](SECURITY.md).
