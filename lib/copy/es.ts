/**
 * Textos en español (es-CO). Centralizados para consistencia y para preparar la
 * i18n (Colombia -> LATAM) sin dispersar strings por la UI.
 */
export const copy = {
  locale: "es-CO",
  appName: "BuildCv",
  nav: {
    analyze: "Analizar mi CV",
    global: {
      home: "Inicio",
      analyze: "Analizar",
      import: "Importar CV",
      subscriptions: "Suscripciones",
      account: "Iniciar sesión",
    },
    mobileMenu: {
      openLabel: "Abrir menú",
      closeLabel: "Cerrar menú",
      dialogLabel: "Menú principal",
    },
  },
  localModePill: {
    label: "Modo local",
    description: "Modo local activo, sin autenticación requerida.",
  },
  home: {
    kicker: "Asistente de CV con IA · Colombia",
    title: "Tu CV, medido con honestidad.",
    subtitle:
      "Pega tu hoja de vida y una vacante. Te decimos qué tan bien encajan, qué palabras clave te faltan y exactamente qué arreglar — con un puntaje que puedes reproducir, no un número inventado.",
    cta: "Analizar mi CV",
    secondary: "Ver cómo funciona",
    honesty:
      "Medimos coincidencia y legibilidad para sistemas automáticos. No es un “puntaje ATS oficial” ni garantiza empleo.",
    steps: [
      { n: "01", t: "Pega tu CV y la vacante", d: "Solo texto. No guardamos nada; se procesa y se descarta." },
      { n: "02", t: "Recibe tu puntaje explicable", d: "Cinco componentes, cada uno con su porqué y su peso." },
      { n: "03", t: "Arregla lo que más suma", d: "Una lista priorizada — y la IA nunca inventa experiencia." },
    ],
  },
  analyze: {
    title: "Analiza tu CV",
    cvLabel: "Tu hoja de vida",
    cvPlaceholder: "Pega aquí el texto de tu CV…",
    jobLabel: "La vacante",
    jobPlaceholder: "Pega aquí la descripción de la vacante…",
    cvHint: "mínimo 200 caracteres",
    jobHint: "mínimo 100 caracteres",
    submit: "Analizar",
    analyzing: "Analizando…",
    tryExample: "Probar con un ejemplo",
    clear: "Limpiar",
    reset: "Analizar otro",
    privacy: "Procesamos en memoria y descartamos el texto al responder.",
    jobSpec: {
      title: "Título del puesto",
      titleHint: "máx. 200 caracteres",
      company: "Empresa",
      companyHint: "máx. 200 caracteres",
      description: "Descripción de la vacante",
      descriptionHint: "máx. 5000 caracteres",
      location: "Ubicación",
      locationHint: "máx. 200 caracteres",
      employmentType: "Tipo de empleo",
      employmentTypeHint: "Selecciona la modalidad",
      employmentTypeOptions: {
        full_time: "Tiempo completo",
        part_time: "Medio tiempo",
        contract: "Contrato",
        internship: "Práctica / Pasantía",
        temporary: "Temporal",
      },
      requirements: "Requisitos",
      requirementsHint: "Mínimo 1. Cada uno, una línea.",
      requirementLabel: (index: number) => `Requisito ${index + 1}`,
      requirementPlaceholder: "Ej. 3 años de experiencia en React",
      addRequirement: "+ Agregar requisito",
      removeRequirement: (index: number) => `Eliminar requisito ${index + 1}`,
    },
  },
  result: {
    scoreLabel: "Coincidencia y legibilidad",
    componentsTitle: "Desglose",
    weight: "peso",
    partial: "medición parcial",
    keywordsTitle: "Palabras clave",
    present: "Presentes",
    partialKw: "Parciales",
    missing: "Faltantes",
    noMissing: "No detectamos requisitos faltantes. 🎯",
    fixesTitle: "Qué arreglar",
    fixesSubtitle: "Ordenado por el impacto estimado en tu puntaje.",
    realGap: "brecha real",
    noInvent: "no se inventa",
    impact: "impacto",
    sealedWith: "Sellado con",
    engine: "motor",
    lexicon: "léxico",
    // ─────────────────────────────────────────────────────────────
    // 021 — v2 (perSection + redFlags). PR 5b agrega el shell básico;
    // PR 5c introduce `<SectionBreakdown>` con copy por-severidad.
    // ─────────────────────────────────────────────────────────────
    v2: {
      sectionTitle: "Desglose por sección",
      sectionLabels: {
        experience: "Experiencia",
        education: "Educación",
        skills: "Habilidades",
        certifications: "Certificaciones",
        contact: "Contacto",
      } as const,
      scoreOutOf: " / 100",
      noScore: "—",
      redFlagsTitle: "Señales a revisar",
      redFlagSeverity: (severity: string) => `severidad: ${severity}`,
      redFlagCode: (code: string) => `código: ${code}`,
    },
  },
  confidence: {
    low: "confianza baja",
    medium: "confianza media",
    high: "confianza alta",
  },
  adapt: {
    panel: {
      title: "Adaptar tu CV",
      description: "Reorganiza, reescribe y prioriza tu CV sin inventar contenido.",
      button: "Adaptar mi CV",
      buttonLoading: "Adaptando…",
      buttonHint: "versión determinista · v0",
    },
    severity: {
      none: "Sin invenciones. CV lista para descargar.",
      warning: "Advertencia: hay mejoras menores que puedes revisar.",
      critical: "Atención: se detectaron posibles invenciones. Regenera antes de exportar.",
    },
    errors: {
      rateLimit:
        "Has alcanzado el tope de adaptaciones (5/hora). El análisis determinista sigue disponible.",
      blocked:
        "El CV adaptado tiene invenciones que no estaban en el original. Regenera la adaptación.",
      unavailable:
        "La adaptación con IA no está disponible temporalmente. Intenta de nuevo en unos minutos.",
      generic: "Ocurrió un error inesperado. Intenta de nuevo.",
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
    },
    delta: {
      title: "Cambios aplicados",
      empty: "No se detectaron cambios.",
      hardLabel: "Hard",
      softLabel: "Soft",
    },
    cta: {
      regenerate: "Regenerar con prompt estricto",
    },
    exportGate: {
      title: "No podemos exportar este CV todavía",
      detail:
        "El validador detectó {count} invención(es) Hard (entidades que no estaban en tu CV original). El export a PDF está bloqueado por Constitution Art. I hasta que regeneres la adaptación.",
      regenerate: "Regenerar adaptación",
    },
    paymentRequired: {
      title: "Créditos insuficientes",
      detail:
        "Te quedaste sin créditos. Cada adaptación usa 1 crédito. Comprá más para seguir adaptando tu CV.",
      buy: "Comprar más créditos",
      cancel: "Cancelar",
    },
  },
  credits: {
    singular: "1 crédito = 1 adaptación",
    plural: "1 crédito = 1 adaptación",
    remaining: (n: number) => `Te quedan ${n} ${n === 1 ? "crédito" : "créditos"}`,
    none: "Sin créditos — comprá más para adaptar tu CV",
    refunded: "Tus créditos fueron reintegrados",
  },
  export: {
    button: "Descargar PDF",
    buttonLoading: "Generando PDF…",
    filenameHint: "cv-adapted-{date}.pdf",
    success: "Descarga iniciada",
    errors: {
      rateLimit:
        "Has alcanzado el tope de exportaciones (20/hora). El análisis determinista y la adaptación siguen disponibles.",
      blocked:
        "El CV adaptado tiene invenciones que no estaban en el original. Regenera la adaptación antes de exportar.",
      unavailable:
        "La generación de PDF no está disponible temporalmente. Intenta de nuevo en unos minutos.",
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
      generic: "Ocurrió un error al generar el PDF. Intenta de nuevo.",
    },
    retry: "Reintentar",
  },
  import: {
    page: {
      title: "Carga tu CV",
      subtitle:
        "Sube un PDF o DOCX y extraemos el texto para que no tengas que copiar a mano.",
      maxSize: "Tamaño máximo: 5 MB.",
      supportedFormats:
        "PDF o DOCX, máx. 5 MB. El PDF debe tener texto seleccionable (no una foto o escaneo).",
      manualFallbackTitle: "¿Tu CV es un escaneo o imagen?",
      manualFallbackDescription: "Pegá el texto de tu CV acá y continuamos igual.",
      manualFallbackCta: "Pegar texto manualmente",
      manualFallbackContinue: "Analizar este texto",
      metaDescription:
        "Subí tu CV en PDF o DOCX y extraemos el texto para que no tengas que copiar a mano. Sin garantías, sin guardado: se procesa y se descarta.",
      dragHere: "Arrastra tu CV aquí",
      dragHereHint: "Arrastra o selecciona un archivo PDF o DOCX. Tamaño máximo: 5 MB.",
      or: "o",
      clickToSelect: "haz click para seleccionar un archivo",
    },
    uploadTitle: "Opción 1: subí un archivo",
    uploadDescription: "Aceptamos PDF o DOCX con texto seleccionable. Si tu PDF es una foto o escaneo, usá la opción 2.",
    states: {
      idle: "Selecciona un archivo",
      loading: "Extrayendo texto…",
      success: "CV listo para analizar",
      error: "No pudimos procesar el archivo",
    },
    successPreview: "Vista previa del texto extraído:",
    buttonAnalyze: "Analizar este CV ahora",
    buttonUploadAnother: "Subir otro archivo",
    buttonUseInEditor: "Usar este texto en el editor",
    handoffHint: "Listo — abrir el editor con este texto pre-poblado.",
    sections: {
      title: "Secciones detectadas",
      confidenceHigh: "Alta confianza",
      confidenceLow: "Baja confianza (revisar)",
      empty: "No se detectaron secciones. Podrás marcarlas manualmente en el editor.",
    },
    warnings: {
      title: "Avisos del parseo",
      close: "Cerrar",
      empty: "Sin avisos.",
    },
    errors: {
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
      clientValidation: "El archivo no es válido. Revisa el tipo y el tamaño.",
      tooLarge: "El archivo supera el límite de 5 MB.",
      unsupportedMime: "Tipo de archivo no soportado. Sube un PDF o DOCX.",
      validation: "El backend rechazó el archivo. Revisa el detalle del error.",
      engine:
        "El servicio de import no está disponible temporalmente. Intenta de nuevo en unos minutos.",
      scannedPdfDetailed:
        "Este PDF parece una imagen o escaneo: no podemos extraer texto automáticamente. Probá con un PDF que tenga texto seleccionable, o pegá el texto manualmente.",
      rateLimit:
        "Has alcanzado el tope de importaciones (30/hora). El análisis determinista y la adaptación siguen disponibles.",
      unknown: "Ocurrió un error al procesar el archivo. Intenta de nuevo.",
    },
  },
  editor: {
    page: {
      title: "Editar tu borrador",
      subtitle:
        "Edita las 8 secciones de tu CV. Tu borrador se guarda solo en este dispositivo.",
      noHandoff: "Empezaste un borrador en blanco. Pega o tipea el contenido de tu CV.",
    },
    entityBadge: {
      importedLabel: "Detectado en tu import",
      userTypedLabel: "Tipeado por ti",
    },
    toolbar: {
      save: "Guardar borrador",
      saved: "Guardado",
      saving: "Guardando…",
      dirty: "Sin guardar",
      rescore: "Re-puntuar",
      rescoreLoading: "Re-puntuando…",
      exportMd: "Exportar Markdown",
      clear: "Limpiar borrador",
    },
    sections: {
      profile: "Perfil",
      experience: "Experiencia",
      education: "Educación",
      skills: "Habilidades",
      projects: "Proyectos",
      certifications: "Certificaciones",
      languages: "Idiomas",
      other: "Otros",
    },
    placeholders: {
      profileFullName: "Tu nombre completo",
      profileHeadline: "Ej. Backend Developer",
      profileEmail: "tu@email.com",
      profilePhone: "+57 300 123 4567",
      profileLocation: "Ciudad, país",
      profileLinkLabel: "Etiqueta (LinkedIn, GitHub, …)",
      profileLinkUrl: "https://…",
      profileSummary: "Resumen profesional de 2-3 líneas.",
      experienceRole: "Cargo",
      experienceCompany: "Empresa",
      experienceStart: "Fecha inicio (YYYY-MM)",
      experienceEnd: "Fecha fin (YYYY-MM o vacío si trabajas aquí)",
      experienceLocation: "Ciudad",
      experienceBullet: "Un logro o responsabilidad",
      experienceTech: "Una tecnología",
      educationDegree: "Título",
      educationInstitution: "Institución",
      educationStart: "Fecha inicio (YYYY-MM)",
      educationEnd: "Fecha fin (YYYY-MM)",
      educationLocation: "Ciudad",
      educationDescription: "Descripción breve",
      skillsCategory: "Categoría (Backend, Cloud, …)",
      skillsItem: "Una habilidad",
      projectName: "Nombre del proyecto",
      projectDescription: "Qué hiciste y qué impacto tuvo",
      projectTech: "Una tecnología",
      projectLink: "https://…",
      certificationName: "Nombre de la certificación",
      certificationIssuer: "Emisor",
      certificationDate: "Fecha (YYYY-MM)",
      certificationCredentialId: "ID de credencial (opcional)",
      languageName: "Idioma",
      otherTitle: "Título (Publicaciones, Voluntariado, …)",
      otherContent: "Contenido libre",
    },
    confirm: {
      clearDraft: {
        title: "¿Borrar todo tu borrador local?",
        detail: "Esta acción no se puede deshacer. Tu CV se eliminará de este navegador.",
        cancel: "Cancelar",
        confirm: "Sí, limpiar",
      },
    },
    toasts: {
      saved: "Borrador guardado",
      cleared: "Borrador eliminado",
      rescoreSuccess: "Puntaje actualizado",
      rescoreFailed: "No pudimos re-puntuar",
      exported: "Markdown exportado",
    },
    errors: {
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
      storage: "No pudimos guardar el borrador. Usa el modo normal del navegador.",
      validation: "Hay campos con datos inválidos. Revisa los marcadores.",
      jobTextRequired: "Necesitamos la vacante para re-puntuar.",
    },
  },
  diff: {
    page: {
      title: "Revisa la adaptación",
      subtitle:
        "Compara tu CV original con el adaptado. Los términos marcados en rojo pueden ser invenciones de la IA — revísalos uno por uno antes de aceptar.",
      noInventions: "Sin invenciones detectadas. CV lista para revisar.",
      expired: "La adaptación expiró. Vuelve a solicitarla en /analizar.",
      noHandoff: "No hay una adaptación reciente. Empieza en /analizar y selecciona 'Adaptar con IA'.",
      emptyAdapted: "La adaptación no produjo texto. Intenta de nuevo.",
      loadError: "No pudimos cargar la adaptación. Vuelve a intentarlo.",
    },
    modes: {
      unified: "Unificado",
      sideBySide: "Lado a lado",
      toggle: "Cambiar modo de visualización",
    },
    invention: {
      soft: "Advertencia: métrica o detalle que puede no estar en tu CV original.",
      hard: "Invención: este término no aparece en tu CV original.",
      badgeLabel: "Advertencia: invención detectada",
      softTooltip: "Revisa este término — puede no estar en tu CV original.",
      hardTooltip: "Esto puede ser una invención de la IA. Confírmalo o edítalo antes de aceptar.",
      edit: "Editar",
      keep: "Mantener",
      cancel: "Cancelar",
      confirm: "Confirmar",
    },
    actions: {
      accept: "Aceptar y exportar",
      edit: "Editar en el editor",
      reject: "Rechazar y re-prompt",
      rescore: "Re-puntuar",
      rescoreLoading: "Re-puntuando…",
      acceptAnyway: "Aceptar de todos modos",
      reviewFirst: "Revisarlas primero",
      rejectToast: "Adaptación rechazada. Vuelve a solicitar con nuevas instrucciones.",
    },
    modal: {
      hardTitle: "Tienes invenciones Hard sin revisar",
      hardDetail:
        "Hay {count} término(s) marcados como posible invención que no has confirmado. ¿Aceptar la adaptación de todos modos o revisarlos primero?",
    },
    score: {
      lastScore: "Último puntaje",
      before: "Antes",
      after: "Después",
    },
    regions: {
      view: "Visor de diff entre tu CV original y el adaptado",
      original: "Columna CV original",
      adapted: "Columna CV adaptado",
    },
    errors: {
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
      rateLimit: "Has alcanzado el tope de re-puntuaciones. Espera un momento.",
      validationFailed: "El servidor rechazó la adaptación. Regenera el CV.",
      storage: "No pudimos leer la adaptación de este navegador. Vuelve a solicitarla.",
    },
  },
  emptyStates: {
  analyze: {
    title: "Empezá pegando tu CV y la vacante",
    description:
      "Solo texto. No guardamos nada; se procesa en memoria y se descarta al responder.",
    primaryCta: "Ver cómo importar un CV",
  },
  iterate: {
    title: "Necesitamos tu CV y la vacante para iterar",
    description:
      "Importá un CV o pegá el texto directamente junto con la descripción de la vacante.",
    primaryCta: "Importar CV",
  },
  subscriptions: {
    title: "Iniciá sesión para ver tu plan",
    description: "Las suscripciones y los créditos están vinculados a tu cuenta.",
    primaryCta: "Iniciar sesión",
  },
},
landing: {
    faqs: [
      {
        q: "¿BuildCv guarda mi CV o la vacante?",
        a: "No. En v0 el texto se procesa en memoria en el backend y se descarta al responder. La única persistencia es tu borrador local en este navegador, y solo si lo guardas tú.",
      },
      {
        q: "¿La adaptación con IA puede inventar contenido?",
        a: "No. Tenemos un validador de invenciones Hard (entidades que no estaban en tu CV original) que bloquea la exportación hasta que se resuelvan. La IA puede reescribir, pero no añadir experiencia.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Es gratis en v0. No pedimos tarjeta, no hay trial, no hay upsell. Si en el futuro hay planes pagos, se anunciarán antes con transparencia.",
      },
      {
        q: "¿Funciona en móvil?",
        a: "Sí. El diseño es responsive y las tres rutas principales (/, /analizar, /importar) están optimizadas para touch.",
      },
      {
        q: "¿Puedo exportar mi CV a PDF?",
        a: "Sí, después de adaptar tu CV. La exportación a PDF está bloqueada solo si el validador detecta invenciones Hard (texto añadido por la IA que no estaba en tu CV original).",
      },
      {
        q: "¿Qué pasa con mis datos si el backend falla?",
        a: "El backend procesa tu CV en memoria. Si la respuesta falla, los datos ya se descartaron. No hay colas, no hay retries persistentes, no hay logs con tu CV.",
      },
    ],
    trust: {
      openSource: {
        label: "Código abierto",
        href: "https://github.com/buildcv-co/BuildCv-web",
      },
      constitution: {
        label: "Constitution v1.1.0 ratificada",
        href: "/constitution",
      },
      tests: {
        label: "540 tests automatizados · 0 supresiones",
        count: 540,
      },
    },
    notFound: {
      title: "Página no encontrada",
      detail: "La ruta que buscás no existe o fue movida.",
      backHome: "Volver al inicio",
      backAnalyze: "Ir a analizar",
    },
    serverError: {
      title: "Algo se rompió",
      detail: "No es tu culpa. Estamos mirando qué pasó.",
      retry: "Reintentar",
      backHome: "Volver al inicio",
    },
    globalError: {
      title: "Error grave",
      detail: "La aplicación no pudo cargar. Probá recargar o volver al inicio.",
      reload: "Recargar",
      backHome: "Volver al inicio",
    },
  },
  observability: {
    devOverlay: {
      title: "Panel de errores en desarrollo",
      emptyHint: "Sin errores todavía.",
      dismissLabel: "Descartar panel",
      copyStackLabel: "Copiar stack",
      disclaimer:
        "Errores locales (no se envían a terceros). En este navegador.",
    },
    errorBoundary: {
      title: "Algo se rompió en este componente",
      detail:
        "El resto de la aplicación sigue funcionando. Probá reintentar o volvé al inicio.",
      retryLabel: "Reintentar",
    },
  },
  signIn: {
    intro: "Iniciá sesión para guardar tu progreso entre sesiones.",
    errorPrefix: "No pudimos iniciar sesión",
    continueWithGoogle: "Continuar con Google",
    continueWithLinkedIn: "Continuar con LinkedIn",
  },
  subscription: {
    activeTitle: "Suscripción activa",
    canceledTitle: "Suscripción cancelada",
    renewsAutomatically: "Se renueva automáticamente cada mes.",
    planLabel: "Plan",
    nextCharge: "Próximo cobro",
    canceledAt: "Cancelada el",
    accessUntil: "Acceso hasta {date}",
    planStarter: "30 créditos por $30.000 COP",
    planStandard: "100 créditos por $80.000 COP (33% más barato que comprar 2 packs Standard)",
    savingsVsOneTime: "33% de descuento vs compra única",
    noRefund: "Sin reembolso al cancelar",
    subscribeCta: "Suscribirme",
    cancelCta: "Cancelar suscripción",
    confirmCancelTitle: "¿Cancelar la suscripción?",
    confirmCancelBody: "Vas a conservar los créditos ya pagados hasta el final del período actual. No hacemos reembolso del mes en curso.",
    confirmCancelConfirm: "Sí, cancelar",
    confirmCancelKeep: "No, mantener",
    errorDisabled: "Las suscripciones están deshabilitadas por ahora.",
    errorAlreadyActive: "Ya tenés una suscripción activa.",
    errorGeneric: "No pudimos procesar la suscripción. Intentá de nuevo.",
    errorCancel: "No pudimos cancelar la suscripción. Intentá de nuevo.",
  },
  iteration: {
    title: "Iteración de adaptación",
    subtitle:
      "Generando la mejor versión de tu CV para esta vacante — corremos N adaptaciones y elegimos la mejor según compatibilidad y legibilidad.",
    controls: {
      iterationsLabel: "Iteraciones",
      iterationsHint: "Entre 1 y 20. Más iteraciones gastan más créditos.",
      thresholdLabel: "Umbral de probabilidad",
      thresholdHint: "Porcentaje mínimo de coincidencia para no mostrar advertencia.",
      creditsNeeded: (n: number) => `Créditos necesarios: ${n}`,
    },
    confirm: {
      title: "¿Iniciar iteración?",
      detail: (n: number) =>
        `Esto consumirá ${n} ${n === 1 ? "crédito" : "créditos"} de tu cuenta. La operación no se puede deshacer.`,
      confirm: "Sí, iniciar",
      cancel: "Cancelar",
    },
    progress: {
      title: "Iterando",
      iterationOf: (current: number, total: number) => `Iteración ${current} de ${total}`,
      ariaLive: "Estado de la iteración en curso.",
    },
    result: {
      bestStepTitle: "Mejor versión encontrada",
      scoreLabel: "Compatibilidad",
      otherStepsTitle: "Ver otros intentos",
      exportPdf: "Descargar PDF",
      allFailed: "Mejores resultados requieren mayor compatibilidad",
    },
    warning: {
      compatibility: (score: number, threshold: number) =>
        `Tu compatibilidad con esta vacante es del ${score}% (umbral: ${threshold}%). Considera mejorar tu CV antes de aplicar o buscar vacantes más afines.`,
      suggestionsTitle: "Ver sugerencias",
      suggestions: [
        "Añade habilidades concretas del texto de la vacante que ya tengas en tu experiencia.",
        "Reescribe logros con métricas cuantificables (%, tiempo, escala).",
        "Pide una iteración con una versión ligeramente distinta del CV como entrada.",
      ],
      improveCta: "Mejorar mi CV en el editor",
    },
    errors: {
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
      insufficient: "Créditos insuficientes para correr esta iteración.",
      validation: "Revisa el texto: la vacante o el CV están vacíos o son demasiado cortos.",
      rateLimit: "Has alcanzado el tope de iteraciones (10/hora). Probá de nuevo más tarde.",
      generic: "Ocurrió un error inesperado. Intenta de nuevo.",
    },
  },
} as const;

export type Copy = typeof copy;
