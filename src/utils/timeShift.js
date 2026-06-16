/**
 * Shifts the time of instances based on a target start time.
 * @param {Array} instances - Array of {id, code, start, end, label}
 * @param {number} targetStart - The time in seconds where the first instance should start
 * @returns {Array} - The shifted instances
 */
import { detectTimelineStart } from './timeline';

export const applyTimeShift = (instances, targetStart) => {
  if (!instances || instances.length === 0) return [];

  const currentStart = detectTimelineStart(instances);
  const offset = targetStart - currentStart;

  return instances.map(inst => ({
    ...inst,
    start: Math.max(0, inst.start + offset),
    end: Math.max(0, inst.end + offset)
  }));
};

/**
 * Automatically detects the "start period" or first period start if available.
 */
export const detectStartPeriod = (instances) => detectTimelineStart(instances);
