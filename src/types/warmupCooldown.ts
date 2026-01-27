/**
 * Warmup/Cooldown Type Definitions
 */

export type WarmupCooldownType = 'cardio' | 'dynamic_stretch' | 'static_stretch' | 'mobility';

export interface WarmupCooldownExercise {
  id: string;
  name: string;
  duration: number; // seconds
  type: WarmupCooldownType;
  completed?: boolean;
  notes?: string;
}

export interface WarmupData {
  duration: number; // total duration in seconds
  exercises: WarmupCooldownExercise[];
  skipped: boolean;
  completedAt?: string;
}

export interface CooldownData {
  duration: number; // total duration in seconds
  exercises: WarmupCooldownExercise[];
  skipped: boolean;
  completedAt?: string;
}

// Preset warmup exercises
export const WARMUP_PRESETS: WarmupCooldownExercise[] = [
  { id: 'warmup-1', name: 'Juoksumatto', duration: 300, type: 'cardio' },
  { id: 'warmup-2', name: 'Kuntopyörä', duration: 300, type: 'cardio' },
  { id: 'warmup-3', name: 'Soutulaite', duration: 300, type: 'cardio' },
  { id: 'warmup-4', name: 'Arm circles', duration: 60, type: 'dynamic_stretch' },
  { id: 'warmup-5', name: 'Leg swings', duration: 60, type: 'dynamic_stretch' },
  { id: 'warmup-6', name: 'Hip circles', duration: 60, type: 'dynamic_stretch' },
  { id: 'warmup-7', name: 'Jumping jacks', duration: 60, type: 'cardio' },
  { id: 'warmup-8', name: 'High knees', duration: 60, type: 'cardio' },
  { id: 'warmup-9', name: 'Butt kicks', duration: 60, type: 'cardio' },
  { id: 'warmup-10', name: 'Torson kierrot', duration: 60, type: 'mobility' },
];

// Preset cooldown exercises
export const COOLDOWN_PRESETS: WarmupCooldownExercise[] = [
  { id: 'cooldown-1', name: 'Kävely', duration: 300, type: 'cardio' },
  { id: 'cooldown-2', name: 'Reiden takaosa venytys', duration: 60, type: 'static_stretch' },
  { id: 'cooldown-3', name: 'Reiden etuosa venytys', duration: 60, type: 'static_stretch' },
  { id: 'cooldown-4', name: 'Pakara venytys', duration: 60, type: 'static_stretch' },
  { id: 'cooldown-5', name: 'Lonkankoukistaja venytys', duration: 60, type: 'static_stretch' },
  { id: 'cooldown-6', name: 'Olkapää venytys', duration: 60, type: 'static_stretch' },
  { id: 'cooldown-7', name: 'Rintalihas venytys', duration: 60, type: 'static_stretch' },
  { id: 'cooldown-8', name: 'Selkä venytys', duration: 60, type: 'static_stretch' },
  { id: 'cooldown-9', name: 'Foam rolling', duration: 300, type: 'mobility' },
  { id: 'cooldown-10', name: 'Hengitysharjoitus', duration: 120, type: 'mobility' },
];

// Get type label in Finnish
export function getTypeLabel(type: WarmupCooldownType): string {
  switch (type) {
    case 'cardio': return 'Kardio';
    case 'dynamic_stretch': return 'Dynaaminen';
    case 'static_stretch': return 'Staattinen';
    case 'mobility': return 'Liikkuvuus';
    default: return type;
  }
}

// Get type color
export function getTypeColor(type: WarmupCooldownType): string {
  switch (type) {
    case 'cardio': return '#EF4444'; // Red
    case 'dynamic_stretch': return '#F59E0B'; // Amber
    case 'static_stretch': return '#60A5FA'; // Blue
    case 'mobility': return '#10B981'; // Green
    default: return '#888888';
  }
}

// Format duration as minutes:seconds
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} min`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Calculate total duration of exercises
export function calculateTotalDuration(exercises: WarmupCooldownExercise[]): number {
  return exercises.reduce((sum, ex) => sum + ex.duration, 0);
}
