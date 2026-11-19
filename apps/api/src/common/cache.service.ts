import { Injectable } from '@nestjs/common';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * Caché en memoria con TTL para respuestas de lectura.
 *
 * Práctica 12: evita repetir consultas idénticas a la base de datos en
 * endpoints públicos de solo lectura (`GET /events`, `GET /events/upcoming`).
 * Es un caché por proceso: en un despliegue con varias instancias cada una
 * mantiene su copia, por lo que la invalidación se hace por escritura local.
 */
@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private invalidations = 0;

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    this.sets++;
  }

  del(...keys: string[]): void {
    for (const key of keys) {
      if (this.store.delete(key)) this.invalidations++;
    }
  }

  clear(): void {
    this.invalidations += this.store.size;
    this.store.clear();
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      clavesActivas: this.store.size,
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      invalidaciones: this.invalidations,
      hitRatePct: total === 0 ? 0 : Number(((this.hits / total) * 100).toFixed(2)),
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.invalidations = 0;
  }
}
