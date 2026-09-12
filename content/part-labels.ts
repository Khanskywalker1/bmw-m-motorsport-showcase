/**
 * Human-readable labels for the 3D diagram.
 *
 * Most part names format themselves cleanly — `M4GT3_Brake_Caliper_FL` is
 * unambiguously "Brake Caliper, Front Left". The 56 cockpit parts do not:
 * the source model named them after their triangle counts
 * (`M4GT3_Cockpit_L_90816`), which is meaningless in a diagram whose entire
 * job is labelling.
 *
 * The entries below were identified from measured bounding boxes and
 * positions in the model (driver sits at +X; -Y is the front of the car;
 * +Z is up). Parts that could NOT be identified with confidence are
 * deliberately absent and fall back to an honest generic label from their
 * category — an invented specific name would be worse than a vague true one,
 * which is the same rule the spec applies to unverified figures.
 */

/** Confident identifications, keyed by exact object name. */
export const PART_LABELS: Record<string, string> = {
  // Measured 0.85 m wide, high and at the very front of the cabin.
  M4GT3_Cockpit_L_90816: 'Dashboard',
  // Both span the whole cabin volume (1.6 x 3.0 x 1.15 m) — the safety structure.
  M4GT3_Cockpit_C_42407: 'Roll cage',
  M4GT3_Cockpit_C_35040: 'Roll cage, inner structure',
  // At the driver position, tall and deep.
  M4GT3_Cockpit_L_37584: 'Racing seat',
  M4GT3_Cockpit_L_18160: 'Seat mount and harness',
  // Outboard of the driver (X = 0.6), long and tall — the door.
  M4GT3_Cockpit_L_30688: 'Door card, driver side',
  // Long, low and outboard on the right — floor and sill.
  M4GT3_Cockpit_R_43776: 'Floor and sill, right',
  M4GT3_Cockpit_R_22912: 'Sill, right',
  // Thin stacked panels between dashboard and driver — wheel and its display.
  M4GT3_Cockpit_L_52448: 'Steering wheel',
  M4GT3_Cockpit_L_35072: 'Steering wheel display',
  M4GT3_Cockpit_L_26336: 'Steering wheel controls',
  // Low, long, at the driver's feet.
  M4GT3_Cockpit_L_21120: 'Pedal box',
}

/** Shown when a part has no confident identification. */
const CATEGORY_FALLBACK: Record<string, string> = {
  EXTERIOR: 'Body panel',
  AERODYNAMICS: 'Aerodynamic element',
  WHEELS: 'Wheel component',
  BRAKES: 'Brake component',
  COCKPIT: 'Cockpit component',
  CHASSIS: 'Chassis component',
  GLASS: 'Glazing',
  ENGINE: 'Engine component',
  DRIVETRAIN: 'Drivetrain component',
  COOLING: 'Cooling component',
  EXHAUST: 'Exhaust component',
  SUSPENSION: 'Suspension component',
}

const CORNER_NAMES: Record<string, string> = {
  FL: 'Front Left',
  FR: 'Front Right',
  RL: 'Rear Left',
  RR: 'Rear Right',
}

/**
 * Turn an object name into something a reader can use.
 *
 * Returns the curated label when there is one, otherwise derives it from the
 * name — but only when the name actually carries meaning. A trailing number
 * is a triangle count, not information, so those fall back to the category.
 */
export function labelFor(objectName: string, category: string | undefined): string {
  const curated = PART_LABELS[objectName]
  if (curated) return curated

  let base = objectName.replace(/^M4GT3_/, '')

  // Corner suffix -> readable position.
  let corner = ''
  const m = base.match(/_(FL|FR|RL|RR)$/)
  if (m) {
    corner = CORNER_NAMES[m[1]!]!
    base = base.slice(0, -3)
  }

  // A trailing pure number is the source model's triangle count. It says
  // nothing about the part, so anything still carrying one is unidentified.
  if (/_\d+(_\d+)?$/.test(base)) {
    const fallback = CATEGORY_FALLBACK[category ?? ''] ?? 'Component'
    return corner ? `${fallback}, ${corner}` : fallback
  }

  const words = base.split('_').filter(Boolean).join(' ')
  return corner ? `${words}, ${corner}` : words
}

/** Display names for the category filter. */
export const CATEGORY_LABELS: Record<string, string> = {
  EXTERIOR: 'Body',
  AERODYNAMICS: 'Aerodynamics',
  WHEELS: 'Wheels',
  BRAKES: 'Brakes',
  SUSPENSION: 'Suspension',
  ENGINE: 'Engine',
  DRIVETRAIN: 'Drivetrain',
  COOLING: 'Cooling',
  EXHAUST: 'Exhaust',
  COCKPIT: 'Cockpit',
  CHASSIS: 'Chassis',
  GLASS: 'Glass',
}
