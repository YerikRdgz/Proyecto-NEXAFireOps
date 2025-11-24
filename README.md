# 🚒 Proyecto NEXO: Plataforma de Gestion y Control de Personal
Este documento sirve como la documentación técnica oficial del Proyecto Nexo, detallando el proceso de diseño, desarrollo, implementación y análisis de resultados.

## 1. Contexto y Motivación
**¿Por qué este proyecto?**
La gestión administrativa en estaciones de bomberos a menudo depende de procesos manuales, hojas de cálculo desconectadas o software genérico que no se adapta a las reglas específicas de operación (como turnos de guardia, pagos mínimos por evento o riesgos laborales).

**Problema que aborda:** Identificamos la necesidad de un sistema centralizado que pudiera:
1. Gestionar información sensible del personal (incluyendo datos médicos como tipo de sangre y alergias).
2. Controlar la asistencia a eventos con cupos limitados.
3. Automatizar una nómina compleja que incluye reglas de "pago mínimo garantizado" (5 horas) y horas extras.

## 2. Antecedentes e Investigación
**¿Qué existe ya sobre esto?**
Durante la investigación inicial, se analizaron dos vertientes:

**Software HR Tradicional:** Herramientas como SAP o Workday son demasiado costosas y complejas para una estación mediana.

**Diferenciador:** El proyecto se diferencia al ser una Web  ligera, diseñada específicamente con la lógica de negocio de los bomberos, pero con la escalabilidad de una base de datos en la nube, superando las limitaciones, por ejemplo, de una hoja de Excel.

## 3. Propuesta y Objetivos
**Objetivo General:** Desarrollar una plataforma web funcional que permita la administración completa del ciclo de vida de un evento de bomberos: desde la creación del evento hasta el pago de la nómina.

**Objetivos Específicos:**
- Implementar un sistema de Roles estrictos para Administradores y Bomberos.
- Crear un sistema de fichaje en tiempo real con geolocalización lógica (asignación a eventos).
- Asegurar la integridad de los datos mediante una base de datos NoSQL (Firestore).
- Automatizar el cierre de turnos olvidados para evitar errores en la nómina.

## 4. Metodología
**¿Cómo se construyó?**
Se utilizó una metodología Ágil/Iterativa, desarrollando primero la interfaz visual y luego integrando la lógica de negocio y la base de datos.

**Stack Tecnológico:**
- Frontend: React.js (vía Vite) para una interfaz reactiva y veloz.
- Estilos: Tailwind CSS para un diseño adaptativo (móvil/escritorio) rápido.
- Backend/Persistencia: Google Firebase (Firestore) para base de datos en tiempo real.
- Autenticación: Firebase Auth (Gestión de sesiones anónimas y persistentes).
- Control de Versiones: Git y GitHub.

## 5. Proceso de Desarrollo
**Fase 1: Lógica de Negocio (Frontend)**
Se desarrolló la lógica de cálculo de nómina en el navegador.
- Reto: La regla de "Pagar 5 horas mínimo aunque trabajen menos".
- Solución: Se creó un algoritmo en **calculatePayroll** que evalúa el tiempo real vs. el tiempo garantizado.

**Fase 2: Integración de Base de Datos**
Se migró de useState (memoria local) a Firestore.
- Reto: Los datos desaparecían al recargar.
- Solución: Implementación de listeners (onSnapshot) para sincronización en tiempo real.

**Fase 3: Refinamiento y Seguridad**
Se agregaron validaciones críticas:
- Impedir creación de eventos en fechas pasadas.
- Sistema de "Auto-Cierre": Un useEffect que revisa cada 30 segundos si un evento terminó para cerrar automáticamente los turnos abiertos.

## 6. Resultados y Análisis
**¿Qué se logró?**
El sistema es funcional y cumple con el MVP (Producto Mínimo Viable).

**Evidencia de Funcionalidad:**
1. Gestión de Personal: El administrador puede registrar a "Natalie Lazaro", editar sus alergias y tipo de sangre, y estos datos persisten.
2. Nómina: El sistema calcula correctamente el pago base + horas extras (con redondeo después de 30 min).
3. Historial: Se genera un archivo histórico de pagos  (guardando la tarifa histórica para no afectar cálculos futuros si el sueldo cambia).

## 7. Reflexión Crítica y Honestidad
**Lo que aprendí**

La importancia de separar la lógica visual de la lógica de datos.
Conectar una base de datos a una pagina web.

**¿Qué NO se logró desarrollar?**
Debido a limitaciones de tiempo, quedaron pendientes:
1. Reportes en PDF: La exportación de la nómina a papel sigue siendo manual (captura de pantalla o impresión de tabla).
2. Notificaciones Push: Avisar al bombero en su celular cuando se crea un evento.

**¿Por qué?**

Dimos prioridad a otras funciones de la página, ya que cuando estábamos creando la pagina se nos ocurrían nuevas funciones o cambios y dejamos de lado esas funciones.

**¿Qué haría diferente?**
Comenzaría con la base de datos desde el día 1.
Empezar con "datos falsos" facilitó el inicio, pero hizo que la migración a Firebase fuera más laboriosa.

**Next Steps** (Futuro)

- **Funciones avanzadas:**
  - Generación de reportes avanzados.  
  - Auditorías completas. 
  - Paneles visuales con gráficos. 
  - Seguimiento histórico consolidado por evento.

- **Validación de geolocalización:**
  - Verificar si el bombero realmente se encuentra en el evento al iniciar turno.

- **Notificaciones automáticas:**
  - Recordatorios de turno.
  - Cambios en eventos.
  - Cierre de turnos pendientes.

