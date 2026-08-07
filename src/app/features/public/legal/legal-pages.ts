import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/* Páginas legales (solo en español: la versión en español es la legalmente
 * vinculante; v0.1 pendiente de revisión por abogado — ver docs/08_LEGAL_CLASSROOM.md). */

@Component({
  selector: 'dp-privacy-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './legal-pages.scss',
  template: `
    <div class="dp-legal">
      <a routerLink="/" class="dp-legal__back">← DevHub</a>
      <h1>Aviso de privacidad</h1>
      <p class="dp-legal__meta">
        Versión 0.1 · Última actualización: 7 de agosto de 2026 · En revisión legal
      </p>

      <h2>1. Responsable</h2>
      <p>
        DevHub es operado por el <strong>equipo enigma</strong> (proyecto de software con sede en
        Guadalajara, Jalisco, México). Contacto para todo lo relativo a datos personales:
        <a href="mailto:enigmastudio365&#64;gmail.com">enigmastudio365&#64;gmail.com</a>.
      </p>

      <h2>2. Datos que tratamos</h2>
      <p>Al usar DevHub recabamos y tratamos:</p>
      <ul>
        <li>Datos de cuenta: nombre, correo electrónico y contraseña (almacenada solo como hash).</li>
        <li>Avatar o foto de perfil, si decides subirla.</li>
        <li>
          Contenido que tú creas o subes: proyectos, tareas, documentos, archivos y comentarios.
        </li>
        <li>
          Tokens de acceso a servicios que TÚ conectas (GitHub, Vercel), almacenados cifrados
          (AES-256-GCM) y usados únicamente para las acciones que tú solicitas.
        </li>
        <li>Registros de actividad dentro de la plataforma (qué acciones haces y cuándo).</li>
      </ul>
      <p>
        <strong>No recabamos datos personales sensibles</strong> (salud, origen étnico, creencias,
        biometría, etc.) ni datos financieros. Si una función futura llegara a necesitar otra
        categoría de datos, actualizaremos este aviso y pediremos tu consentimiento de nuevo.
      </p>

      <h2>3. Finalidades</h2>
      <p>Usamos tus datos exclusivamente para:</p>
      <ul>
        <li>Crear y operar tu cuenta y las funciones de la plataforma.</li>
        <li>Ejecutar las integraciones que tú conectes (crear repos, desplegar, etc.).</li>
        <li>Mantener la seguridad del servicio (autenticación, límites de uso).</li>
      </ul>
      <p>
        <strong>No vendemos tus datos, no los usamos para publicidad y no entrenamos modelos de IA
        con tu contenido.</strong> Cualquier finalidad nueva requerirá tu consentimiento expreso
        (art. 11, LFPDPPP).
      </p>

      <h2>4. Derechos ARCO (acceso, rectificación, cancelación y oposición)</h2>
      <p>
        Puedes ejercer tus derechos ARCO escribiendo a
        <a href="mailto:enigmastudio365&#64;gmail.com">enigmastudio365&#64;gmail.com</a> con el asunto
        «ARCO». Respondemos en un máximo de 20 días hábiles y, de proceder, ejecutamos en los 15
        días siguientes, sin costo. También puedes eliminar tu contenido y desconectar tus
        integraciones directamente desde la aplicación.
      </p>

      <h2>5. Conservación y transferencias</h2>
      <ul>
        <li>
          Conservamos tus datos mientras tu cuenta exista; si la eliminas, suprimimos tus datos
          personales previa etapa de bloqueo (art. 10, LFPDPPP).
        </li>
        <li>
          Usamos proveedores de infraestructura para operar el servicio (alojamiento de la API y
          la web, y MongoDB Atlas para la base de datos), que tratan los datos por cuenta nuestra.
          No transferimos tus datos a terceros para sus propios fines.
        </li>
      </ul>

      <h2>6. Cambios a este aviso</h2>
      <p>
        Publicaremos cualquier cambio en esta misma página, con su fecha. Si el cambio implica
        nuevas finalidades, pediremos tu consentimiento antes de aplicarlas.
      </p>

      <p class="dp-legal__note">
        DevHub es software libre (AGPLv3): puedes auditar exactamente qué hace nuestro código con
        tus datos en
        <a href="https://github.com/Enigma-Studios-360" target="_blank" rel="noopener">GitHub</a>.
      </p>
    </div>
  `,
})
export class PrivacyPageComponent {}

@Component({
  selector: 'dp-terms-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './legal-pages.scss',
  template: `
    <div class="dp-legal">
      <a routerLink="/" class="dp-legal__back">← DevHub</a>
      <h1>Términos de servicio</h1>
      <p class="dp-legal__meta">
        Versión 0.1 · Última actualización: 7 de agosto de 2026 · En revisión legal
      </p>

      <h2>1. Qué es DevHub</h2>
      <p>
        DevHub es una plataforma para gestionar proyectos de software, conectar tu GitHub, subir tu
        código y desplegarlo. Está en <strong>etapa temprana (beta)</strong>: la operamos
        estudiantes, el servicio puede tener interrupciones (la API gratuita se «duerme» tras
        periodos de inactividad) y las funciones pueden cambiar.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Eres responsable de mantener segura tu contraseña.</li>
        <li>No uses DevHub para actividades ilegales, spam o para alojar malware.</li>
        <li>Podemos suspender cuentas que abusen del servicio o de sus límites.</li>
      </ul>

      <h2>3. Tu contenido es TUYO</h2>
      <p>
        El código y contenido que subes te pertenece. Solo nos otorgas el permiso técnico mínimo
        para operarlo dentro de la plataforma (almacenarlo, mostrártelo, ejecutar las acciones que
        tú pidas, como crear un repositorio en TU cuenta de GitHub o desplegar).
        <strong>No adquirimos licencia alguna para usar tu contenido para nuestros propios
        fines</strong>, no lo compartimos y no entrenamos modelos con él. Puedes llevártelo y borrar
        tu cuenta cuando quieras.
      </p>

      <h2>4. Integraciones de terceros</h2>
      <p>
        Al conectar GitHub o Vercel autorizas a DevHub a actuar sobre TU cuenta únicamente para las
        acciones que solicitas. Esas plataformas tienen sus propios términos y DevHub no es
        responsable de sus servicios.
      </p>

      <h2>5. Sin garantías</h2>
      <p>
        DevHub se ofrece «tal cual», sin garantía de disponibilidad ni de idoneidad para un
        propósito particular, en la máxima medida permitida por la ley. Haz respaldos de lo
        importante (tu código vive en TU GitHub, no solo aquí — a propósito).
      </p>

      <h2>6. Código abierto</h2>
      <p>
        El software de DevHub es libre bajo licencia
        <strong>AGPL-3.0</strong>: puedes estudiarlo, modificarlo y auto-hospedarlo. Estos términos
        aplican al servicio hospedado por nosotros, no restringen tus derechos sobre el código.
      </p>

      <h2>7. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de México. Dudas:
        <a href="mailto:enigmastudio365&#64;gmail.com">enigmastudio365&#64;gmail.com</a> · Privacidad:
        <a routerLink="/privacidad">aviso de privacidad</a>.
      </p>
    </div>
  `,
})
export class TermsPageComponent {}
