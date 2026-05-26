/**
 * Contenido literal de los Términos y Condiciones del Programa de Regularización
 * validado por el equipo legal de VEMO Impulso (versión 22 de mayo de 2026).
 *
 * NO modificar sin aprobación legal.
 */

export type TycBlock =
  /** Encabezado romano: "I. Objeto del Programa de Regularización". */
  | { type: "h2"; text: string }
  /** Subtítulo en negrita en línea: `"Beneficio-Condonación Peso por Peso":` */
  | { type: "h3"; text: string }
  /** Párrafo común. */
  | { type: "p"; text: string }
  /** Lista. Si `ordered=true` se numera 1, 2, 3, … */
  | { type: "list"; ordered?: boolean; items: string[] };

export const TYC_TITLE = "TÉRMINOS Y CONDICIONES DEL PROGRAMA DE REGULARIZACIÓN";
export const TYC_DATE = "Fecha de publicación: 22 de mayo de 2026";

export const TYC_BLOCKS: TycBlock[] = [
  // ── I. Objeto del Programa ──────────────────────────────────────
  { type: "h2", text: "I. Objeto del Programa de Regularización" },
  {
    type: "p",
    text:
      "Financiera por el Impulso Económico, S.A. de C.V., SOFOM, E.N.R. (“VEMO Impulso”), invita a aquellos Clientes que cumplan con los requisitos previstos en los presentes términos y condiciones (los “Clientes Elegibles”), a presentar una Solicitud de Regularización (según se define más adelante), conforme a lo establecido en el presente Programa de Regularización (el “Programa”).",
  },
  {
    type: "p",
    text:
      "La presente comunicación y su contenido no pueden entenderse como oferta o como aceptación a la propuesta o solicitud que, en su caso, formulen los Clientes Elegibles; sino que, en todo caso, deberá entenderse como una mera invitación por parte de VEMO Impulso a la presentación de una Solicitud de Regularización por parte de los Clientes Elegibles.",
  },
  {
    type: "p",
    text:
      "Los términos utilizados con mayúscula inicial que se utilicen, pero que no se encuentren expresamente definidos en los presentes términos y condiciones, tendrán el significado que se les atribuye en el contrato de arrendamiento financiero celebrado entre el Cliente y VEMO Impulso en los términos sustancialmente iguales a los del Contrato de Arrendamiento Financiero registrado ante la Comisión Nacional para la Protección y Defensa de los Usuarios de Servicios Financieros en el Registro de Contrato de Adhesión (el \"Contrato\").",
  },
  {
    type: "p",
    text:
      "El otorgamiento del Beneficio de Regularización al Cliente es puramente discrecional por parte de VEMO Impulso.",
  },

  // ── II. Definiciones ────────────────────────────────────────────
  { type: "h2", text: "II. Definiciones" },
  {
    type: "p",
    text:
      "\"Adeudo a Regularizar\": significa la cantidad equivalente a la suma de los conceptos que se describen a continuación conforme al Contrato, a la Fecha de la Solicitud de Regularización: (i) cualesquier impuestos derivados del Contrato; (ii) cualesquier gastos o comisión derivado del Contrato, (iii) intereses moratorios e intereses ordinarios vencidos, (iv) capital vencido y no pagado, partiendo de la amortización más antigua a la más reciente; y Rentas vencidas.",
  },
  {
    type: "p",
    text: "Para efectos de claridad, el Adeudo a Regularizar No incluye saldos no vencidos.",
  },
  {
    type: "p",
    text:
      "\"Anexo de Condiciones Específicas\": significa el alcance de los Beneficios elegibles que VEMO Impulso informa al Cliente, en el cual se establecerán los montos, cálculos, términos y condiciones particulares aplicables conforme al Contrato correspondiente y a la presente Promoción, incluyendo de manera enunciativa mas no limitativa: (i) el Adeudo a Regularizar, (ii) el Pago de Intención, (iii) la Condonación aplicable, (iv) el Saldo Deudor Remanente y, (v) el tipo de Beneficio asignado al Cliente.",
  },
  {
    type: "p",
    text:
      "El Cliente reconoce y acepta que el Anexo de Condiciones Específicas formará parte integrante de la Solicitud de Regularización y, eventualmente, del Acuerdo de Regularización que se alcance por la Aceptación de la Solicitud de Regularización que VEMO Impulso otorgue discrecionalmente, y será vinculante para las partes una vez realizada dicha Aceptación a través de cualquiera de los medios autorizados para tal efecto.",
  },
  {
    type: "p",
    text:
      "\"App VEMO Impulso\": significa la aplicación móvil de VEMO Impulso, disponible para dispositivos con sistemas operativos iOS y Android, mediante la cual el Cliente podrá gestionar y consultar información relacionada con su Contrato, realizar pagos, aceptar términos y condiciones, recibir notificaciones, comunicaciones y documentos emitidos por VEMO Impulso, así como acceder a funcionalidades y servicios relacionados con la presente Promoción y demás productos o servicios ofrecidos por VEMO Impulso.",
  },
  {
    type: "p",
    text:
      "\"Beneficio\": significa cualquiera de los siguientes: (i) Condonación Peso por Peso, (ii) Otorgamiento de Crédito simple para cancelación del Saldo Deudor Remanente según corresponda, de conformidad con el Saldo Deudor Remanente resultante, el plazo restante del Contrato y las condiciones de la Sección IV, que VEMO Impulso puede otorgar discrecionalmente en beneficio del Cliente conforme los presentes términos y condiciones.",
  },
  {
    type: "p",
    text:
      "El Beneficio aplicable al Cliente, así como sus montos, condiciones y mecánica específica de aplicación, se señalarán en el Anexo de Condiciones Específicas correspondiente.",
  },
  {
    type: "p",
    text:
      "\"Condonación\": significa el acto jurídico por el cual VEMO Impulso condona en favor del Cliente un importe parcial del Adeudo a Regularizar, el cual será por una suma igual al monto del Pago de Intención realizado por el Cliente.",
  },
  {
    type: "p",
    text:
      "\"Contrato de Crédito Simple\": significa el instrumento jurídico mediante el cual VEMO Impulso y el Cliente suscriben un crédito simple para el otorgamiento del Beneficio que otorga VEMO Impulso al Cliente, a su discreción.",
  },
  {
    type: "p",
    text:
      "\"Acuerdo de Regularización\" o \"Acuerdo\": significa el instrumento jurídico resultante de la Solicitud de Regularización y la Aceptación de dicha solicitud, mediante el cual VEMO Impulso y el Cliente suscriben el otorgamiento de los Beneficios por parte de VEMO Impulso al Cliente derivado de la Solicitud de Regularización presentada por el Cliente y la Aceptación de la Solicitud de Regularización emitida por VEMO conforme los presentes Términos y Condiciones.",
  },
  {
    type: "p",
    text:
      "El Acuerdo de Regularización no sustituye, modifica, extingue, reestructura, nova ni altera de forma alguna los términos, condiciones, obligaciones o derechos que deban de subsistir conforme al referido Contrato original y únicamente modifica lo expresamente establecido en el Acuerdo.",
  },
  {
    type: "p",
    text:
      "\"Fecha de Solicitud de Regularización\": significa la fecha en que el Cliente realiza su Solicitud de Regularización para participar en el Programa de Regularización, solicitando que VEMO Impulso ponga a su disposición la Oferta de Regularización.",
  },
  {
    type: "p",
    text:
      "\"Solicitud de Regularización\": significa la oferta que presenta el Cliente Elegible a VEMO Impulso para suscribir un Acuerdo de Regularización, en el entendido de que el contenido de estos Términos y Condiciones del Programa de Regularización forman parte integrante de la Solicitud de Regularización por referencia. Asimismo, la Solicitud incluirá el Anexo de Condiciones Específicas que contenga los montos, cálculos, términos y el Beneficio aplicable conforme a su Contrato.",
  },
  {
    type: "p",
    text:
      "\"Aceptación de la Solicitud de Regularización\": significa la aceptación de VEMO Impulso a la Solicitud de Regularización presentada por el Cliente Elegible. La Solicitud de Regularización juntamente con la Aceptación de la Solicitud de Regularización conforman el Acuerdo de Regularización.",
  },
  {
    type: "p",
    text:
      "\"Fecha de Aceptación de la Solicitud de Regularización\": significa la fecha en que VEMO Impulso acepta y manifiesta formalmente su consentimiento para suscribir el Acuerdo de Regularización.",
  },
  {
    type: "p",
    text:
      "La aceptación se entenderá como válidamente formalizada mediante la firma electrónica, o mediante la aceptación digital realizada por el Cliente a través de la App VEMO Impulso, la cual producirá los mismos efectos jurídicos que una firma autógrafa, de conformidad con la legislación aplicable.",
  },
  {
    type: "p",
    text:
      "\"Fecha de Cierre\": significa la fecha límite establecida por VEMO Impulso para la recepción de Solicitudes de Regularización, conforme a lo previsto en la Sección IX de Vigencia, de los presentes términos y condiciones.",
  },
  {
    type: "p",
    text:
      "\"Notificación de la Aceptación de la Solicitud de Regularización\": significa la comunicación emitida por VEMO Impulso mediante la cual se informa y confirma al Cliente la aceptación de la Solicitud de Regularización.",
  },
  {
    type: "p",
    text:
      "La Notificación de la Aceptación podrá realizarse a través de la App VEMO Impulso, del correo electrónico registrado por el Cliente o mediante cualquier otro medio de comunicación autorizado conforme al Contrato y los presentes términos y condiciones.",
  },
  {
    type: "p",
    text:
      "La falta de recepción, lectura o consulta de la Notificación de la Aceptación por causas atribuibles o imputables al Cliente, incluyendo información de contacto incorrecta, desactualizada o fallas atribuibles a sus dispositivos, servicios de comunicación o proveedores, no afectará la validez, eficacia ni exigibilidad de los Beneficios ya aplicados por VEMO Impulso.",
  },
  {
    type: "p",
    text:
      "\"Pago de Intención\": significa el monto que se pacte en el Acuerdo de Regularización que el Cliente deberá pagar a VEMO Impulso en el plazo que se indique en dicho Acuerdo.",
  },
  {
    type: "p",
    text:
      "\"Saldo Deudor Remanente\": significa el monto resultante de restar al Adeudo a Regularizar: (i) el Pago de Intención realizado por el Cliente y (ii) la Condonación aplicada por VEMO Impulso conforme al Anexo de Condiciones Específicas en los términos del Programa de Regularización.",
  },
  {
    type: "p",
    text:
      "\"Parcialidad Semanal\" o \"Semanalidad\": significa el monto correspondiente a la renta semanal ordinaria a cargo del Cliente pactada en el Contrato, cuyo importe, periodicidad y condiciones de pago se encuentran establecidos en la carátula y en las demás disposiciones aplicables del propio Contrato.",
  },

  // ── III. Elegibilidad y Exclusiones ─────────────────────────────
  { type: "h2", text: "III. Elegibilidad y Exclusiones" },
  {
    type: "p",
    text:
      "Podrán participar en el Programa de Regularización aquellas personas físicas que cumplan íntegramente con la totalidad de los siguientes requisitos (los \"Clientes Elegibles\"):",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "Contar con un Contrato vigente, celebrado con anterioridad al 18 de mayo de 2026.",
      "Que el Adeudo a Regularizar sea de un monto mínimo de $5,000.00 M.N. (cinco mil pesos 00/100 Moneda Nacional).",
      "Presentar un atraso en el cumplimiento de sus obligaciones de pago derivadas del Contrato, de entre 15 (quince) y 120 (ciento veinte) días naturales a la Fecha de Solicitud de Regularización, contados a partir de la fecha de la primera renta semanal vencida y no pagada, siempre y cuando el adeudo se haya generado previo al 25 de mayo de 2026.",
      "Mantener vigente, activa y operativa, una cuenta como socio conductor o conductor en plataformas de movilidad operadas por Uber B.V. (\"Uber\") y/o por DiDi Mobility Mexico, S.A. de C.V., (\"DiDi\", y conjuntamente con Uber, las \"Plataformas\"), en la cual el vehículo objeto del Contrato (el \"Vehículo Arrendado\") se encuentre debidamente registrado, habilitado y autorizado para la prestación de servicios de transporte.",
      "Haber generado, con el Vehículo Arrendado, un mínimo de 60 (sesenta) viajes semanales en las Plataformas durante la semana inmediata anterior a la Fecha de Solicitud de Regularización, computados de manera acumulada entre todas las Plataformas en las que opere el Cliente.",
      "Autorizar y mantener vigente, durante todo el plazo del Acuerdo de Regularización, la conexión de la cuenta o cuentas del Cliente en las Plataformas con los sistemas de VEMO Impulso a través de las interfaces de programación de aplicaciones (APIs) que las Plataformas pongan a disposición, permitiendo a VEMO Impulso el acceso en tiempo real a la información relativa a viajes, ingresos y demás datos operativos generados por el Cliente en las Plataformas (la \"Información Operativa\") de conformidad con el tratamiento de datos personales previsto en la Sección VIII de los presentes términos y condiciones. Tratándose de cuentas vinculadas con la Plataforma DiDi, el Cliente deberá adicionalmente completar y mantener vigente la firma del instrumento, vínculo o autorización electrónica correspondiente que permita la correcta sincronización y acceso a la Información Operativa por parte de VEMO Impulso.",
    ],
  },
  {
    type: "p",
    text:
      "No podrán presentar Solicitudes de Regularización aquellos Clientes que se ubiquen en cualquiera de los siguientes supuestos:",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "Aquellos cuyos ingresos verificables, determinados conforme a la Información Operativa y demás mecanismos de validación utilizados por VEMO Impulso, resulten inferiores a 1.5 (uno punto cinco) veces el monto de la Semanalidad ordinaria vigente bajo el Contrato.",
      "Aquellos respecto de quienes el Vehículo Arrendado se encuentre inactivo, fuera de operación, suspendido o no habilitado para prestar servicios en ninguna de las Plataformas a la Fecha de Solicitud de Regularización.",
      "Aquellos que, a la Fecha de Solicitud de Regularización, se encuentren sujetos a un procedimiento de recuperación extrajudicial o judicial iniciada por VEMO Impulso con motivo del incumplimiento de las obligaciones derivadas del Contrato.",
    ],
  },

  // ── IV. Beneficios del Programa ────────────────────────────────
  { type: "h2", text: "IV. Beneficios del Programa" },
  {
    type: "p",
    text:
      "VEMO Impulso podrá conceder Beneficios al Cliente que cumpla íntegramente con los requisitos de elegibilidad previstos en la Sección III de los presentes términos y condiciones, y que se adhiera al Programa de Regularización conforme a los términos, plazos y condiciones establecidos en la presente Sección.",
  },
  {
    type: "p",
    text:
      "El tipo específico de Beneficio elegible para cada Cliente será determinado por VEMO Impulso con base en las condiciones financieras y criterios previstos en los presentes términos y condiciones, incluyendo las modalidades de Condonación Peso por Peso y, en su caso, Otorgamiento de Crédito Simple, según corresponda.",
  },
  {
    type: "p",
    text:
      "VEMO informará al Cliente que manifieste interés en presentar una Solicitud de Regularización para cuál Beneficio o Beneficios es elegible, así como las especificaciones del potencial Beneficio a solicitar según el Adeudo a Regularizar, monto restructurado del Adeudo a Regularizar, plazo y frecuencia de pago, entre otros.",
  },
  { type: "h3", text: "\"Beneficio-Condonación Peso por Peso\":" },
  {
    type: "p",
    text:
      "es el Beneficio por el cual, como resultado de un Pago de Intención realizado por el Cliente, VEMO Impulso aplica una Condonación parcial sobre el Adeudo a Regularizar por un monto igual Pago de Intención.",
  },
  {
    type: "p",
    text:
      "En caso de que el Saldo Deudor Remanente resulte en $0.00 M.N. (cero pesos 00/100 moneda nacional), se tendrá por cancelado en su totalidad, sin que se genere cargo adicional alguna al Cliente.",
  },
  { type: "h3", text: "\"Beneficio-Otorgamiento de Crédito Simple\":" },
  {
    type: "p",
    text:
      "es el Beneficio que VEMO Impulso podrá otorgar al Cliente cuando, una vez de aplicada la Condonación Peso por Peso, del Adeudo a Regularizar resulte un Saldo Deudor Remanente.",
  },
  {
    type: "p",
    text:
      "En este supuesto, el Cliente podrá solicitar el otorgamiento de un Crédito Simple, a una tasa de interés ordinario anual, fija y simple del 0% (cero por ciento), cuyo monto será destinado por el Cliente al pago del Saldo Deudor Remanente del Adeudo a Regularizar.",
  },
  {
    type: "p",
    text:
      "El Cliente se obliga a amortizar el monto del Crédito Simple mediante abonos semanales, iguales y consecutivos, en los plazos señalados en la Tabla de Amortización del Crédito Simple, pudiéndose prever:",
  },
  {
    type: "list",
    items: [
      "(i) la realización pagos semanales de montos iguales y consecutivos, cuyo vencimiento coincidirá con la Semanalidad ordinaria prevista en el Contrato y cuyas parcialidades serán por un monto igual o menor a $200.00 M.N. (doscientos pesos 00/100 moneda nacional).",
      "(ii) la realización pagos semanales de montos iguales y consecutivos, cuyo vencimiento coincidirá con la Semanalidad ordinaria prevista en el Contrato y cuyas parcialidades serán por un monto de $200.00 M.N. (doscientos pesos 00/100 moneda nacional), y un Pago Residual, el cual será exigible al vencimiento del Contrato de Crédito Simple.",
    ],
  },
  { type: "h3", text: "Mecánica de obtención del Beneficio:" },
  {
    type: "p",
    text:
      "Paso 1.- VEMO Impulso contacta al Cliente y le hace saber que es elegible para el Programa de Regularización:",
  },
  {
    type: "list",
    items: [
      "(i) VEMO Impulso podrá contactar al Cliente a través de cualquiera de los canales habilitados para tal efecto, incluyendo la App VEMO Impulso, correo electrónico o WhatsApp, a fin de informarle sobre su posible elegibilidad para solicitar el Beneficio.",
      "(ii) En caso de que el Cliente manifieste interés en presentar una Solicitud de Regularización, VEMO Impulso pondrá a disposición del Cliente, para su revisión, los presentes términos y condiciones y el Anexo de Condiciones Específicas correspondiente donde se indicarán los montos, condiciones y términos específicos correspondientes al Cliente.",
    ],
  },
  {
    type: "p",
    text:
      "Paso 2.- El Cliente presenta su Solicitud de Regularización incluyendo los presentes Términos y Condiciones que se integran a dicha Solicitud por referencia y el Anexo de Condiciones Específicas.",
  },
  {
    type: "p",
    text:
      "Paso 3.- VEMO a su sola discreción, acepta la Solicitud de Regularización que incluye las Condiciones Específicas, quedando así suscrito el Acuerdo de Regularización en la Fecha de Aceptación de la Solicitud de Regularización.",
  },
  {
    type: "p",
    text:
      "Paso 4.- El Cliente realiza el Pago de Intención correspondiente indicado en su Anexo de Condiciones Específicas a más tardar en la fecha indicada correspondiente a esa misma semana.",
  },
  {
    type: "p",
    text:
      "El Pago de Intención deberá ser, en todo caso, igual o superior a $5,000.00 M.N. (cinco mil pesos 00/100 moneda nacional) y no podrá exceder del 50% (cincuenta por ciento) del Adeudo a Regularizar aplicable al Cliente.",
  },
  {
    type: "p",
    text:
      "El Pago de Intención se tendrá por realizado únicamente en la fecha en que los recursos correspondientes sean efectivamente recibidos, aplicados y confirmados por VEMO Impulso en sus sistemas internos.",
  },
  {
    type: "p",
    text:
      "Paso 5: VEMO Impulso verifica el Pago de Intención, otorga el Beneficio según el Acuerdo de Regularización, conforme a lo siguiente: (i) dentro de los 5 (cinco) días hábiles siguientes a la recepción y confirmación del Pago de Intención, VEMO Impulso realizará las siguientes acciones: (i) aplicará de forma automática la Condonación correspondiente, por un monto igual al Pago de Intención efectuado por el Cliente y, en su caso, el Beneficio de Otorgamiento de Crédito Simple, a su sola discreción; y (ii) emitirá la notificación correspondiente a través de la App VEMO Impulso y/o al correo electrónico registrado por el Cliente, mediante la cual confirmará el monto de la Condonación aplicada, el Saldo Remanente resultante y el tipo de Beneficio que corresponda al Cliente conforme al Anexo de Condiciones Específicas aplicable.",
  },
  {
    type: "p",
    text:
      "En su caso, VEMO Impulso otorga el Beneficio de Otorgamiento de Crédito Simple, cuyo importe será destinado por el Cliente al pago del Saldo Deudor Remanente conforme a los criterios establecidos en los presentes términos y condiciones.",
  },
  {
    type: "p",
    text:
      "Paso 6. Como consecuencia del cumplimiento del Acuerdo de Regularización, el Adeudo a Regularizar quedará liquidado en su totalidad.",
  },
  {
    type: "p",
    text:
      "En caso de haberse concedido el Beneficio de Otorgamiento de Crédito Simple, el Cliente quedará obligado al pago de la Tabla de Amortización según los términos del Contrato de Crédito Simple suscrito, sin que se genere obligación adicional alguna relacionada con el Adeudo a Regularizar objeto del Acuerdo de Regularización.",
  },
  {
    type: "p",
    text:
      "Sin perjuicio de todo lo anterior, el Cliente reconoce y acepta que el Acuerdo de Regularización no modifica sus obligaciones en los términos de las obligaciones corrientes y futuras del Contrato, por lo que debe cumplir con el pago ordinario de sus Parcialidades Semanales ordinarias según el Contrato. El Cliente continuará realizando el pago ordinario de la Parcialidad Semanal conforme a los términos, plazos y condiciones originalmente previstos en el Contrato.",
  },

  // ── V. Rescisión ────────────────────────────────────────────────
  { type: "h2", text: "V. Rescisión del Acuerdo de Regularización" },
  {
    type: "p",
    text:
      "Serán causales de rescisión del Acuerdo de Regularización, cualesquiera incumplimientos en que el Cliente incurran respecto de las obligaciones estipuladas en dicho Acuerdo, y en especial las siguientes imputables directamente al Cliente:",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "Que el Cliente no cumpla con el Pago de Intención;",
      "Que el Cliente no cumpla con las obligaciones establecidas en el Contrato de Crédito Simple otorgado por VEMO Impulso bajo el Beneficio de Otorgamiento de Crédito Simple.",
      "Existan elementos razonables, objetivos y documentados que permitan presumir la realización de actos fraudulentos, conductas dolosas, simulación, manipulación o cualquier abuso relacionado con Acuerdo de Regularización;",
      "El Cliente sea sancionado, suspendido, bloqueado, deshabilitado o expulsado de cualquiera de las Plataformas con motivo del incumplimiento a sus políticas, términos o lineamientos aplicables; o",
      "El Cliente sea condenado mediante sentencia firme por la comisión de un delito.",
    ],
  },
  {
    type: "p",
    text:
      "En cualquiera de los supuestos antes señalados, cualquier cantidad pagada por el Cliente será aplicada por VEMO Impulso al Contrato conforme a los términos originalmente previstos en el mismo, sin que ello genere derecho alguno a recibir cualquiera de los Beneficios del Programa de Regularización.",
  },

  // ── VI. Responsabilidad ────────────────────────────────────────
  { type: "h2", text: "VI. Responsabilidad" },
  {
    type: "p",
    text:
      "VEMO Impulso no será responsable por: (i) la suspensión, limitación, modificación, cancelación o falla en la operación de las Plataformas o de sus APIs, ni por interrupciones en la conexión atribuibles a las Plataformas, al Cliente o a terceros; (ii) variaciones en las tarifas dinámicas, demanda de viajes, ingresos del Cliente o cualquier otro factor económico derivado de su operación en las Plataformas; y (iii) errores en el cálculo y aplicación de los Beneficios derivado de información incompleta o inexacta proporcionada por las Plataformas o por el Cliente, en el entendido que VEMO Impulso corregirá cualquier error identificado dentro de los 5 (cinco) días hábiles siguientes a su detección.",
  },
  {
    type: "p",
    text:
      "El Cliente se obliga a sacar en paz y a salvo, así como a indemnizar a VEMO Impulso, sus afiliadas, funcionarios, empleados y representantes, respecto de cualquier reclamación procedimiento, daño, perjuicio, sanción, multa, costo o gasto, incluyendo honorarios razonables de abogados, iniciada por las Plataformas o cualquier otro tercero que derive o se relacione con: (i) el uso indebido por parte del Cliente, sea directamente o a través de interpósitas personas de las APIs o de las Plataformas; (ii) la manipulación, alteración o falsedad de la Información Operativa; o (iii) el incumplimiento por parte del Cliente de los términos, condiciones, políticas o lineamientos aplicables a las Plataformas.",
  },

  // ── VII. Atención a Clientes ───────────────────────────────────
  { type: "h2", text: "VII. Atención a Clientes" },
  {
    type: "p",
    text:
      "El Cliente podrá realizar consultas a través de cualquiera de los siguientes canales oficiales de atención al cliente de VEMO Impulso:",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "Vía correo electrónico: contacto@vemo.com.mx",
      "WhatsApp: 5586055915",
    ],
  },
  {
    type: "p",
    text:
      "Se hace especial mención, que el procedimiento previsto en esta sección aplica única y exclusivamente respecto de la operación del Programa; por lo que en caso de existir alguna consulta, aclaración o reclamación relacionada con el Contrato de arrendamiento y/o el Acuerdo de Regularización financiero celebrado entre el Cliente y VEMO Impulso, prevalecerá el mecanismo o procedimiento previsto en el Contrato.",
  },

  // ── VIII. Protección de Datos ──────────────────────────────────
  { type: "h2", text: "VIII. Protección de Datos Personales" },
  {
    type: "p",
    text:
      "El tratamiento de los datos personales proporcionados por el Cliente en el marco del Programa de Regularización, incluyendo (i) datos de identificación, (ii) datos bancarios (incluyendo CLABE), y (iii) la Información Operativa obtenida a través de las APIs de las Plataformas (incluyendo datos de viajes, ingresos generados en las Plataformas, geolocalización y horarios de operación), se realizará conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y al Aviso de Privacidad Integral de Grupo VEMO, disponible en https://vemovilidad.com/aviso-de-privacidad-mexico/.",
  },
  {
    type: "p",
    text:
      "La finalidad del tratamiento de los datos antes referidos será exclusivamente: (i) verificar el cumplimiento de los criterios de elegibilidad de la Sección III; (ii) calcular y aplicar el Beneficio previsto en la Sección IV; y (iii) atender aclaraciones y reclamaciones conforme a la Sección VII.",
  },

  // ── IX. Vigencia ────────────────────────────────────────────────
  { type: "h2", text: "IX. Vigencia del Programa de Regularización" },
  {
    type: "p",
    text:
      "El Programa de Regularización entrará en vigor a partir del 18 de mayo de 2026 y estará disponible hasta el 20 de julio de 2026 (la \"Fecha de Cierre\"), salvo prórroga o cancelación anticipada por parte de VEMO Impulso.",
  },
  {
    type: "p",
    text:
      "El Programa de Regularización tiene carácter de beneficio por única ocasión, cada Cliente podrá presentar la Solicitud de Regularización a VEMO Impulso en ese rango de fechas, una sola vez y únicamente respecto del Contrato que cumpla los requisitos de la Sección III.",
  },
  {
    type: "p",
    text:
      "VEMO Impulso podrá prorrogar la Fecha de Cierre mediante publicación en su página oficial y/o en la aplicación de VEMO Impulso.",
  },
  {
    type: "p",
    text:
      "VEMO Impulso podrá modificar o cancelar anticipadamente el Programa de Regularización en cualquier momento, mediante publicación en su página oficial y/o en la aplicación de VEMO Impulso.",
  },

  // ── X. Notificaciones ──────────────────────────────────────────
  { type: "h2", text: "X. Notificaciones" },
  {
    type: "p",
    text:
      "Todas las notificaciones, avisos, comunicaciones o requerimientos que VEMO Impulso deba realizar al Cliente con motivo del lanzamiento del presente Programa de Regularización, se efectuarán mediante: (i) correo electrónico a la dirección de correo electrónico registrada por el Cliente; (ii) notificación o mensaje dentro de la aplicación o plataforma digital operada por VEMO Impulso; o (iii) mensaje enviado a través del número de WhatsApp proporcionado y registrado por el Cliente. Las notificaciones se considerarán recibidas al día hábil siguiente de su envío.",
  },
  {
    type: "p",
    text:
      "El Cliente reconoce y acepta que será su responsabilidad mantener actualizados sus datos de contacto y medios de comunicación registrados ante VEMO Impulso. Asimismo, las notificaciones realizadas por cualquiera de los medios antes señalados se considerarán válidamente efectuadas y surtirán efectos al día hábil siguiente de su envío.",
  },

  // ── XI. Aceptación ─────────────────────────────────────────────
  { type: "h2", text: "XI. Aceptación" },
  {
    type: "p",
    text:
      "Se entenderá que el Cliente ha leído, comprendido y aceptado íntegramente los presentes Términos y Condiciones desde el momento en que presente su Solicitud de Regularización, realice cualquier acción relacionada con la misma o reciba el Beneficio previsto en la Sección IV. La Solicitud se formaliza mediante la firma electrónica del Cliente a través de la App VEMO Impulso. Los presentes Términos y Condiciones del Programa de Regularización forman parte integrante de la Solicitud de Regularización y del Acuerdo de Regularización que eventualmente se suscriba.",
  },
  {
    type: "p",
    text:
      "Estos términos y condiciones estarán disponibles de forma permanente en la página oficial de VEMO Impulso y en la App VEMO Impulso.",
  },

  // ── XII. Disposiciones Generales ───────────────────────────────
  { type: "h2", text: "XII. Disposiciones Generales" },
  {
    type: "p",
    text:
      "Para la interpretación, cumplimiento y ejecución de los presentes términos y condiciones, las partes se someterán a la jurisdicción de los tribunales competentes de la Ciudad de México y/o la localidad correspondiente al domicilio de la parte actora.",
  },
  {
    type: "p",
    text:
      "La nulidad, invalidez o inexigibilidad de cualquiera de las disposiciones contenidas en los presentes Términos y Condiciones no afectará la validez, legalidad o exigibilidad de las demás disposiciones, las cuales permanecerán en pleno vigor y surtirán plenos efectos jurídicos.",
  },
];
