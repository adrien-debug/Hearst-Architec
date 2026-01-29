// ═══════════════════════════════════════════════════════════════════════════
// SMART ALIGNMENT ENGINE v3 - Version simplifiée
// Ne détecte QUE les vrais problèmes critiques
// ═══════════════════════════════════════════════════════════════════════════

export interface SceneObject {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  rotation?: { x: number; y: number; z: number };
}

export interface AlignmentSuggestion {
  id: string;
  type: 'position' | 'alignment' | 'spacing' | 'connection' | 'warning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  objectIds: string[];
  suggestedPosition?: { x: number; y: number; z: number };
  suggestedRotation?: { x: number; y: number; z: number };
  rule: string;
  autoApply?: boolean;
}

export interface AlignmentRule {
  id: string;
  name: string;
  description: string;
  category: 'electrical' | 'spacing' | 'alignment' | 'safety';
  check: (objects: SceneObject[]) => AlignmentSuggestion[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES - Seulement pour vrais problèmes
// ═══════════════════════════════════════════════════════════════════════════

export const ELECTRICAL_RULES = {
  // Distances critiques seulement
  CONTAINER_MIN_SPACING: 2, // Moins de 2m = collision potentielle
  PDU_TO_CONTAINER_MAX: 30, // Plus de 30m = chute tension critique
  TRANSFORMER_TO_CONTAINER_MAX: 50, // Plus de 50m = trop loin
  
  // Allées
  FIRE_ACCESS_MIN: 4,
  
  // On ne touche PAS aux alignements mineurs
  GRID_SIZE: 1,
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getObjectType(obj: SceneObject): string {
  const type = obj.type.toLowerCase();
  const name = obj.name.toLowerCase();
  
  if (type.includes('container') || type.includes('hd5') || type.includes('antspace') || 
      name.includes('container') || name.includes('hd5') || name.includes('antspace')) return 'container';
  if (type.includes('cooling') || type.includes('ec2') || name.includes('cooling')) return 'cooling';
  if (type.includes('pdu') || type.includes('distribution') || type.includes('skid') ||
      name.includes('pdu') || name.includes('distribution')) return 'pdu';
  if ((type.includes('transformer') || name.includes('transformer') || name.includes('transfo')) && 
      !type.includes('rmu') && !name.includes('rmu')) return 'transformer';
  if (type.includes('rmu') || name.includes('rmu')) return 'rmu';
  return 'other';
}

function distance2D(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.z - b.z, 2));
}

function findNearest(obj: SceneObject, candidates: SceneObject[]): SceneObject | null {
  if (candidates.length === 0) return null;
  
  let nearest = candidates[0];
  let minDist = distance2D(obj.position, nearest.position);
  
  for (const candidate of candidates) {
    const dist = distance2D(obj.position, candidate.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = candidate;
    }
  }
  
  return nearest;
}

function checkCollision(a: SceneObject, b: SceneObject): boolean {
  const aWidth = a.dimensions.width / 1000;
  const aDepth = a.dimensions.depth / 1000;
  const bWidth = b.dimensions.width / 1000;
  const bDepth = b.dimensions.depth / 1000;
  
  const overlapX = Math.abs(a.position.x - b.position.x) < (aWidth + bWidth) / 2;
  const overlapZ = Math.abs(a.position.z - b.position.z) < (aDepth + bDepth) / 2;
  
  return overlapX && overlapZ;
}

// ═══════════════════════════════════════════════════════════════════════════
// RÈGLES - SEULEMENT LES VRAIS PROBLÈMES
// ═══════════════════════════════════════════════════════════════════════════

const rules: AlignmentRule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // RÈGLE 1: Collision entre objets
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'collision',
    name: 'Collision',
    description: 'Détection de collision entre objets',
    category: 'safety',
    check: (objects) => {
      const suggestions: AlignmentSuggestion[] = [];
      
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const a = objects[i];
          const b = objects[j];
          
          // Ignorer cooling au-dessus des containers
          if ((getObjectType(a) === 'cooling' && getObjectType(b) === 'container') ||
              (getObjectType(a) === 'container' && getObjectType(b) === 'cooling')) {
            continue;
          }
          
          if (checkCollision(a, b)) {
            suggestions.push({
              id: `collision-${a.id}-${b.id}`,
              type: 'warning',
              priority: 'high',
              title: '⚠️ Collision détectée',
              description: `${a.name} et ${b.name} se chevauchent`,
              objectIds: [a.id, b.id],
              rule: 'collision',
            });
          }
        }
      }
      
      return suggestions;
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // RÈGLE 2: Containers sans alimentation
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'no-power',
    name: 'Alimentation manquante',
    description: 'Containers sans transformateur à proximité',
    category: 'electrical',
    check: (objects) => {
      const suggestions: AlignmentSuggestion[] = [];
      const containers = objects.filter(o => getObjectType(o) === 'container');
      const transformers = objects.filter(o => getObjectType(o) === 'transformer');
      
      if (containers.length > 0 && transformers.length === 0) {
        suggestions.push({
          id: 'no-transformer',
          type: 'warning',
          priority: 'high',
          title: '⚡ Aucun transformateur',
          description: `${containers.length} containers sans source électrique`,
          objectIds: [],
          rule: 'no-power',
        });
      }
      
      // Vérifier containers trop éloignés du transformateur le plus proche
      for (const container of containers) {
        const nearest = findNearest(container, transformers);
        if (nearest) {
          const dist = distance2D(container.position, nearest.position);
          if (dist > ELECTRICAL_RULES.TRANSFORMER_TO_CONTAINER_MAX) {
            suggestions.push({
              id: `far-from-power-${container.id}`,
              type: 'warning',
              priority: 'high',
              title: '⚡ Trop loin du transfo',
              description: `${container.name} à ${dist.toFixed(0)}m (max: ${ELECTRICAL_RULES.TRANSFORMER_TO_CONTAINER_MAX}m)`,
              objectIds: [container.id, nearest.id],
              rule: 'no-power',
            });
          }
        }
      }
      
      return suggestions;
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // RÈGLE 3: PDU trop loin des containers
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pdu-distance',
    name: 'Distance PDU',
    description: 'PDU trop loin = chute de tension',
    category: 'electrical',
    check: (objects) => {
      const suggestions: AlignmentSuggestion[] = [];
      const pdus = objects.filter(o => getObjectType(o) === 'pdu');
      const containers = objects.filter(o => getObjectType(o) === 'container');
      
      for (const pdu of pdus) {
        const nearest = findNearest(pdu, containers);
        if (nearest) {
          const dist = distance2D(pdu.position, nearest.position);
          if (dist > ELECTRICAL_RULES.PDU_TO_CONTAINER_MAX) {
            suggestions.push({
              id: `pdu-far-${pdu.id}`,
              type: 'warning',
              priority: 'high',
              title: '🔌 PDU trop loin',
              description: `${dist.toFixed(0)}m du container (max: ${ELECTRICAL_RULES.PDU_TO_CONTAINER_MAX}m)`,
              objectIds: [pdu.id, nearest.id],
              rule: 'pdu-distance',
            });
          }
        }
      }
      
      return suggestions;
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // RÈGLE 4: Containers trop proches (risque collision/maintenance)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'too-close',
    name: 'Espacement minimum',
    description: 'Containers trop proches pour la maintenance',
    category: 'safety',
    check: (objects) => {
      const suggestions: AlignmentSuggestion[] = [];
      const containers = objects.filter(o => getObjectType(o) === 'container');
      
      for (let i = 0; i < containers.length; i++) {
        for (let j = i + 1; j < containers.length; j++) {
          const a = containers[i];
          const b = containers[j];
          const dist = distance2D(a.position, b.position);
          
          // Calculer distance bord à bord
          const aWidth = a.dimensions.width / 1000;
          const bWidth = b.dimensions.width / 1000;
          const gap = dist - (aWidth + bWidth) / 2;
          
          if (gap < ELECTRICAL_RULES.CONTAINER_MIN_SPACING && gap > -1) {
            suggestions.push({
              id: `close-${a.id}-${b.id}`,
              type: 'warning',
              priority: 'medium',
              title: '📏 Espacement réduit',
              description: `${gap.toFixed(1)}m entre containers (min: ${ELECTRICAL_RULES.CONTAINER_MIN_SPACING}m)`,
              objectIds: [a.id, b.id],
              rule: 'too-close',
            });
          }
        }
      }
      
      return suggestions;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// API PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════

export function analyzeScene(objects: SceneObject[]): AlignmentSuggestion[] {
  const allSuggestions: AlignmentSuggestion[] = [];
  
  for (const rule of rules) {
    const suggestions = rule.check(objects);
    allSuggestions.push(...suggestions);
  }
  
  // Trier par priorité
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  allSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return allSuggestions;
}

export function getAutoAlignSuggestions(objects: SceneObject[]): AlignmentSuggestion[] {
  return analyzeScene(objects).filter(s => s.autoApply);
}

export function applyAlignment(
  objects: SceneObject[], 
  suggestion: AlignmentSuggestion
): SceneObject[] {
  if (!suggestion.suggestedPosition) return objects;
  
  return objects.map(obj => {
    if (suggestion.objectIds.includes(obj.id) && suggestion.suggestedPosition) {
      return {
        ...obj,
        position: { ...suggestion.suggestedPosition },
        rotation: suggestion.suggestedRotation || obj.rotation,
      };
    }
    return obj;
  });
}

export function applyAllAutoAlignments(objects: SceneObject[]): SceneObject[] {
  const suggestions = getAutoAlignSuggestions(objects);
  let result = [...objects];
  
  for (const suggestion of suggestions) {
    result = applyAlignment(result, suggestion);
  }
  
  return result;
}

export { rules as alignmentRules };
