import type { NextRequest } from 'next/server';

export interface LogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

class ApiLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  log(entry: LogEntry) {
    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[v0] API ${entry.method} ${entry.url} - ${
          entry.statusCode || 'pending'
        } - ${entry.responseTime || 0}ms`
      );
    }
  }

  getLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByUser(userId: string, limit = 50): LogEntry[] {
    return this.logs.filter((log) => log.userId === userId).slice(-limit);
  }

  getErrorLogs(limit = 50): LogEntry[] {
    return this.logs
      .filter((log) => log.error || (log.statusCode && log.statusCode >= 400))
      .slice(-limit);
  }
}

export const apiLogger = new ApiLogger();

export function logApiRequest(req: NextRequest, requestId: string): LogEntry {
  // Get IP address from various headers
  const getClientIP = (request: NextRequest): string | undefined => {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return undefined;
  };

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent') || undefined,
    ip: getClientIP(req),
    userId: req.headers.get('x-user-id') || undefined,
  };

  apiLogger.log(entry);
  return entry;
}

// Update log entry with response info
export function updateLogEntry(
  requestId: string,
  statusCode: number,
  responseTime: number,
  error?: string
) {
  const entry = apiLogger.getLogs().find((log) => log.requestId === requestId);
  if (entry) {
    entry.statusCode = statusCode;
    entry.responseTime = responseTime;
    entry.error = error;
  }
}
