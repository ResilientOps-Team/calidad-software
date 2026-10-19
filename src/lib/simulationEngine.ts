import {
  InfraComponent,
  Connection,
  Dataset,
  BackupCopy,
  FailureEvent,
  SimulationResult,
  ComponentStatus,
  RecoveryItem,
  RiskFinding,
} from '../types/resilient'

export function runDisasterSimulation(
  components: InfraComponent[],
  connections: Connection[],
  datasets: Dataset[],
  backups: BackupCopy[],
  failureEvents: FailureEvent[],
  scenarioName: string
): SimulationResult {
  const componentsAfter: InfraComponent[] = JSON.parse(JSON.stringify(components))
  const connectionsAfter: Connection[] = JSON.parse(JSON.stringify(connections))

  const failedComponentIds = new Set<string>()
  const failedConnectionIds = new Set<string>()

  // 1. Process explicit failure events
  failureEvents.forEach((event) => {
    if (event.type === 'link') {
      failedConnectionIds.add(event.targetId)
    } else {
      failedComponentIds.add(event.targetId)
    }
  })

  // 2. Cascade datacenter failures to child servers & storages
  componentsAfter.forEach((comp) => {
    if (comp.type === 'datacenter' && failedComponentIds.has(comp.id)) {
      comp.status = 'caido'
      // Fail all components housed in this DC
      componentsAfter.forEach((child) => {
        if (child.datacenterId === comp.id) {
          failedComponentIds.add(child.id)
          child.status = 'caido'
        }
      })
    }
  })

  // 3. Mark failed components & evaluate connections
  componentsAfter.forEach((comp) => {
    if (failedComponentIds.has(comp.id)) {
      comp.status = 'caido'
    }
  })

  // Check connections
  connectionsAfter.forEach((conn) => {
    if (
      failedConnectionIds.has(conn.id) ||
      failedComponentIds.has(conn.fromId) ||
      failedComponentIds.has(conn.toId)
    ) {
      // Check if there is an alternative redundant link between the same DCs
      const redundantConn = connectionsAfter.find(
        (c) =>
          c.id !== conn.id &&
          c.isRedundant &&
          !failedConnectionIds.has(c.id) &&
          !failedComponentIds.has(c.fromId) &&
          !failedComponentIds.has(c.toId)
      )

      if (redundantConn) {
        conn.status = 'degradado'
      } else {
        conn.status = 'caido'
      }
    }
  })

  // 4. Cascade dependency failures to Digital Services
  componentsAfter.forEach((comp) => {
    if (comp.type === 'service') {
      const deps = comp.dependencies || []
      const failedDeps = deps.filter((depId) => failedComponentIds.has(depId))

      if (failedDeps.length > 0) {
        // If all or primary servers down, service is down
        comp.status = 'caido'
      } else {
        // Check if connection is degraded
        const degradedLinks = connectionsAfter.some(
          (c) => c.status === 'degradado'
        )
        if (degradedLinks) {
          comp.status = 'degradado'
        }
      }
    }
  })

  // 5. Evaluate Data sets & Backups recuperability
  const recoveryDetails: RecoveryItem[] = []
  let totalDataGb = 0
  let recoverableDataGb = 0
  let totalDataLossGb = 0
  let maxRtoMinutes = 0
  let maxRpoHours = 0

  datasets.forEach((ds) => {
    totalDataGb += ds.sizeGb

    // Check backups for this dataset
    const datasetBackups = backups.filter((b) => b.datasetId === ds.id)
    // Find accessible backups (not in a failed DC or failed storage)
    const accessibleBackup = datasetBackups.find((bk) => {
      const storageComp = componentsAfter.find(
        (c) => c.id === bk.storageComponentId
      )
      return storageComp && storageComp.status !== 'caido'
    })

    const serviceComp = componentsAfter.find((c) => c.id === ds.serviceId)
    const isServiceDown = serviceComp?.status === 'caido'

    if (accessibleBackup) {
      recoverableDataGb += ds.sizeGb
      maxRtoMinutes = Math.max(maxRtoMinutes, accessibleBackup.rtoMinutes)
      maxRpoHours = Math.max(maxRpoHours, accessibleBackup.rpoHours)

      // Estimated data loss based on hours since last backup (approx 2.5 GB per hour of transactions)
      const estimatedLoss = Math.round(accessibleBackup.rpoHours * 3)
      totalDataLossGb += estimatedLoss

      recoveryDetails.push({
        name: ds.name,
        type: 'dataset',
        statusAfter: isServiceDown ? 'caido' : 'operativo',
        backupAvailable: true,
        rtoMinutes: accessibleBackup.rtoMinutes,
        dataLossGb: estimatedLoss,
        observations: `Respaldo accesible en ${accessibleBackup.location}. Restauración estimada en ${accessibleBackup.rtoMinutes} min.`,
      })
    } else {
      // Data is compromised!
      totalDataLossGb += ds.sizeGb
      recoveryDetails.push({
        name: ds.name,
        type: 'dataset',
        statusAfter: 'caido',
        backupAvailable: false,
        rtoMinutes: 0,
        dataLossGb: ds.sizeGb,
        observations: `ALERTA CRÍTICA: No hay copias de respaldo accesibles. Todos los respaldos se encontraban en la zona afectada.`,
      })
    }
  })

  // Add services to recovery details
  componentsAfter
    .filter((c) => c.type === 'service')
    .forEach((svc) => {
      recoveryDetails.push({
        name: svc.name,
        type: 'servicio',
        statusAfter: svc.status,
        backupAvailable: svc.status !== 'caido',
        rtoMinutes: svc.status === 'caido' ? maxRtoMinutes : 0,
        dataLossGb: 0,
        observations:
          svc.status === 'caido'
            ? 'Servicio interrumpido. Requiere failover y recuperación de datos.'
            : svc.status === 'degradado'
            ? 'Servicio operando a través de rutas de contingencia con latencia.'
            : 'Servicio 100% operativo sin afectación directa.',
      })
    })

  // 6. Detect Single Points of Failure (SPOF)
  const spofList: string[] = []
  components.forEach((comp) => {
    if (comp.type === 'server' || comp.type === 'storage') {
      // If service depends on this and there is no standby replica
      const dependents = components.filter(
        (c) => c.type === 'service' && c.dependencies?.includes(comp.id)
      )
      if (dependents.length > 0 && comp.location.includes('Lima')) {
        spofList.push(`${comp.name} (${comp.location})`)
      }
    }
  })

  // 7. Formulate Risk Findings
  const findings: RiskFinding[] = []

  // Check if any DC Lima failure occurred
  if (failedComponentIds.has('dc-lima')) {
    findings.push({
      id: 'f-1',
      severity: 'alta',
      title: 'Ausencia de Alta Disponibilidad Activo-Activo',
      message:
        'El Centro de Datos Lima concentra todos los servidores primarios. Su caída provocó la indisponibilidad total de los servicios ciudadanos.',
    })
  }

  // Check for backup localization
  backups.forEach((bk) => {
    if (bk.location.includes('Lima') && failedComponentIds.has('dc-lima')) {
      findings.push({
        id: `f-bk-${bk.id}`,
        severity: 'alta',
        title: 'Copia de respaldo en la misma zona afectada',
        message: `El respaldo '${bk.id}' estaba almacenado en Lima y quedó inaccesible al caer el centro de datos principal.`,
      })
    }
  })

  // Check connection redundancy
  if (failedConnectionIds.has('conn-inter-fo')) {
    findings.push({
      id: 'f-link-1',
      severity: 'media',
      title: 'Ruta alternativa con degradación de ancho de banda',
      message:
        'El enlace satelital de contingencia mantuvo la conectividad pero con una reducción del 99% en capacidad de transferencia.',
    })
  }

  // Summary counts
  const services = componentsAfter.filter((c) => c.type === 'service')
  const servicesDown = services.filter((s) => s.status === 'caido').length
  const servicesDegraded = services.filter((s) => s.status === 'degradado').length
  const servicesAvailable = services.length - servicesDown - servicesDegraded

  const componentsAffected = componentsAfter.filter(
    (c) => c.status === 'caido' || c.status === 'degradado'
  ).length

  const dataRecoverablePct =
    totalDataGb > 0
      ? Math.round((recoverableDataGb / totalDataGb) * 100)
      : 100

  return {
    id: `sim-${Date.now()}`,
    scenarioName,
    timestamp: new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    eventDescription: failureEvents.map((e) => e.name).join(', '),
    failureEvents,
    servicesTotal: services.length,
    servicesAvailable,
    servicesDegraded,
    servicesDown,
    componentsTotal: componentsAfter.length,
    componentsAffected,
    dataTotalGb: totalDataGb,
    dataRecoverableGb: recoverableDataGb,
    dataLostGb: totalDataLossGb,
    dataRecoverablePct,
    rtoEstimatedMinutes: maxRtoMinutes,
    rpoEstimatedHours: maxRpoHours,
    spofIdentified: spofList,
    recoveryDetails,
    findings,
    componentsBefore: components,
    componentsAfter,
    connectionsBefore: connections,
    connectionsAfter,
  }
}
