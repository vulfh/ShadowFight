import { FightList, FightListTechnique, FightListValidationResult } from '../../types';
import { CURRENT_FIGHT_LIST_VERSION } from '../../constants/storage';

/**
 * Type guard to check if a value is a FightListTechnique
 * @param value - Value to check
 * @returns True if value matches FightListTechnique structure
 */
export function isFightListTechnique(value: unknown): value is FightListTechnique {
  if (!value || typeof value !== 'object') return false;
  
  const technique = value as Record<string, unknown>;
  return (
    typeof technique.id === 'string' &&
    typeof technique.techniqueId === 'string' &&
    typeof technique.priority === 'number' &&
    typeof technique.selected === 'boolean'
  );
}

/**
 * Type guard to check if a value is a FightList
 * @param value - Value to check
 * @returns True if value matches FightList structure
 */
export function isFightList(value: unknown): value is FightList {
  if (!value || typeof value !== 'object') return false;

  const list = value as Record<string, unknown>;
  return (
    typeof list.id === 'string' &&
    typeof list.name === 'string' &&
    Array.isArray(list.techniques) &&
    list.techniques.every(isFightListTechnique) &&
    typeof list.createdAt === 'string' &&
    typeof list.lastModified === 'string'
  );
}

/**
 * Validates a UUID string
 * @param uuid - UUID string to validate
 * @returns True if valid UUID
 */
function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Validates a fight list data structure
 * @param data - The fight list data to validate
 * @returns Validation result with success flag and any error messages
 */
export function validateFightList(data: unknown): FightListValidationResult {
  const result: FightListValidationResult = {
    isValid: false,
    errors: [],
    warnings: []
  };

  if (!isFightList(data)) {
    result.errors.push('Invalid fight list structure');
    return result;
  }

  // Validate ID format (UUID)
  if (!isValidUUID(data.id)) {
    result.errors.push('Invalid fight list ID format');
  }

  // Validate name length
  if (data.name.length < 3 || data.name.length > 50) {
    result.errors.push('Fight list name must be between 3 and 50 characters');
  }

  // Validate techniques array
  if (data.techniques.length === 0) {
    result.errors.push('Fight list must contain at least one technique');
  }

  // Validate timestamps
  try {
    const created = new Date(data.createdAt).getTime();
    const modified = new Date(data.lastModified).getTime();
    
    if (isNaN(created) || isNaN(modified)) {
      result.errors.push('Invalid timestamp format');
    } else if (modified < created) {
      result.errors.push('Last modified timestamp cannot be earlier than created timestamp');
    }
  } catch (e) {
    result.errors.push('Invalid timestamp format');
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Validates the fight list data structure version
 * @param version - Version string to validate
 * @returns True if version is valid and compatible
 */
export function validateFightListVersion(version: string): boolean {
  if (typeof version !== 'string') return false;
  
  const currentVersion = CURRENT_FIGHT_LIST_VERSION.split('.');
  const providedVersion = version.split('.');
  
  // Check major version compatibility
  return currentVersion[0] === providedVersion[0];
}

/**
 * Checks data integrity of a fight list
 * @param data - The fight list to check
 * @returns Array of integrity issues found
 */
export function checkFightListIntegrity(data: FightList): string[] {
  const issues: string[] = [];
  const techniqueIds = new Set<string>();

  // Check for technique-level issues
  for (const technique of data.techniques) {
    // Check for duplicate technique IDs
    if (techniqueIds.has(technique.techniqueId)) {
      issues.push(`Duplicate technique ID found: ${technique.techniqueId}`);
    }
    techniqueIds.add(technique.techniqueId);

    // Check priority range
    if (technique.priority < 1 || technique.priority > 5) {
      issues.push(`Invalid priority value for technique ${technique.techniqueId}: ${technique.priority}`);
    }

    // Validate technique ID format
    if (!isValidUUID(technique.id)) {
      issues.push(`Invalid technique UUID format: ${technique.id}`);
    }
  }

  return issues;
}

/**
 * Complete validation of a fight list data structure
 * @param data - The fight list data to validate
 * @param version - The version of the data structure
 * @returns Validation result with success flag and any error messages
 */
export function validateFightListComplete(
  data: unknown,
  version: string
): FightListValidationResult {
  const result: FightListValidationResult = {
    isValid: false,
    errors: [],
    warnings: []
  };

  // Check version compatibility first
  if (!validateFightListVersion(version)) {
    result.errors.push(`Incompatible fight list version: ${version}`);
    return result;
  }

  // Run basic validation
  const basicValidation = validateFightList(data);
  result.errors.push(...basicValidation.errors);

  // Run integrity checks if data is a FightList, regardless of basic validation
  if (isFightList(data)) {
    const integrityIssues = checkFightListIntegrity(data);
    result.errors.push(...integrityIssues);
  }

  result.isValid = result.errors.length === 0;
  return result;
}