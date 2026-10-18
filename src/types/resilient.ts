export type ComponentType =
  | 'datacenter'
  | 'server'
  | 'link'
  | 'service'
  | 'storage'

export type ComponentStatus =
  | 'operativo'
  | 'degradado'
  | 'caido'
  | 'desconocido'

export interface InfraComponent {
  id: string
  name: string
  type: ComponentType
  location: string
  status: ComponentStatus
  description: string
  specs?: string
  datacenterId?: string
  dependencies?: string[] // IDs of components this component depends on
  x: number // Diagram X coordinate
  y: number // Diagram Y coordinate
}

export interface Connection {
  id: string
  fromId: string
  toId: string
  name: string
  bandwidth?: string
  isRedundant?: boolean
  status: ComponentStatus
}

export interface Dataset {
  id: string
  name: string
  serviceId: string
  sizeGb: number
  criticality: 'Alta' | 'Media' | 'Baja'
  primaryLocation: string
  backupStatus: 'Disponible' | 'Degradado' | 'No disponible'
  lastBackupDate: string
  storageComponentId: string
}

export interface BackupCopy {
  id: string
  datasetId: string
  location: string
  storageComponentId: string
  sizeGb: number
  lastBackupTime: string
  status: 'Disponible' | 'Degradado' | 'No disponible'
  rtoMinutes: number // Recovery Time Objective
  rpoHours: number // Recovery Point Objective (data freshness)
}

export interface FailureEvent {
  id: string
  name: string
  type: 'datacenter' | 'server' | 'link' | 'storage' | 'backup'
  targetId: string
  durationHours?: number
  description: string
}

export interface RecoveryItem {
  name: string
  type: 'servicio' | 'dataset'
  statusAfter: ComponentStatus
  backupAvailable: boolean
  rtoMinutes: number
  dataLossGb: number
  observations: string
}

export interface RiskFinding {
  id: string
  severity: 'alta' | 'media' | 'baja'
  title: string
  message: string
}

export interface SimulationResult {
  id: string
  scenarioName: string
  timestamp: string
  eventDescription: string
  failureEvents: FailureEvent[]
  
  // High-level Metrics
  servicesTotal: number
  servicesAvailable: number
  servicesDegraded: number
  servicesDown: number
  
  componentsTotal: number
  componentsAffected: number
  
  dataTotalGb: number
  dataRecoverableGb: number
  dataLostGb: number
  dataRecoverablePct: number
  
  rtoEstimatedMinutes: number
  rpoEstimatedHours: number
  
  spofIdentified: string[]
  
  // Detailed breakdowns
  recoveryDetails: RecoveryItem[]
  findings: RiskFinding[]
  
  // State snapshots
  componentsBefore: InfraComponent[]
  componentsAfter: InfraComponent[]
  connectionsBefore: Connection[]
  connectionsAfter: Connection[]
}

export interface SimulationHistoryItem {
  id: string
  name: string
  scenario: string
  failureType: string
  date: string
  affectedServices: string
  estimatedRto: string
  status: 'Completada' | 'En revisión'
  result: SimulationResult
}

export type ActiveSection =
  | 'dashboard'
  | 'infraestructura'
  | 'datos'
  | 'simulaciones'
  | 'resultados'
  | 'historial'
  | 'informe'
