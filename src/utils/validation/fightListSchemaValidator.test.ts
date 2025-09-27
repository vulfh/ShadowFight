import { describe, expect, test } from 'vitest';
import { 
  isFightListTechnique,
  isFightList,
  validateFightList,
  validateFightListVersion,
  checkFightListIntegrity,
  validateFightListComplete
} from './fightListSchemaValidator';

describe('Fight List Schema Validation', () => {
  const validTechnique = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    techniqueId: '123e4567-e89b-12d3-a456-426614174002',
    priority: 3,
    selected: true
  };

  const validFightList = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Fight List',
    techniques: [validTechnique],
    createdAt: '2024-01-20T10:30:15.123Z',
    lastModified: '2024-01-20T10:30:15.123Z'
  };

  describe('isFightListTechnique', () => {
    test('should return true for valid technique', () => {
      expect(isFightListTechnique(validTechnique)).toBe(true);
    });

    test('should return false for invalid technique', () => {
      expect(isFightListTechnique(null)).toBe(false);
      expect(isFightListTechnique({})).toBe(false);
      expect(isFightListTechnique({ ...validTechnique, id: 123 })).toBe(false);
      expect(isFightListTechnique({ ...validTechnique, priority: '3' })).toBe(false);
    });
  });

  describe('isFightList', () => {
    test('should return true for valid fight list', () => {
      expect(isFightList(validFightList)).toBe(true);
    });

    test('should return false for invalid fight list', () => {
      expect(isFightList(null)).toBe(false);
      expect(isFightList({})).toBe(false);
      expect(isFightList({ ...validFightList, techniques: 'not-array' })).toBe(false);
      expect(isFightList({ ...validFightList, createdAt: 123 })).toBe(false);
    });
  });

  describe('validateFightList', () => {
    test('should validate a correct fight list', () => {
      const result = validateFightList(validFightList);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation for invalid ID format', () => {
      const invalidList = { ...validFightList, id: 'not-a-uuid' };
      const result = validateFightList(invalidList);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid fight list ID format');
    });

    test('should fail validation for invalid name length', () => {
      const tooShort = { ...validFightList, name: 'ab' };
      const tooLong = { ...validFightList, name: 'a'.repeat(51) };
      
      expect(validateFightList(tooShort).errors).toContain('Fight list name must be between 3 and 50 characters');
      expect(validateFightList(tooLong).errors).toContain('Fight list name must be between 3 and 50 characters');
    });

    test('should fail validation for empty techniques', () => {
      const emptyList = { ...validFightList, techniques: [] };
      const result = validateFightList(emptyList);
      expect(result.errors).toContain('Fight list must contain at least one technique');
    });
  });

  describe('validateFightListVersion', () => {
    test('should validate matching major versions', () => {
      expect(validateFightListVersion('1.0.0')).toBe(true);
      expect(validateFightListVersion('1.1.0')).toBe(true);
    });

    test('should reject different major versions', () => {
      expect(validateFightListVersion('2.0.0')).toBe(false);
      expect(validateFightListVersion('0.1.0')).toBe(false);
    });
  });

  describe('checkFightListIntegrity', () => {
    test('should pass for valid fight list', () => {
      const issues = checkFightListIntegrity(validFightList);
      expect(issues).toHaveLength(0);
    });

    test('should detect duplicate technique IDs', () => {
      const duplicateList = {
        ...validFightList,
        techniques: [validTechnique, { ...validTechnique }]
      };
      const issues = checkFightListIntegrity(duplicateList);
      expect(issues).toContain(`Duplicate technique ID found: ${validTechnique.techniqueId}`);
    });

    test('should detect invalid priority values', () => {
      const invalidPriorityList = {
        ...validFightList,
        techniques: [{ ...validTechnique, priority: 6 }]
      };
      const issues = checkFightListIntegrity(invalidPriorityList);
      expect(issues).toContain(`Invalid priority value for technique ${validTechnique.techniqueId}: 6`);
    });
  });

  describe('validateFightListComplete', () => {
    test('should pass complete validation for valid data', () => {
      const result = validateFightListComplete(validFightList, '1.0.0');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail for incompatible version', () => {
      const result = validateFightListComplete(validFightList, '2.0.0');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incompatible fight list version: 2.0.0');
    });

    test('should include all validation errors', () => {
      const invalidList = {
        ...validFightList,
        id: 'not-a-uuid',
        techniques: [{ ...validTechnique, priority: 6 }]
      };
      const result = validateFightListComplete(invalidList, '1.0.0');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid fight list ID format');
      expect(result.errors).toContain(`Invalid priority value for technique ${validTechnique.techniqueId}: 6`);
    });
  });
});