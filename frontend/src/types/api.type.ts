export interface ApiResponse<TData = unknown> {
    data: TData;
    message: string;
    success: boolean;
    meta?: paginationParams;
}

export interface paginationParams {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ApiErrorResponse<TData = unknown> {
    success: boolean;
    message: string;
}