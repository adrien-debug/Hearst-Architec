'use strict';

import * as THREE from 'three';
import { WorldSnapPoint, isInForbiddenZone, getWorldForbiddenZones } from './cable-snap-points';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES - Système de Zones de Câblage
// ═══════════════════════════════════════════════════════════════════════════

export type ZoneType = 
  | 'passage'     // Allées de circulation - hauteur minimum 3m
  | 'technical'   // Zone technique - hauteur selon équipement
  | 'forbidden'   // Zone interdite - pas de câbles
  | 'equipment';  // Zone équipement - hauteur équipement + marge

export interface CableZone {
  id: string;
  type: ZoneType;
  bounds: THREE.Box3;
  minCableHeight: number;    // Hauteur minimum pour les câbles (mètres)
  maxCableHeight: number;    // Hauteur maximum (mètres)
  preferredHeight: number;   // Hauteur préférée
  objectId?: string;         // ID de l'objet associé (si zone équipement)
  reason?: string;           // Raison de la zone (pour forbidden)
}

export interface CableHeightConfig {
  minPassageHeight: number;     // Hauteur min allées (3m par défaut)
  minClearanceAboveEquipment: number;  // Clearance au-dessus équipement (0.3m)
  defaultTrayHeight: number;    // Hauteur par défaut des chemins (3.5m)
  maxHeight: number;            // Hauteur max (6m)
}

export const DEFAULT_HEIGHT_CONFIG: CableHeightConfig = {
  minPassageHeight: 3.0,
  minClearanceAboveEquipment: 0.3,
  defaultTrayHeight: 3.5,
  maxHeight: 6.0,
};

// ═══════════════════════════════════════════════════════════════════════════
// OBJET SIMPLIFIÉ POUR LES CALCULS
// ═══════════════════════════════════════════════════════════════════════════

export interface SimpleObject {
  id: string;
  name: string;
  objectType: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  dimensions: { width: number; height: number; depth: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DES ZONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Génère toutes les zones de câblage à partir des objets de la scène
 */
export function generateCableZones(
  objects: SimpleObject[],
  config: CableHeightConfig = DEFAULT_HEIGHT_CONFIG
): CableZone[] {
  const zones: CableZone[] = [];

  objects.forEach(obj => {
    // Dimensions en mètres
    const w = obj.dimensions.width / 1000;
    const h = obj.dimensions.height / 1000;
    const d = obj.dimensions.depth / 1000;

    // Zone équipement (autour de l'objet)
    const equipmentZone = createEquipmentZone(obj, w, h, d, config);
    zones.push(equipmentZone);

    // Zones interdites spécifiques à l'équipement
    const forbiddenZones = getWorldForbiddenZones(
      obj.objectType,
      obj.position,
      obj.rotation,
      obj.dimensions
    );

    forbiddenZones.forEach((fz, idx) => {
      zones.push({
        id: `${obj.id}-forbidden-${idx}`,
        type: 'forbidden',
        bounds: createBoundsFromZone(fz),
        minCableHeight: 0,
        maxCableHeight: 0,
        preferredHeight: 0,
        objectId: obj.id,
        reason: fz.reason,
      });
    });
  });

  // Ajouter les allées de passage entre équipements
  const passageZones = generatePassageZones(objects, zones, config);
  zones.push(...passageZones);

  return zones;
}

/**
 * Crée une zone équipement
 */
function createEquipmentZone(
  obj: SimpleObject,
  w: number,
  h: number,
  d: number,
  config: CableHeightConfig
): CableZone {
  // Marge autour de l'équipement
  const margin = 0.5;
  
  // Créer la bounding box avec rotation
  const halfExtents = new THREE.Vector3(w / 2 + margin, h / 2, d / 2 + margin);
  
  // Pour simplifier, on ignore la rotation pour la bounding box
  // (les zones sont des AABB - Axis Aligned Bounding Boxes)
  const min = obj.position.clone().sub(halfExtents);
  const max = obj.position.clone().add(halfExtents);
  max.y = obj.position.y + h / 2;  // Haut de l'équipement
  
  const topOfEquipment = obj.position.y + h;
  const minCableHeight = topOfEquipment + config.minClearanceAboveEquipment;
  
  return {
    id: `${obj.id}-equipment`,
    type: 'equipment',
    bounds: new THREE.Box3(min, max),
    minCableHeight,
    maxCableHeight: config.maxHeight,
    preferredHeight: Math.max(minCableHeight, config.defaultTrayHeight),
    objectId: obj.id,
  };
}

/**
 * Crée une bounding box à partir d'une zone interdite
 */
function createBoundsFromZone(
  zone: { worldPosition: THREE.Vector3; size: THREE.Vector3; type: string }
): THREE.Box3 {
  const halfSize = zone.size.clone().multiplyScalar(0.5);
  return new THREE.Box3(
    zone.worldPosition.clone().sub(halfSize),
    zone.worldPosition.clone().add(halfSize)
  );
}

/**
 * Génère les zones de passage (allées entre équipements)
 */
function generatePassageZones(
  objects: SimpleObject[],
  existingZones: CableZone[],
  config: CableHeightConfig
): CableZone[] {
  const passages: CableZone[] = [];
  
  // Créer une grille de zones de passage couvrant toute la zone de travail
  if (objects.length === 0) return passages;

  // Trouver les limites de la scène
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  objects.forEach(obj => {
    const w = obj.dimensions.width / 2000;
    const d = obj.dimensions.depth / 2000;
    minX = Math.min(minX, obj.position.x - w);
    maxX = Math.max(maxX, obj.position.x + w);
    minZ = Math.min(minZ, obj.position.z - d);
    maxZ = Math.max(maxZ, obj.position.z + d);
  });

  // Étendre les limites pour les allées périmétriques
  const extension = 5;
  minX -= extension;
  maxX += extension;
  minZ -= extension;
  maxZ += extension;

  // Zone de passage par défaut (toute la zone de travail)
  // Les zones d'équipement et forbidden seront soustraites lors du calcul de hauteur
  passages.push({
    id: 'main-passage',
    type: 'passage',
    bounds: new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(maxX, config.maxHeight, maxZ)
    ),
    minCableHeight: config.minPassageHeight,
    maxCableHeight: config.maxHeight,
    preferredHeight: config.defaultTrayHeight,
  });

  return passages;
}

// ═══════════════════════════════════════════════════════════════════════════
// CALCUL DE HAUTEUR OPTIMALE
// ═══════════════════════════════════════════════════════════════════════════

export interface HeightCalculationResult {
  height: number;
  reason: string;
  warnings: string[];
  isValid: boolean;
}

/**
 * Calcule la hauteur optimale pour un câble entre deux points
 */
export function calculateOptimalHeight(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  zones: CableZone[],
  config: CableHeightConfig = DEFAULT_HEIGHT_CONFIG
): HeightCalculationResult {
  const warnings: string[] = [];
  
  // Échantillonner le chemin entre les deux points
  const sampleCount = Math.max(10, Math.ceil(startPoint.distanceTo(endPoint) * 2));
  const samples: THREE.Vector3[] = [];
  
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    samples.push(new THREE.Vector3().lerpVectors(startPoint, endPoint, t));
  }

  // Trouver la hauteur minimum requise sur tout le parcours
  let requiredMinHeight = config.minPassageHeight;
  let maxEquipmentHeight = 0;

  samples.forEach(sample => {
    const zoneInfo = getZoneAtPoint(sample, zones);
    
    if (zoneInfo.type === 'forbidden') {
      warnings.push(`Chemin passe par zone interdite: ${zoneInfo.reason}`);
    }
    
    if (zoneInfo.type === 'equipment' && zoneInfo.minCableHeight > requiredMinHeight) {
      requiredMinHeight = zoneInfo.minCableHeight;
      maxEquipmentHeight = Math.max(maxEquipmentHeight, zoneInfo.minCableHeight);
    }
  });

  // Déterminer la hauteur optimale
  let optimalHeight = config.defaultTrayHeight;
  let reason = 'Hauteur standard';

  if (requiredMinHeight > config.defaultTrayHeight) {
    optimalHeight = requiredMinHeight;
    reason = `Hauteur ajustée pour passer au-dessus des équipements (${maxEquipmentHeight.toFixed(2)}m requis)`;
  }

  // Vérifier si la hauteur de départ ou d'arrivée impose une contrainte
  const startHeight = startPoint.y;
  const endHeight = endPoint.y;
  
  if (startHeight > config.minPassageHeight || endHeight > config.minPassageHeight) {
    const connectionHeight = Math.max(startHeight, endHeight);
    if (connectionHeight > optimalHeight) {
      optimalHeight = connectionHeight;
      reason = `Hauteur alignée sur point de connexion (${connectionHeight.toFixed(2)}m)`;
    }
  }

  // Limiter à la hauteur max
  if (optimalHeight > config.maxHeight) {
    optimalHeight = config.maxHeight;
    warnings.push(`Hauteur limitée au maximum (${config.maxHeight}m)`);
  }

  return {
    height: optimalHeight,
    reason,
    warnings,
    isValid: warnings.filter(w => w.includes('interdite')).length === 0,
  };
}

/**
 * Calcule la hauteur optimale pour un segment de câble passant par plusieurs points
 */
export function calculateSegmentHeight(
  points: THREE.Vector3[],
  zones: CableZone[],
  config: CableHeightConfig = DEFAULT_HEIGHT_CONFIG
): HeightCalculationResult {
  if (points.length < 2) {
    return {
      height: config.defaultTrayHeight,
      reason: 'Pas assez de points',
      warnings: [],
      isValid: true,
    };
  }

  // Calculer pour chaque segment
  const segmentResults: HeightCalculationResult[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    segmentResults.push(calculateOptimalHeight(points[i], points[i + 1], zones, config));
  }

  // Prendre la hauteur max de tous les segments pour cohérence
  const maxHeight = Math.max(...segmentResults.map(r => r.height));
  const allWarnings = segmentResults.flatMap(r => r.warnings);
  const isValid = segmentResults.every(r => r.isValid);

  return {
    height: maxHeight,
    reason: `Hauteur uniforme sur ${points.length - 1} segments`,
    warnings: Array.from(new Set(allWarnings)),  // Dédupliquer
    isValid,
  };
}

/**
 * Obtient les informations de zone à un point donné
 */
export function getZoneAtPoint(
  point: THREE.Vector3,
  zones: CableZone[]
): { type: ZoneType; minCableHeight: number; reason?: string } {
  // Priorité: forbidden > equipment > passage
  
  // Vérifier zones interdites d'abord
  for (const zone of zones) {
    if (zone.type === 'forbidden' && zone.bounds.containsPoint(point)) {
      return { type: 'forbidden', minCableHeight: 0, reason: zone.reason };
    }
  }

  // Vérifier zones équipement
  for (const zone of zones) {
    if (zone.type === 'equipment' && zone.bounds.containsPoint(point)) {
      return { type: 'equipment', minCableHeight: zone.minCableHeight };
    }
  }

  // Zone de passage par défaut
  const passageZone = zones.find(z => z.type === 'passage');
  return { 
    type: 'passage', 
    minCableHeight: passageZone?.minCableHeight || DEFAULT_HEIGHT_CONFIG.minPassageHeight 
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DE CHEMIN OPTIMISÉ
// ═══════════════════════════════════════════════════════════════════════════

export interface CablePathSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  height: number;
  type: 'horizontal' | 'vertical' | 'ramp';
}

/**
 * Génère un chemin de câble optimisé entre deux snap points
 * Inclut les changements de hauteur nécessaires
 */
export function generateOptimizedPath(
  startPoint: WorldSnapPoint,
  endPoint: WorldSnapPoint,
  zones: CableZone[],
  config: CableHeightConfig = DEFAULT_HEIGHT_CONFIG
): CablePathSegment[] {
  const segments: CablePathSegment[] = [];
  
  const startPos = startPoint.position;
  const endPos = endPoint.position;
  
  // Calculer la hauteur optimale pour le tronçon principal
  const heightResult = calculateOptimalHeight(startPos, endPos, zones, config);
  const mainHeight = heightResult.height;

  // Point 1: Départ - montée verticale si nécessaire
  if (startPos.y < mainHeight - 0.1) {
    // Sortir dans la direction du snap point, puis monter
    const exitPoint = startPos.clone().add(
      startPoint.direction.clone().multiplyScalar(0.3)
    );
    
    segments.push({
      start: startPos.clone(),
      end: exitPoint,
      height: startPos.y,
      type: 'horizontal',
    });

    // Montée verticale
    const topPoint = exitPoint.clone();
    topPoint.y = mainHeight;
    
    segments.push({
      start: exitPoint,
      end: topPoint,
      height: mainHeight,
      type: 'vertical',
    });

    // Tronçon horizontal principal
    const endExitPoint = endPos.clone().add(
      endPoint.direction.clone().multiplyScalar(0.3)
    );
    const topEndPoint = endExitPoint.clone();
    topEndPoint.y = mainHeight;

    segments.push({
      start: topPoint,
      end: topEndPoint,
      height: mainHeight,
      type: 'horizontal',
    });

    // Descente vers le point d'arrivée si nécessaire
    if (endPos.y < mainHeight - 0.1) {
      segments.push({
        start: topEndPoint,
        end: endExitPoint,
        height: endPos.y,
        type: 'vertical',
      });

      segments.push({
        start: endExitPoint,
        end: endPos.clone(),
        height: endPos.y,
        type: 'horizontal',
      });
    } else {
      segments.push({
        start: topEndPoint,
        end: endPos.clone(),
        height: endPos.y,
        type: 'horizontal',
      });
    }
  } else {
    // Les deux points sont déjà à la bonne hauteur - chemin direct
    segments.push({
      start: startPos.clone(),
      end: endPos.clone(),
      height: Math.max(startPos.y, endPos.y),
      type: Math.abs(startPos.y - endPos.y) > 0.1 ? 'ramp' : 'horizontal',
    });
  }

  return segments;
}

// ═══════════════════════════════════════════════════════════════════════════
// DÉTECTION DE COLLISION
// ═══════════════════════════════════════════════════════════════════════════

export interface CollisionResult {
  hasCollision: boolean;
  collisionPoints: THREE.Vector3[];
  collidingObjects: string[];
  suggestions: string[];
}

/**
 * Vérifie si un chemin de câble entre en collision avec des zones interdites
 */
export function checkPathCollisions(
  path: CablePathSegment[],
  zones: CableZone[],
  objects: SimpleObject[]
): CollisionResult {
  const collisionPoints: THREE.Vector3[] = [];
  const collidingObjects: Set<string> = new Set();
  const suggestions: string[] = [];

  path.forEach(segment => {
    // Échantillonner le segment
    const sampleCount = Math.max(5, Math.ceil(
      segment.start.distanceTo(segment.end) * 2
    ));

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const point = new THREE.Vector3().lerpVectors(segment.start, segment.end, t);

      // Vérifier contre chaque zone interdite
      for (const zone of zones) {
        if (zone.type === 'forbidden' && zone.bounds.containsPoint(point)) {
          collisionPoints.push(point.clone());
          if (zone.objectId) {
            collidingObjects.add(zone.objectId);
          }
        }
      }

      // Vérifier collision directe avec équipements
      for (const obj of objects) {
        const check = isInForbiddenZone(point, obj.objectType, obj.position, obj.rotation);
        if (check.forbidden) {
          collisionPoints.push(point.clone());
          collidingObjects.add(obj.id);
          if (check.reason && !suggestions.includes(check.reason)) {
            suggestions.push(`Éviter: ${check.reason} (${obj.name})`);
          }
        }
      }
    }
  });

  return {
    hasCollision: collisionPoints.length > 0,
    collisionPoints,
    collidingObjects: Array.from(collidingObjects),
    suggestions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES DE CHEMINS DE CÂBLES
// ═══════════════════════════════════════════════════════════════════════════

export type CableTrayType = 'ladder' | 'wire-mesh' | 'conduit' | 'busbar';

export interface CableTrayRecommendation {
  type: CableTrayType;
  width: number;
  reason: string;
}

/**
 * Recommande le type de chemin de câbles selon le contexte
 */
export function recommendCableTrayType(
  startPoint: WorldSnapPoint,
  endPoint: WorldSnapPoint,
  cableTypes: ('power' | 'data' | 'control' | 'earth')[]
): CableTrayRecommendation {
  // Puissance HT → Busbar
  if (startPoint.connectionType === 'power-ht' || endPoint.connectionType === 'power-ht') {
    return {
      type: 'busbar',
      width: Math.max(startPoint.cableWidth, endPoint.cableWidth),
      reason: 'Jeu de barres recommandé pour Haute Tension',
    };
  }

  // Puissance principale → Ladder (échelle)
  if (cableTypes.includes('power') && !cableTypes.includes('data')) {
    const width = Math.max(startPoint.cableWidth, endPoint.cableWidth, 300);
    return {
      type: 'ladder',
      width: width >= 400 ? 600 : 300,
      reason: 'Chemin échelle pour câbles de puissance',
    };
  }

  // Data uniquement → Wire mesh (grillagé)
  if (cableTypes.includes('data') && !cableTypes.includes('power')) {
    return {
      type: 'wire-mesh',
      width: 200,
      reason: 'Chemin grillagé pour câbles data',
    };
  }

  // Contrôle → Conduit
  if (cableTypes.length === 1 && cableTypes[0] === 'control') {
    return {
      type: 'conduit',
      width: 50,
      reason: 'Conduit pour câbles de contrôle',
    };
  }

  // Mixte → Ladder standard
  return {
    type: 'ladder',
    width: 300,
    reason: 'Chemin échelle standard (mixte)',
  };
}
