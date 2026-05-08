import { Response } from 'express';

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const sendSuccess = (res: Response, data: any, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendPaginated = (
  res: Response,
  data: any[],
  pagination: PaginationData,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination,
  });
};

export const createError = (
  code: string,
  message: string,
  fields?: Record<string, string[]>
) => {
  return {
    code,
    message,
    fields,
  };
};
