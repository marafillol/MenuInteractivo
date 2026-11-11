/**
 * Restringe los scripts de reconciliación a la copia PostgreSQL local.
 * Los puertos 5432 y 5433 se admiten porque ambos se usan para instancias
 * locales aisladas; el nombre exacto de la base y el host siguen validados.
 */
function validarDestinoReconciliacion(connectionString, accion = "Conexión bloqueada") {
  let destino;
  try {
    destino = new URL(String(connectionString || ""));
  } catch {
    throw new Error(accion + ": URL de PostgreSQL inválida.");
  }

  const hostPermitido = ["127.0.0.1", "localhost"].includes(destino.hostname);
  const puertoPermitido = ["5432", "5433"].includes(destino.port);
  const basePermitida =
    destino.pathname.replace(/^\/+/, "") === "museo_reconciliacion_prueba";
  const protocoloPermitido = ["postgres:", "postgresql:"].includes(destino.protocol);

  if (!protocoloPermitido || !hostPermitido || !puertoPermitido || !basePermitida) {
    throw new Error(
      accion + ": solo se permite museo_reconciliacion_prueba en localhost:5432 o localhost:5433; no se admiten bases remotas."
    );
  }
}

module.exports = { validarDestinoReconciliacion };
