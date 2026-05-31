import { txtStrategy } from './txt';
import { jsonStrategy } from './json';
import { srtStrategy } from './srt';
import { timestampedStrategy } from './timestamped';
import type { ExportStrategy, ExportFormat } from '../../types';

export const ORDERED_EXPORT_STRATEGIES: ExportStrategy[] = [
  txtStrategy,
  jsonStrategy,
  timestampedStrategy,
  srtStrategy,
];

const EXPORT_REGISTRY = new Map<ExportFormat, ExportStrategy>(
  ORDERED_EXPORT_STRATEGIES.map((s) => [s.id, s])
);

export function getExportStrategy(id: ExportFormat): ExportStrategy {
  const strategy = EXPORT_REGISTRY.get(id);
  if (!strategy) throw new Error(`No export strategy registered for format: ${id}`);
  return strategy;
}
