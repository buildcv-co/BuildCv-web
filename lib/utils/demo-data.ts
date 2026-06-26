/** Ejemplo realista (perfil tecnología) para que el usuario pruebe sin pegar su CV. */
export const demoCv = `Mariana Gómez
mariana.gomez@correo.com · +57 311 555 0142 · Bogotá

PERFIL
Desarrolladora backend con 4 años de experiencia en .NET construyendo APIs y servicios para fintech.

EXPERIENCIA
Backend Developer — Pagos S.A.S (2022–2025)
- Lideré la migración de un monolito a microservicios con Docker, reduciendo los despliegues de 2 horas a 15 minutos.
- Desarrollé APIs REST en C# con ASP.NET Core sobre PostgreSQL, atendiendo 1.2 millones de transacciones al mes.
- Implementé pruebas automatizadas que subieron la cobertura del 40% al 85%.

Desarrollador Junior — Soft Andina (2021–2022)
- Mantuve servicios en SQL Server y automaticé reportes con tareas programadas.

EDUCACIÓN
Ingeniería de Sistemas — Universidad Nacional (2021)

HABILIDADES
C#, ASP.NET Core, SQL, PostgreSQL, Git, pruebas unitarias`;

export const demoJob = `Ingeniero(a) Backend .NET — Empresa de tecnología (Remoto, Colombia)

Buscamos un ingeniero backend para fortalecer nuestra plataforma de pagos.

Requisitos:
- Experiencia sólida en C# y ASP.NET Core.
- Bases de datos relacionales (SQL, PostgreSQL).
- Contenedores con Docker y despliegue en la nube.
- Diseño de APIs REST.

Deseable:
- Kubernetes y experiencia en Azure.
- Pruebas unitarias y CI/CD.

Valoramos el trabajo en equipo y la comunicación clara.`;

/**
 * `JobSpec` equivalente al texto de `demoJob`, para que el botón
 * "Probar con un ejemplo" del analyzer (PR 5b) pueble el JobSpecForm
 * en lugar del textarea legacy. Coincide 1:1 con `demoJob` arriba —
 * cualquier cambio en uno debe reflejarse en el otro.
 */
export const demoJobSpec = {
  title: "Ingeniero(a) Backend .NET",
  company: "Empresa de tecnología",
  description:
    "Buscamos un ingeniero backend para fortalecer nuestra plataforma de pagos. Valoramos el trabajo en equipo y la comunicación clara.",
  location: "Remoto, Colombia",
  employmentType: "full_time" as const,
  requirements: [
    "Experiencia sólida en C# y ASP.NET Core",
    "Bases de datos relacionales (SQL, PostgreSQL)",
    "Contenedores con Docker y despliegue en la nube",
    "Diseño de APIs REST",
    "Deseable: Kubernetes y experiencia en Azure",
  ],
};
