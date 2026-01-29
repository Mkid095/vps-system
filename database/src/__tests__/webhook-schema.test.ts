/**
 * Webhook Schema Verification Tests
 *
 * These tests verify the database schema structure for webhooks and webhook_deliveries tables
 * without requiring a live database connection. They validate the migration SQL structure.
 *
 * US-006: Implement Deliver Webhook Job - Step 7: Data Layer
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

describe('US-006: Webhook Schema Verification', () => {
  describe('Migration file structure', () => {
    it('should have migration file 007_create_webhooks_tables.sql', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');

      expect(() => {
        readFileSync(migrationPath, 'utf-8');
      }).not.toThrow();
    });

    it('should create webhooks table with all required columns', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for webhooks table creation
      expect(migrationSQL).toContain('CREATE TABLE control_plane.webhooks');

      // Check for required columns
      expect(migrationSQL).toContain('id UUID PRIMARY KEY');
      expect(migrationSQL).toContain('project_id TEXT NOT NULL');
      expect(migrationSQL).toContain('event_type TEXT NOT NULL');
      expect(migrationSQL).toContain('url TEXT NOT NULL');
      expect(migrationSQL).toContain('http_method TEXT NOT NULL');
      expect(migrationSQL).toContain('headers JSONB');
      expect(migrationSQL).toContain('disabled BOOLEAN');
      expect(migrationSQL).toContain('disabled_at TIMESTAMPTZ');
      expect(migrationSQL).toContain('disabled_reason TEXT');
      expect(migrationSQL).toContain('consecutive_failures INTEGER');
      expect(migrationSQL).toContain('last_delivery_at TIMESTAMPTZ');
      expect(migrationSQL).toContain('last_failure_at TIMESTAMPTZ');
      expect(migrationSQL).toContain('created_at TIMESTAMPTZ');
      expect(migrationSQL).toContain('updated_at TIMESTAMPTZ');
    });

    it('should create webhook_deliveries table with all required columns', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for webhook_deliveries table creation
      expect(migrationSQL).toContain('CREATE TABLE control_plane.webhook_deliveries');

      // Check for required columns
      expect(migrationSQL).toContain('id UUID PRIMARY KEY');
      expect(migrationSQL).toContain('webhook_id UUID NOT NULL REFERENCES');
      expect(migrationSQL).toContain('event_id TEXT');
      expect(migrationSQL).toContain('project_id TEXT');
      expect(migrationSQL).toContain('event_type TEXT NOT NULL');
      expect(migrationSQL).toContain('status TEXT NOT NULL');
      expect(migrationSQL).toContain('http_status_code INTEGER');
      expect(migrationSQL).toContain('response_body TEXT');
      expect(migrationSQL).toContain('error_message TEXT');
      expect(migrationSQL).toContain('attempts INTEGER NOT NULL');
      expect(migrationSQL).toContain('next_retry_at TIMESTAMPTZ');
      expect(migrationSQL).toContain('duration_ms INTEGER');
      expect(migrationSQL).toContain('delivered_at TIMESTAMPTZ');
      expect(migrationSQL).toContain('created_at TIMESTAMPTZ');
    });

    it('should create proper indexes on webhooks table', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for indexes
      expect(migrationSQL).toContain('CREATE INDEX idx_webhooks_project_id');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhooks_event_type');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhooks_disabled');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhooks_project_event');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhooks_consecutive_failures');
    });

    it('should create proper indexes on webhook_deliveries table', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for indexes
      expect(migrationSQL).toContain('CREATE INDEX idx_webhook_deliveries_webhook_id');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhook_deliveries_event_id');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhook_deliveries_status');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhook_deliveries_created_at');
      expect(migrationSQL).toContain('CREATE INDEX idx_webhook_deliveries_webhook_status');
    });

    it('should have proper constraints on webhooks table', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for constraints
      expect(migrationSQL).toContain('CONSTRAINT webhooks_url_not_empty');
      expect(migrationSQL).toContain('CONSTRAINT webhooks_consecutive_failures_not_negative');
      expect(migrationSQL).toContain('CONSTRAINT webhooks_project_id_not_empty');
      expect(migrationSQL).toContain('CONSTRAINT webhooks_event_type_not_empty');
    });

    it('should have proper constraints on webhook_deliveries table', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for constraints
      expect(migrationSQL).toContain('CONSTRAINT webhook_deliveries_attempts_positive');
      expect(migrationSQL).toContain('CONSTRAINT webhook_deliveries_status_valid');
    });

    it('should have CASCADE delete on webhook_deliveries foreign key', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for CASCADE delete
      expect(migrationSQL).toContain('ON DELETE CASCADE');
    });

    it('should have proper CHECK constraints for status enum', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for status check constraint
      expect(migrationSQL).toContain("'pending'");
      expect(migrationSQL).toContain("'delivering'");
      expect(migrationSQL).toContain("'delivered'");
      expect(migrationSQL).toContain("'failed'");
      expect(migrationSQL).toContain("'permanently_failed'");
      expect(migrationSQL).toContain("'disabled'");
    });

    it('should have proper CHECK constraints for http_method enum', () => {
      const migrationPath = join(__dirname, '../../migrations/007_create_webhooks_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Check for http_method check constraint
      expect(migrationSQL).toContain("CHECK (http_method IN ('POST', 'PUT', 'PATCH'))");
    });
  });

  describe('TypeScript types file', () => {
    it('should have webhooks.types.ts file', () => {
      const typesPath = join(__dirname, '../../types/webhooks.types.ts');

      expect(() => {
        readFileSync(typesPath, 'utf-8');
      }).not.toThrow();
    });

    it('should export Webhook interface', () => {
      const typesPath = join(__dirname, '../../types/webhooks.types.ts');
      const typesContent = readFileSync(typesPath, 'utf-8');

      expect(typesContent).toContain('export interface Webhook');
      expect(typesContent).toContain('id: string');
      expect(typesContent).toContain('project_id: string');
      expect(typesContent).toContain('event_type: string');
      expect(typesContent).toContain('url: string');
      expect(typesContent).toContain('http_method: WebhookHttpMethod');
    });

    it('should export WebhookDelivery interface', () => {
      const typesPath = join(__dirname, '../../types/webhooks.types.ts');
      const typesContent = readFileSync(typesPath, 'utf-8');

      expect(typesContent).toContain('export interface WebhookDelivery');
      expect(typesContent).toContain('webhook_id: string');
      expect(typesContent).toContain('status: WebhookDeliveryStatus');
      expect(typesContent).toContain('http_status_code');
      expect(typesContent).toContain('attempts: number');
    });

    it('should export WebhookDeliveryStatus enum', () => {
      const typesPath = join(__dirname, '../../types/webhooks.types.ts');
      const typesContent = readFileSync(typesPath, 'utf-8');

      expect(typesContent).toContain('export enum WebhookDeliveryStatus');
      expect(typesContent).toContain('PENDING = \'pending\'');
      expect(typesContent).toContain('DELIVERING = \'delivering\'');
      expect(typesContent).toContain('DELIVERED = \'delivered\'');
      expect(typesContent).toContain('FAILED = \'failed\'');
      expect(typesContent).toContain('PERMANENTLY_FAILED = \'permanently_failed\'');
      expect(typesContent).toContain('DISABLED = \'disabled\'');
    });

    it('should export WebhookDeliveryErrorType enum', () => {
      const typesPath = join(__dirname, '../../types/webhooks.types.ts');
      const typesContent = readFileSync(typesPath, 'utf-8');

      expect(typesContent).toContain('export enum WebhookDeliveryErrorType');
      expect(typesContent).toContain('INVALID_URL');
      expect(typesContent).toContain('URL_NOT_REACHABLE');
      expect(typesContent).toContain('REQUEST_TIMEOUT');
    });
  });

  describe('Handler file', () => {
    it('should have deliver-webhook.handler.ts file', () => {
      const handlerPath = join(__dirname, '../jobs/deliver-webhook.handler.ts');

      expect(() => {
        readFileSync(handlerPath, 'utf-8');
      }).not.toThrow();
    });

    it('should export deliverWebhookHandler function', () => {
      const handlerPath = join(__dirname, '../jobs/deliver-webhook.handler.ts');
      const handlerContent = readFileSync(handlerPath, 'utf-8');

      expect(handlerContent).toContain('export const deliverWebhookHandler');
      expect(handlerContent).toContain('async function');
    });
  });

  describe('Type exports', () => {
    it('should export webhook types from main index', () => {
      const indexPath = join(__dirname, '../index.ts');
      const indexContent = readFileSync(indexPath, 'utf-8');

      expect(indexContent).toContain('WEBHOOK TYPES EXPORT');
      expect(indexContent).toContain('Webhook,');
      expect(indexContent).toContain('WebhookDelivery,');
      expect(indexContent).toContain('WebhookDeliveryStatus,');
      expect(indexContent).toContain('WebhookDeliveryErrorType');
    });
  });
});
