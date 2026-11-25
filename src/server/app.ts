import express, { type NextFunction, type Request, type Response } from 'express';
import {
  validateCityName,
  validateUserProfileInput,
  type AiGuidanceResponse,
  type GuidanceApiResult,
  type LiveAqiReading,
  type UserProfileInput,
} from '../shared/airQualitySchema.ts';
import { fetchLiveAqiForCity } from './aqiService.ts';
import { GeminiServiceError, generateAirQualityGuidance } from './geminiService.ts';

export interface ServerDependencies {
  lookupAqi: (city: string, enabled?: boolean) => Promise<LiveAqiReading>;
  generateGuidance: (
    input: UserProfileInput,
    liveAqi: LiveAqiReading,
    effectiveAqi: number | null,
    aqiSourceType: 'live' | 'manual' | 'none',
  ) => Promise<AiGuidanceResponse>;
  rateLimit?: {
    guidanceMax?: number;
    aqiMax?: number;
    windowMs?: number;
  };
}

const DEFAULT_DEPS: ServerDependencies = {
  lookupAqi: fetchLiveAqiForCity,
  generateGuidance: generateAirQualityGuidance,
};

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

function createRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (buckets.size > 500) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before generating another plan.',
        code: 'RATE_LIMITED',
      });
      return;
    }

    existing.count += 1;
    next();
  };
}

export function createApiApp(customDeps?: Partial<ServerDependencies>) {
  const deps: ServerDependencies = { ...DEFAULT_DEPS, ...customDeps };
  const app = express();

  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  });

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use(express.json({ limit: '16kb' }));

  // Handle malformed JSON bodies safely without exposing stack traces
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err === 'object' && 'type' in err) {
      const errType = (err as { type?: string }).type;
      if (errType === 'entity.too.large') {
        res.status(413).json({
          error: 'Request payload is too large.',
          code: 'PAYLOAD_TOO_LARGE',
        });
        return;
      }
      if (errType === 'entity.parse.failed') {
        res.status(400).json({
          error: 'Invalid JSON request body.',
          code: 'INVALID_JSON',
        });
        return;
      }
    }
    next(err);
  });

  const windowMs = deps.rateLimit?.windowMs ?? 60_000;
  const guidanceLimiter = createRateLimiter(deps.rateLimit?.guidanceMax ?? 20, windowMs);
  const aqiLimiter = createRateLimiter(deps.rateLimit?.aqiMax ?? 40, windowMs);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/aqi', aqiLimiter, async (req, res) => {
    const cityCheck = validateCityName(req.query.city);
    if (!cityCheck.valid) {
      res.status(400).json({
        error: cityCheck.error || 'Provide a valid city name (at least 2 letters).',
        code: 'INVALID_CITY',
      });
      return;
    }

    try {
      const enabled = req.query.enabled !== 'false';
      const reading = await deps.lookupAqi(cityCheck.city, enabled);
      res.json({ reading });
    } catch {
      res.status(502).json({
        error: 'Unable to check live air-quality data right now.',
        code: 'AQI_LOOKUP_ERROR',
      });
    }
  });

  app.post('/api/guidance', guidanceLimiter, async (req, res) => {
    const validation = validateUserProfileInput(req.body);
    if (!validation.valid || !validation.sanitized) {
      res.status(400).json({
        error: 'Please check the highlighted form fields and try again.',
        code: 'VALIDATION_ERROR',
        fieldErrors: validation.errors,
      });
      return;
    }

    const input = validation.sanitized;

    try {
      const liveAqi = await deps.lookupAqi(input.city, input.useLiveLookup ?? true);

      let effectiveAqi: number | null = null;
      let aqiSourceType: 'live' | 'manual' | 'none' = 'none';

      // Prefer user-entered manual AQI if explicitly provided (e.g. local neighborhood sensor),
      // otherwise use verified live lookup if available.
      if (input.manualAqi !== null) {
        effectiveAqi = input.manualAqi;
        aqiSourceType = 'manual';
      } else if (liveAqi.status === 'available' && liveAqi.usAqi !== null) {
        effectiveAqi = liveAqi.usAqi;
        aqiSourceType = 'live';
      }

      const guidance = await deps.generateGuidance(
        input,
        liveAqi,
        effectiveAqi,
        aqiSourceType,
      );

      const payload: GuidanceApiResult = {
        guidance,
        liveAqi,
        effectiveAqi,
        aqiSourceType,
        generatedAt: new Date().toISOString(),
      };

      res.json(payload);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }

      res.status(500).json({
        error: 'An unexpected server error occurred while generating guidance. Please retry.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return app;
}
