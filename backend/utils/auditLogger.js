/**
 * Stub audit logger - ActivityLog module removed as per spec.
 * Kept as no-op to avoid breaking any residual references during migration.
 */
const logActivity = async (data) => {
  // no-op
};

module.exports = { logActivity };
