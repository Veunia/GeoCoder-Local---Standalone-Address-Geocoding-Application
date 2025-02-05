import { Request, Response, NextFunction } from 'express';

export class RateLimiter {
  private requests: Map<string, number[]>;
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.requests = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const now = Date.now();
      const ip = req.ip;

      if (!this.requests.has(ip)) {
        this.requests.set(ip, [now]);
        return next();
      }

      const requests = this.requests.get(ip)!;
      const windowStart = now - this.windowMs;
      
      // Remove old requests
      while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift();
      }

      if (requests.length >= this.maxRequests) {
        return res.status(429).json({
          error: 'Too many requests, please try again later',
        });
      }

      requests.push(now);
      return next();
    };
  }
}
