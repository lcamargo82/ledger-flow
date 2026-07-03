export type ExportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
export type ExportJobFormat = 'CSV' | 'XLSX'
export type ExportJobType = 'ORDER_FINANCIAL_FACTS' | 'CATALOG_PRODUCTS'

export interface ExportJob {
  id: string
  type: ExportJobType
  format: ExportJobFormat
  status: ExportJobStatus
  rowCount: number
  fileName?: string | null
  mimeType?: string | null
  errorCode?: string | null
  errorSummary?: string | null
  expiresAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ExportJobsMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ExportJobsResponse {
  data: ExportJob[]
  meta: ExportJobsMeta
}

export interface ExportJobsFilters {
  page?: number
  perPage?: number
  status?: ExportJobStatus
  type?: ExportJobType
}

export interface CreateExportJobPayload {
  type: ExportJobType
  format: ExportJobFormat
  parameters?: Record<string, unknown>
}
