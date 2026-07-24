import { Shield, FileText } from 'lucide-react';
import './Terms.css';

export function Terms() {
  return (
    <div className="terms-page">
      <section className="page-header">
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <Shield size={14} /> Legal
          </div>
          <h1 className="section-title">Términos y Condiciones</h1>
          <p className="section-subtitle">
            Última actualización: Julio 2026
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-narrow">
          <div className="terms-content">
            <div className="terms-section">
              <h2>1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar el sitio web de Música Más Vida (en adelante "el Sitio"), usted acepta estar sujeto a estos Términos y Condiciones de uso. Si no está de acuerdo con alguno de estos términos, le recomendamos no utilizar el Sitio.
              </p>
            </div>

            <div className="terms-section">
              <h2>2. Descripción del Servicio</h2>
              <p>
                Música Más Vida es una escuela de música que ofrece clases personalizadas de diversos instrumentos musicales, canto y producción musical. A través del Sitio, los usuarios pueden:
              </p>
              <ul>
                <li>Consultar información sobre instrumentos, maestros y planes de estudio.</li>
                <li>Conocer los planes y precios disponibles.</li>
                <li>Ver eventos y actividades programadas.</li>
                <li>Acceder al Dashboard de alumno para gestionar su cuenta.</li>
                <li>Conectar dispositivos inteligentes (smartwatch, Smart TV) para una experiencia enriquecida.</li>
              </ul>
            </div>

            <div className="terms-section">
              <h2>3. Registro y Cuenta de Usuario</h2>
              <p>
                Para acceder a ciertas funcionalidades del Sitio, como el Dashboard y la conexión con dispositivos inteligentes, es necesario crear una cuenta. El usuario es responsable de:
              </p>
              <ul>
                <li>Proporcionar información veraz y actualizada.</li>
                <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
                <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta.</li>
              </ul>
            </div>

            <div className="terms-section">
              <h2>4. Pagos y Facturación</h2>
              <p>
                Los planes de suscripción se cobran mensualmente. Los precios están expresados en Pesos Mexicanos (MXN) e incluyen IVA. Música Más Vida se reserva el derecho de modificar los precios con previo aviso de 30 días.
              </p>
            </div>

            <div className="terms-section">
              <h2>5. Política de Cancelación</h2>
              <p>
                Los alumnos pueden cancelar su suscripción en cualquier momento. La cancelación será efectiva al final del período de facturación vigente. No se realizan reembolsos por períodos parciales.
              </p>
            </div>

            <div className="terms-section">
              <h2>6. Propiedad Intelectual</h2>
              <p>
                Todo el contenido del Sitio, incluyendo pero no limitado a textos, gráficos, logos, imágenes, videos y software, es propiedad de Música Más Vida y está protegido por las leyes de propiedad intelectual aplicables.
              </p>
            </div>

            <div className="terms-section">
              <h2>7. Uso de Dispositivos Inteligentes</h2>
              <p>
                La conexión con dispositivos inteligentes (smartwatch, Smart TV) se realiza mediante PIN temporal de un solo uso. Los datos transferidos incluyen:
              </p>
              <ul>
                <li>Información básica del perfil del alumno.</li>
                <li>Horarios de clases y recordatorios.</li>
                <li>Estadísticas de progreso musical.</li>
                <li>Notificaciones de eventos.</li>
              </ul>
              <p>
                Los PINs de acceso expiran automáticamente después de 10 minutos y son de un solo uso por seguridad.
              </p>
            </div>

            <div className="terms-section">
              <h2>8. Limitación de Responsabilidad</h2>
              <p>
                Música Más Vida no será responsable por daños indirectos, incidentales o consecuentes que puedan surgir del uso del Sitio o de los servicios ofrecidos.
              </p>
            </div>

            <div id="privacidad" className="terms-section">
              <h2><FileText size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Aviso de Privacidad</h2>
              <p>
                Música Más Vida se compromete a proteger la privacidad de sus usuarios conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
              </p>

              <h3>Datos que Recopilamos</h3>
              <ul>
                <li>Nombre completo y datos de contacto (email, teléfono).</li>
                <li>Información de pago (procesada por proveedores certificados).</li>
                <li>Datos de uso del sitio web y dispositivos conectados.</li>
                <li>Preferencias musicales y progreso académico.</li>
              </ul>

              <h3>Uso de los Datos</h3>
              <p>Sus datos personales serán utilizados para:</p>
              <ul>
                <li>Proporcionar y mejorar nuestros servicios educativos.</li>
                <li>Enviar notificaciones relevantes sobre clases y eventos.</li>
                <li>Sincronizar información con dispositivos inteligentes autorizados.</li>
                <li>Generar estadísticas internas (anonimizadas).</li>
              </ul>

              <h3>Derechos ARCO</h3>
              <p>
                Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Para ejercer estos derechos, contacte a: <strong>privacidad@musicamasvida.com</strong>
              </p>
            </div>

            <div className="terms-section">
              <h2>9. Contacto</h2>
              <p>
                Para cualquier consulta relacionada con estos Términos y Condiciones, puede contactarnos en:
              </p>
              <ul>
                <li><strong>Email:</strong> legal@musicamasvida.com</li>
                <li><strong>Teléfono:</strong> (555) 123-4567</li>
                <li><strong>Dirección:</strong> Av. Reforma #123, Col. Centro, CP 06000, Ciudad de México</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
