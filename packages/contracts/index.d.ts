export type ValidationError = { path: string; message: string };
export type ValidationResult = { valid: boolean; errors: ValidationError[] };
export type SceneDocument = {
  schemaVersion: '0.0';
  sessionId: string;
  revision: number;
  title?: string;
  components: Array<Record<string, unknown> & { id: string; type: string }>;
  actions: Array<Record<string, unknown> & { id: string; type: string }>;
  references: Array<{ id: string; title: string; url: string; source?: string; publishedAt?: string }>;
};
export type UserAction = {
  schemaVersion: '0.0';
  type: 'user_action';
  sessionId: string;
  sceneRevision: number;
  actionId: string;
  componentId: string;
  value?: number | string | boolean | null;
};
export function validateSceneDocument(document: unknown): ValidationResult;
export function validateUserAction(action: unknown, scene?: SceneDocument): ValidationResult;
export function assertSceneDocument<T extends SceneDocument>(document: T): T;
