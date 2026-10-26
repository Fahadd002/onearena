export interface ApiResponse<TData = unknown> {
  data: TData;
  message: string;
  success: boolean;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** @deprecated Use PaginationMeta instead */
export type paginationParams = PaginationMeta;

export interface ApiErrorResponse<TData = unknown> {
  success: boolean;
  message: string;
  meta?: PaginationMeta;
  data?: TData | null;
}