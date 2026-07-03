import { httpClient } from './http-client'
import type {
  CreateExportJobPayload,
  ExportJob,
  ExportJobsFilters,
  ExportJobsResponse,
} from '../types/exports.types'

export class ExportsService {
  async list(params?: ExportJobsFilters): Promise<ExportJobsResponse> {
    const { data } = await httpClient.get<ExportJobsResponse>('/exports', { params })
    return data
  }

  async create(payload: CreateExportJobPayload): Promise<ExportJob> {
    const { data } = await httpClient.post<ExportJob>('/exports', payload)
    return data
  }

  async processPending(): Promise<{ processed: ExportJob[] }> {
    const { data } = await httpClient.post<{ processed: ExportJob[] }>('/exports/process-pending')
    return data
  }

  async cancel(id: string): Promise<ExportJob> {
    const { data } = await httpClient.post<ExportJob>(`/exports/${id}/cancel`)
    return data
  }

  async download(job: ExportJob): Promise<void> {
    const response = await httpClient.get<Blob>(`/exports/${job.id}/download`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = job.fileName ?? `export-${job.id}.${job.format.toLowerCase()}`
    anchor.click()
    URL.revokeObjectURL(url)
  }
}

export const exportsService = new ExportsService()
