import { Cloud, Sun, CloudRain, CloudSnow, Cloudy, CloudDrizzle, Moon, Zap, type LucideIcon } from 'lucide-react';

/** Icône et teinte d'une condition. La teinte vient des jetons : soleil chaud, pluie froide, nuages neutres. */
export function conditionIcon(condition: string): { Icon: LucideIcon; color: string } {
  const c = condition.toLowerCase();
  if (c === 'clear-night') return { Icon: Moon, color: 'var(--ds-cool)' };
  if (c.includes('sunny') || c.includes('clear')) return { Icon: Sun, color: 'var(--ds-warm-light)' };
  if (c.includes('lightning') || c.includes('storm')) return { Icon: Zap, color: 'var(--ds-warm-light)' };
  if (c.includes('drizzle')) return { Icon: CloudDrizzle, color: 'var(--ds-cool)' };
  if (c.includes('rain') || c.includes('shower') || c.includes('pouring')) return { Icon: CloudRain, color: 'var(--ds-cool)' };
  if (c.includes('snow') || c.includes('hail')) return { Icon: CloudSnow, color: 'var(--ds-cool)' };
  if (c.includes('partly') || c.includes('mostly')) return { Icon: Cloudy, color: 'var(--ds-ink-muted)' };
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('mist'))
    return { Icon: Cloud, color: 'var(--ds-ink-muted)' };
  return { Icon: Sun, color: 'var(--ds-warm-light)' };
}
