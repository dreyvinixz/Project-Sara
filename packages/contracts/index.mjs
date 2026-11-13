import Ajv2020 from 'ajv/dist/2020.js';
import sceneSchema from './scene-document-v0.schema.json' with { type: 'json' };
import userActionSchema from './user-action-v0.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const validateSceneShape = ajv.compile(sceneSchema);
const validateActionShape = ajv.compile(userActionSchema);

function unique(items, key, path, errors) {
  const seen = new Set();
  items.forEach((item, index) => {
    if (seen.has(item[key])) errors.push({ path: `${path}[${index}].${key}`, message: `duplicate ${key}: ${item[key]}` });
    seen.add(item[key]);
  });
}

function safeHttpsUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateSceneDocument(document) {
  if (!validateSceneShape(document)) return { valid: false, errors: validateSceneShape.errors.map((error) => ({ path: error.instancePath, message: error.message })) };
  const errors = [];
  const componentIds = new Set(document.components.map(({ id }) => id));
  const referenceIds = new Set(document.references.map(({ id }) => id));
  const eventIds = new Set(document.components.flatMap((component) => component.type === 'news_panel' ? component.items.map(({ id }) => id) : []));
  const actionIds = new Set(document.actions.map(({ id }) => id));

  unique(document.components, 'id', '/components', errors);
  unique(document.actions, 'id', '/actions', errors);
  unique(document.references, 'id', '/references', errors);
  document.components.forEach((component, index) => {
    if (component.type === 'news_panel') {
      unique(component.items, 'id', `/components/${index}/items`, errors);
      component.items.forEach((item, itemIndex) => {
        if (item.referenceId && !referenceIds.has(item.referenceId)) errors.push({ path: `/components/${index}/items/${itemIndex}/referenceId`, message: 'reference does not exist' });
      });
    }
    if (component.type === 'time_series') component.points.forEach((point, pointIndex) => {
      if (point.eventId && !eventIds.has(point.eventId)) errors.push({ path: `/components/${index}/points/${pointIndex}/eventId`, message: 'event does not exist' });
    });
    if (component.type === 'scene_3d') {
      if (component.weights.length !== component.layers.length - 1) errors.push({ path: `/components/${index}/weights`, message: 'one matrix is required per adjacent layer pair' });
      component.weights.forEach((matrix, step) => {
        if (matrix.length !== component.layers[step + 1]) errors.push({ path: `/components/${index}/weights/${step}`, message: 'row count must equal destination layer size' });
        matrix.forEach((row, target) => {
          if (row.length !== component.layers[step]) errors.push({ path: `/components/${index}/weights/${step}/${target}`, message: 'column count must equal source layer size' });
        });
      });
    }
    if (component.type === 'control') {
      if (!actionIds.has(component.actionId)) errors.push({ path: `/components/${index}/actionId`, message: 'action does not exist' });
      if (component.controlType === 'slider' && (component.min === undefined || component.max === undefined || component.value === undefined || component.min >= component.max || component.value < component.min || component.value > component.max)) {
        errors.push({ path: `/components/${index}`, message: 'slider requires min < max and min <= value <= max' });
      }
    }
  });
  document.actions.forEach((action, index) => {
    if (action.type === 'navigate' ? !referenceIds.has(action.referenceId) : !componentIds.has(action.targetComponentId)) errors.push({ path: `/actions/${index}`, message: 'action target does not exist' });
  });
  document.references.forEach((reference, index) => {
    if (!safeHttpsUrl(reference.url)) errors.push({ path: `/references/${index}/url`, message: 'only HTTPS URLs without embedded credentials are allowed' });
  });
  return { valid: errors.length === 0, errors };
}

export function validateUserAction(action, scene) {
  if (!validateActionShape(action)) return { valid: false, errors: validateActionShape.errors.map((error) => ({ path: error.instancePath, message: error.message })) };
  if (!scene) return { valid: true, errors: [] };
  const errors = [];
  const actionDefinition = scene.actions.find(({ id }) => id === action.actionId);
  const component = scene.components.find(({ id }) => id === action.componentId);
  if (action.sessionId !== scene.sessionId || action.sceneRevision !== scene.revision) errors.push({ path: '/', message: 'session or scene revision is stale' });
  if (!actionDefinition || !component) errors.push({ path: '/', message: 'action or component does not exist in the scene' });
  else if (actionDefinition.type === 'navigate' || actionDefinition.targetComponentId !== component.id) errors.push({ path: '/componentId', message: 'component is not the target of this action' });
  return { valid: errors.length === 0, errors };
}

export function assertSceneDocument(document) {
  const result = validateSceneDocument(document);
  if (!result.valid) throw new TypeError(`Invalid SceneDocument: ${result.errors.map(({ path, message }) => `${path} ${message}`).join('; ')}`);
  return document;
}
