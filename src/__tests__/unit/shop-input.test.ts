/**
 * Unit tests for shop-input module
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CLIContext } from '../../lib/core/types.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  text: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn()
}));

// Mock validation module
vi.mock('../../lib/core/validation.js', () => ({
  validateShopId: vi.fn(),
  validateDomain: vi.fn()
}));

describe('shop-input', () => {
  let mockContext: CLIContext;

  beforeEach(() => {
    mockContext = {
      deps: {
        cwd: '/test/project',
        shopsDir: '/test/project/shops',
        credentialsDir: '/test/project/shops/credentials'
      },
      shopOps: {
        loadConfig: vi.fn(),
        saveConfig: vi.fn(),
        listShops: vi.fn(),
        deleteShop: vi.fn()
      },
      credOps: {
        loadCredentials: vi.fn(),
        saveCredentials: vi.fn()
      },
      devOps: {
        startDev: vi.fn()
      }
    };

    vi.clearAllMocks();
  });

  describe('collectShopData', () => {
    test('collects all shop data successfully', async () => {
      // Arrange
      const { text, select, isCancel } = await import('@clack/prompts');
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')       // shopId
        .mockResolvedValueOnce('Test Shop')       // shopName
        .mockResolvedValueOnce('test.myshopify.com')    // production domain
        .mockResolvedValueOnce('staging.myshopify.com'); // staging domain

      vi.mocked(select).mockResolvedValueOnce('theme-access-app');

      vi.mocked(validateShopId).mockReturnValue({ success: true });
      vi.mocked(validateDomain).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        shopId: 'test-shop',
        shopName: 'Test Shop',
        productionDomain: 'test.myshopify.com',
        stagingDomain: 'staging.myshopify.com',
        authMethod: 'theme-access-app'
      });
    });

    test('returns error when shopId input is cancelled', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(text).mockResolvedValueOnce('cancelled-value');
      vi.mocked(isCancel).mockReturnValue(true);

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Shop creation cancelled');
    });

    test('returns error when shopName input is cancelled', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');
      const { validateShopId } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(isCancel)
        .mockReturnValueOnce(false)  // shopId not cancelled
        .mockReturnValueOnce(true);  // shopName cancelled

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')
        .mockResolvedValueOnce('cancelled');

      vi.mocked(validateShopId).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Shop creation cancelled');
    });

    test('returns error when production domain input is cancelled', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');
      const { validateShopId } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(isCancel)
        .mockReturnValueOnce(false)  // shopId not cancelled
        .mockReturnValueOnce(false)  // shopName not cancelled
        .mockReturnValueOnce(true);  // production domain cancelled

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')
        .mockResolvedValueOnce('Test Shop')
        .mockResolvedValueOnce('cancelled');

      vi.mocked(validateShopId).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Shop creation cancelled');
    });

    test('returns error when staging domain input is cancelled', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(isCancel)
        .mockReturnValueOnce(false)  // shopId
        .mockReturnValueOnce(false)  // shopName
        .mockReturnValueOnce(false)  // production domain
        .mockReturnValueOnce(true);  // staging domain cancelled

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')
        .mockResolvedValueOnce('Test Shop')
        .mockResolvedValueOnce('test.myshopify.com')
        .mockResolvedValueOnce('cancelled');

      vi.mocked(validateShopId).mockReturnValue({ success: true });
      vi.mocked(validateDomain).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Shop creation cancelled');
    });

    test('returns error when auth method input is cancelled', async () => {
      // Arrange
      const { text, select, isCancel } = await import('@clack/prompts');
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(isCancel)
        .mockReturnValueOnce(false)  // shopId
        .mockReturnValueOnce(false)  // shopName
        .mockReturnValueOnce(false)  // production domain
        .mockReturnValueOnce(false)  // staging domain
        .mockReturnValueOnce(true);  // auth method cancelled

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')
        .mockResolvedValueOnce('Test Shop')
        .mockResolvedValueOnce('test.myshopify.com')
        .mockResolvedValueOnce('staging.myshopify.com');

      vi.mocked(select).mockResolvedValueOnce('cancelled');

      vi.mocked(validateShopId).mockReturnValue({ success: true });
      vi.mocked(validateDomain).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Shop creation cancelled');
    });

    test('validates shopId format', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');
      const { validateShopId } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      let validationCallback: ((value: string) => string | undefined) | undefined;
      vi.mocked(text).mockImplementation(async (config: any) => {
        if (config.message?.includes('Shop ID')) {
          validationCallback = config.validate;
          return 'test-shop';
        }
        return 'value';
      });

      vi.mocked(isCancel).mockReturnValue(true); // Exit after shopId
      vi.mocked(validateShopId).mockReturnValue({ success: false, error: 'Invalid format' });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      await collectShopData(mockContext);

      // Assert
      expect(validationCallback).toBeDefined();
      const validationResult = validationCallback!('invalid-id');
      expect(validationResult).toBe('Invalid format');
    });

    test('validates shopId is required', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      let validationCallback: ((value: string) => string | undefined) | undefined;
      vi.mocked(text).mockImplementation(async (config: any) => {
        if (config.message?.includes('Shop ID')) {
          validationCallback = config.validate;
          return 'test-shop';
        }
        return 'value';
      });

      vi.mocked(isCancel).mockReturnValue(true);

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      await collectShopData(mockContext);

      // Assert
      expect(validationCallback).toBeDefined();
      const validationResult = validationCallback!('');
      expect(validationResult).toBe('Shop ID is required');
    });

    test('validates shopId does not already exist', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');
      const { validateShopId } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: ['existing-shop', 'another-shop']
      });

      let validationCallback: ((value: string) => string | undefined) | undefined;
      vi.mocked(text).mockImplementation(async (config: any) => {
        if (config.message?.includes('Shop ID')) {
          validationCallback = config.validate;
          return 'test-shop';
        }
        return 'value';
      });

      vi.mocked(isCancel).mockReturnValue(true);
      vi.mocked(validateShopId).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      await collectShopData(mockContext);

      // Assert
      expect(validationCallback).toBeDefined();
      const validationResult = validationCallback!('existing-shop');
      expect(validationResult).toBe('A shop with this ID already exists');
    });

    test('validates domain format', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      let domainValidationCallback: ((value: string) => string | undefined) | undefined;
      let callCount = 0;
      vi.mocked(text).mockImplementation(async (config: any) => {
        callCount++;
        if (config.message?.includes('domain') || callCount >= 3) {
          domainValidationCallback = config.validate;
        }
        return 'value';
      });

      vi.mocked(isCancel)
        .mockReturnValueOnce(false)  // shopId
        .mockReturnValueOnce(false)  // shopName
        .mockReturnValueOnce(true);  // domain - cancel after capturing

      vi.mocked(validateShopId).mockReturnValue({ success: true });
      vi.mocked(validateDomain).mockReturnValue({ success: false, error: 'Invalid domain' });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      await collectShopData(mockContext);

      // Assert
      expect(domainValidationCallback).toBeDefined();
      const validationResult = domainValidationCallback!('invalid.com');
      expect(validationResult).toBe('Invalid domain');
    });

    test('validates domain is required', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');
      const { validateShopId } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      let domainValidationCallback: ((value: string) => string | undefined) | undefined;
      let callCount = 0;
      vi.mocked(text).mockImplementation(async (config: any) => {
        callCount++;
        if (config.message?.includes('domain') || callCount >= 3) {
          domainValidationCallback = config.validate;
        }
        return 'test.myshopify.com';
      });

      vi.mocked(isCancel)
        .mockReturnValueOnce(false)  // shopId
        .mockReturnValueOnce(false)  // shopName
        .mockReturnValueOnce(true);  // domain - cancel after capturing

      vi.mocked(validateShopId).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      await collectShopData(mockContext);

      // Assert
      expect(domainValidationCallback).toBeDefined();
      const validationResult = domainValidationCallback!('');
      expect(validationResult).toBe('Domain is required');
    });

    test('handles listShops failure gracefully', async () => {
      // Arrange
      const { text, select, isCancel } = await import('@clack/prompts');
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: false,
        error: 'Failed to list shops'
      });

      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')
        .mockResolvedValueOnce('Test Shop')
        .mockResolvedValueOnce('test.myshopify.com')
        .mockResolvedValueOnce('staging.myshopify.com');

      vi.mocked(select).mockResolvedValueOnce('theme-access-app');

      vi.mocked(validateShopId).mockReturnValue({ success: true });
      vi.mocked(validateDomain).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert - Should still work with empty shop list
      expect(result.success).toBe(true);
    });

    test('provides correct auth method options', async () => {
      // Arrange
      const { text, select, isCancel } = await import('@clack/prompts');
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')
        .mockResolvedValueOnce('Test Shop')
        .mockResolvedValueOnce('test.myshopify.com')
        .mockResolvedValueOnce('staging.myshopify.com');

      let selectOptions: any;
      vi.mocked(select).mockImplementation(async (config: any) => {
        selectOptions = config.options;
        return 'theme-access-app';
      });

      vi.mocked(validateShopId).mockReturnValue({ success: true });
      vi.mocked(validateDomain).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      await collectShopData(mockContext);

      // Assert
      expect(selectOptions).toBeDefined();
      expect(selectOptions).toHaveLength(2);
      expect(selectOptions[0]).toMatchObject({
        value: 'theme-access-app',
        label: 'Theme Access App'
      });
      expect(selectOptions[1]).toMatchObject({
        value: 'manual-tokens',
        label: 'Manual Tokens'
      });
    });

    test('supports manual-tokens auth method', async () => {
      // Arrange
      const { text, select, isCancel } = await import('@clack/prompts');
      const { validateShopId, validateDomain } = await import('../../lib/core/validation.js');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(isCancel).mockReturnValue(false);

      vi.mocked(text)
        .mockResolvedValueOnce('test-shop')
        .mockResolvedValueOnce('Test Shop')
        .mockResolvedValueOnce('test.myshopify.com')
        .mockResolvedValueOnce('staging.myshopify.com');

      vi.mocked(select).mockResolvedValueOnce('manual-tokens');

      vi.mocked(validateShopId).mockReturnValue({ success: true });
      vi.mocked(validateDomain).mockReturnValue({ success: true });

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      const result = await collectShopData(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.authMethod).toBe('manual-tokens');
    });

    test('displays correct placeholders for inputs', async () => {
      // Arrange
      const { text, isCancel } = await import('@clack/prompts');

      vi.mocked(mockContext.shopOps.listShops).mockResolvedValue({
        success: true,
        data: []
      });

      const textCalls: any[] = [];
      vi.mocked(text).mockImplementation(async (config: any) => {
        textCalls.push(config);
        return 'value';
      });

      vi.mocked(isCancel).mockReturnValue(true);

      const { collectShopData } = await import('../../lib/core/shop-input.js');

      // Act
      await collectShopData(mockContext);

      // Assert
      expect(textCalls.length).toBeGreaterThan(0);
      expect(textCalls[0]).toBeDefined();
      expect(textCalls[0].placeholder).toBe('my-shop');
    });
  });
});
