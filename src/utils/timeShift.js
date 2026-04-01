/**
 * Shifts the time of instances based on a target start time.
 * @param {Array} instances - Array of {id, code, start, end, label}
 * @param {number} targetStart - The time in seconds where the first instance should start
 * @returns {Array} - The shifted instances
 */
export const applyTimeShift = (instances, targetStart) => {
  if (!instances || instances.length === 0) return [];

  // Find the current earliest start time
  // Look specifically for "start period" or similar if requested, 
  // but by default use the earliest instance.
  const currentStart = Math.min(...instances.map(i => i.start));
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
export const detectStartPeriod = (instances) => {
  if (!instances) return 0;
  
  // Look for instances with "start" or "period" in the code/label
  const startEvent = instances.find(inst => 
    inst.code.toLowerCase().includes('start period') || 
    inst.code.toLowerCase().includes('comienzo') ||
    inst.label.toLowerCase().includes('start')
  );
  
  return startEvent ? startEvent.start : Math.min(...instances.map(i => i.start));
};
