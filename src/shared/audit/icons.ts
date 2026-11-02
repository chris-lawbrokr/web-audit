import type { LucideIcon } from 'lucide-react';
import {
  Gauge,
  LogOut,
  MapPin,
  MousePointerClick,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';

import type { CheckKey } from './checks';
import type { DiscoveryIcon } from './contracts';

export const CHECK_ICONS: Record<CheckKey, LucideIcon> = {
  reviews: Star,
  speed: Gauge,
  bounce: LogOut,
  traffic: TrendingUp,
  visibility: Sparkles,
};

export const DISCOVERY_ICONS: Record<DiscoveryIcon, LucideIcon> = {
  'map-pin': MapPin,
  users: Users,
  smartphone: Smartphone,
  pointer: MousePointerClick,
  'trending-up': TrendingUp,
  sparkles: Sparkles,
};
