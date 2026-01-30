'use strict';

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES - Snap Points Intelligents par Type d'Équipement
// ═══════════════════════════════════════════════════════════════════════════

export type ConnectionType = 
  | 'power-ht'      // Haute tension (transformateur sortie)
  | 'power-bt'      // Basse tension
  | 'power-input'   // Entrée alimentation
  | 'power-output'  // Sortie distribution
  | 'earth'         // Mise à terre
  | 'data'          // Réseau data
  | 'control'       // Câbles de contrôle
  | 'cooling-in'    // Entrée fluide refroidissement
  | 'cooling-out';  // Sortie fluide refroidissement

export interface EquipmentSnapPoint {
  id: string;
  localPosition: THREE.Vector3;  // Position relative au centre de l'objet
  connectionType: ConnectionType;
  direction: THREE.Vector3;      // Direction de sortie du câble
  label: string;
  cableWidth: number;            // Largeur chemin recommandée (mm)
  maxCables: number;             // Nombre max de câbles
  priority: number;              // 1 = principal, 2 = secondaire
}

export interface EquipmentSnapConfig {
  objectType: string;
  displayName: string;
  snapPoints: Omit<EquipmentSnapPoint, 'id'>[];
  forbiddenZones: ForbiddenZone[];  // Zones où ne pas passer de câbles
}

export interface ForbiddenZone {
  type: 'box' | 'cylinder';
  localPosition: THREE.Vector3;
  size: THREE.Vector3;  // Pour box: width, height, depth. Pour cylinder: radius, height, 0
  reason: string;       // Ex: "Sortie air chaud", "Zone de maintenance"
}

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSIONS D'ÉQUIPEMENTS (en mm) - Référence
// ═══════════════════════════════════════════════════════════════════════════

export const EQUIPMENT_DIMENSIONS = {
  'iso-container-40ft': { width: 12192, height: 2896, depth: 2438 },
  'bitmain-cooling-ec2-dt': { width: 12192, height: 1200, depth: 2438 },
  'oil-transformer': { width: 3500, height: 2800, depth: 2500 },
  'pdu': { width: 800, height: 2200, depth: 600 },
  'generator': { width: 6000, height: 2500, depth: 2200 },
  'switchgear': { width: 3000, height: 2200, depth: 1200 },
  'ups': { width: 1200, height: 2000, depth: 800 },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATIONS SNAP POINTS PAR TYPE D'ÉQUIPEMENT
// ═══════════════════════════════════════════════════════════════════════════

export const EQUIPMENT_SNAP_CONFIGS: Record<string, EquipmentSnapConfig> = {
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTAINER ISO 40FT - Contient les miners
  // ─────────────────────────────────────────────────────────────────────────
  'iso-container-40ft': {
    objectType: 'iso-container-40ft',
    displayName: 'Container ISO 40ft',
    snapPoints: [
      // Entrée électrique principale - côté gauche (panneau électrique), niveau bas
      {
        localPosition: new THREE.Vector3(-6.1, -0.8, 0),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(-1, 0, 0),
        label: 'Entrée Élec',
        cableWidth: 300,
        maxCables: 6,
        priority: 1,
      },
      // Entrée électrique avant - pour câbles venant de devant
      {
        localPosition: new THREE.Vector3(-4, -0.8, -1.2),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(0, 0, -1),
        label: 'Entrée Avant',
        cableWidth: 300,
        maxCables: 6,
        priority: 1,
      },
      // Entrée data/réseau - côté gauche, plus haut
      {
        localPosition: new THREE.Vector3(-6.1, 0.3, 0.5),
        connectionType: 'data',
        direction: new THREE.Vector3(-1, 0, 0),
        label: 'Data',
        cableWidth: 100,
        maxCables: 12,
        priority: 2,
      },
      // Mise à terre - au sol, coin gauche
      {
        localPosition: new THREE.Vector3(-6.1, -1.4, -1),
        connectionType: 'earth',
        direction: new THREE.Vector3(0, -1, 0),
        label: 'Terre',
        cableWidth: 50,
        maxCables: 1,
        priority: 1,
      },
    ],
    forbiddenZones: [
      // Zone portes arrière (accès maintenance) - côté droit
      {
        type: 'box',
        localPosition: new THREE.Vector3(7, 0, 0),
        size: new THREE.Vector3(2, 3, 2.5),
        reason: 'Zone d\'accès portes arrière',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTÈME DE REFROIDISSEMENT BITMAIN EC2-DT
  // ─────────────────────────────────────────────────────────────────────────
  'bitmain-cooling-ec2-dt': {
    objectType: 'bitmain-cooling-ec2-dt',
    displayName: 'Refroidissement EC2-DT',
    snapPoints: [
      // Alimentation électrique des ventilateurs
      {
        localPosition: new THREE.Vector3(-5, 0, 1.2),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Alim Ventilateurs',
        cableWidth: 200,
        maxCables: 4,
        priority: 1,
      },
      // Contrôle ventilateurs
      {
        localPosition: new THREE.Vector3(-4, 0, 1.2),
        connectionType: 'control',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Contrôle Ventilateurs',
        cableWidth: 50,
        maxCables: 2,
        priority: 2,
      },
      // Capteurs température
      {
        localPosition: new THREE.Vector3(4, 0, 1.2),
        connectionType: 'data',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Bus Données',
        cableWidth: 50,
        maxCables: 4,
        priority: 2,
      },
      // Mise à terre
      {
        localPosition: new THREE.Vector3(5.5, -0.5, 1),
        connectionType: 'earth',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Terre Cooling',
        cableWidth: 25,
        maxCables: 1,
        priority: 1,
      },
    ],
    forbiddenZones: [
      // Zone sortie air chaud (ventilateurs sur le toit)
      {
        type: 'box',
        localPosition: new THREE.Vector3(0, 1.5, 0),
        size: new THREE.Vector3(11, 2, 2),
        reason: 'Sortie air chaud ventilateurs',
      },
      // Zone entrée air frais (côtés)
      {
        type: 'box',
        localPosition: new THREE.Vector3(0, 0, -1.5),
        size: new THREE.Vector3(12, 1.2, 1),
        reason: 'Entrée air frais',
      },
      {
        type: 'box',
        localPosition: new THREE.Vector3(0, 0, 1.5),
        size: new THREE.Vector3(12, 1.2, 1),
        reason: 'Entrée air frais',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFORMATEUR HUILE - Connexions sur les CÔTÉS (pas le toit)
  // ─────────────────────────────────────────────────────────────────────────
  'oil-transformer': {
    objectType: 'oil-transformer',
    displayName: 'Transformateur',
    snapPoints: [
      // Sortie Haute Tension - côté arrière, niveau bas
      {
        localPosition: new THREE.Vector3(0, -0.5, -1.3),
        connectionType: 'power-ht',
        direction: new THREE.Vector3(0, 0, -1),
        label: 'Entrée HT',
        cableWidth: 150,
        maxCables: 3,
        priority: 1,
      },
      // Sortie Basse Tension - côté avant, niveau bas (vers PDU)
      {
        localPosition: new THREE.Vector3(0, -0.5, 1.3),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Sortie BT',
        cableWidth: 600,
        maxCables: 6,
        priority: 1,
      },
      // Sortie BT droite - pour câbles vers containers
      {
        localPosition: new THREE.Vector3(1.3, -0.5, 0),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(1, 0, 0),
        label: 'Sortie BT Droite',
        cableWidth: 300,
        maxCables: 4,
        priority: 1,
      },
      // Sortie BT gauche - pour câbles vers containers
      {
        localPosition: new THREE.Vector3(-1.3, -0.5, 0),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(-1, 0, 0),
        label: 'Sortie BT Gauche',
        cableWidth: 300,
        maxCables: 4,
        priority: 1,
      },
      // Mise à terre principale - au sol
      {
        localPosition: new THREE.Vector3(-1.2, -1.4, -1),
        connectionType: 'earth',
        direction: new THREE.Vector3(0, -1, 0),
        label: 'Terre',
        cableWidth: 70,
        maxCables: 1,
        priority: 1,
      },
    ],
    forbiddenZones: [
      // Zone radiateurs (ne pas obstruer refroidissement)
      {
        type: 'box',
        localPosition: new THREE.Vector3(-2.5, 0, 0),
        size: new THREE.Vector3(1.5, 2, 2.5),
        reason: 'Radiateurs de refroidissement',
      },
      {
        type: 'box',
        localPosition: new THREE.Vector3(2.5, 0, 0),
        size: new THREE.Vector3(1.5, 2, 2.5),
        reason: 'Radiateurs de refroidissement',
      },
      // Zone sécurité HT
      {
        type: 'cylinder',
        localPosition: new THREE.Vector3(0, 2.5, -1.3),
        size: new THREE.Vector3(1.5, 2, 0),  // radius, height
        reason: 'Zone sécurité Haute Tension',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PDU - Power Distribution Unit - Connexions sur les CÔTÉS
  // ─────────────────────────────────────────────────────────────────────────
  'pdu': {
    objectType: 'pdu',
    displayName: 'PDU',
    snapPoints: [
      // Entrée depuis transformateur - côté arrière, niveau bas
      {
        localPosition: new THREE.Vector3(0, -0.3, -0.45),
        connectionType: 'power-input',
        direction: new THREE.Vector3(0, 0, -1),
        label: 'Entrée',
        cableWidth: 300,
        maxCables: 4,
        priority: 1,
      },
      // Sortie vers container 1 - côté gauche
      {
        localPosition: new THREE.Vector3(-0.45, -0.3, 0),
        connectionType: 'power-output',
        direction: new THREE.Vector3(-1, 0, 0),
        label: 'Sortie C1',
        cableWidth: 200,
        maxCables: 6,
        priority: 1,
      },
      // Sortie vers container 2 - côté droit
      {
        localPosition: new THREE.Vector3(0.45, -0.3, 0),
        connectionType: 'power-output',
        direction: new THREE.Vector3(1, 0, 0),
        label: 'Sortie C2',
        cableWidth: 200,
        maxCables: 6,
        priority: 1,
      },
      // Sortie avant - vers containers en face
      {
        localPosition: new THREE.Vector3(0, -0.3, 0.45),
        connectionType: 'power-output',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Sortie Avant',
        cableWidth: 300,
        maxCables: 8,
        priority: 1,
      },
      // Terre - au sol
      {
        localPosition: new THREE.Vector3(-0.35, -1.0, -0.3),
        connectionType: 'earth',
        direction: new THREE.Vector3(0, -1, 0),
        label: 'Terre',
        cableWidth: 35,
        maxCables: 1,
        priority: 1,
      },
    ],
    forbiddenZones: [
      // Zone porte avant (accès)
      {
        type: 'box',
        localPosition: new THREE.Vector3(0, 0, 0.8),
        size: new THREE.Vector3(1, 2.2, 1),
        reason: 'Zone accès porte avant',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GÉNÉRATEUR
  // ─────────────────────────────────────────────────────────────────────────
  'generator': {
    objectType: 'generator',
    displayName: 'Générateur',
    snapPoints: [
      // Sortie puissance principale
      {
        localPosition: new THREE.Vector3(3.1, 0, 0),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(1, 0, 0),
        label: 'Sortie Puissance',
        cableWidth: 600,
        maxCables: 6,
        priority: 1,
      },
      // Neutre
      {
        localPosition: new THREE.Vector3(3.1, -0.5, 0.5),
        connectionType: 'earth',
        direction: new THREE.Vector3(1, 0, 0),
        label: 'Neutre Générateur',
        cableWidth: 150,
        maxCables: 1,
        priority: 1,
      },
      // Contrôle/Démarrage
      {
        localPosition: new THREE.Vector3(-3.1, 0.5, 0.8),
        connectionType: 'control',
        direction: new THREE.Vector3(-1, 0, 0),
        label: 'Contrôle Démarrage',
        cableWidth: 50,
        maxCables: 4,
        priority: 1,
      },
      // Fuel (pour référence, pas électrique)
      {
        localPosition: new THREE.Vector3(-3.1, -0.8, 0),
        connectionType: 'control',
        direction: new THREE.Vector3(-1, 0, 0),
        label: 'Raccord Fuel',
        cableWidth: 100,
        maxCables: 1,
        priority: 2,
      },
      // Terre
      {
        localPosition: new THREE.Vector3(0, -1.2, 1.1),
        connectionType: 'earth',
        direction: new THREE.Vector3(0, -1, 0.3).normalize(),
        label: 'Terre Générateur',
        cableWidth: 70,
        maxCables: 1,
        priority: 1,
      },
    ],
    forbiddenZones: [
      // Échappement
      {
        type: 'cylinder',
        localPosition: new THREE.Vector3(2.5, 2, 0),
        size: new THREE.Vector3(0.5, 3, 0),
        reason: 'Échappement moteur',
      },
      // Radiateur
      {
        type: 'box',
        localPosition: new THREE.Vector3(-4, 0.5, 0),
        size: new THREE.Vector3(2, 2, 2),
        reason: 'Radiateur refroidissement moteur',
      },
      // Entrée air moteur
      {
        type: 'box',
        localPosition: new THREE.Vector3(0, 1.5, -1.3),
        size: new THREE.Vector3(3, 1, 0.8),
        reason: 'Entrée air moteur',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SWITCHGEAR (Tableau électrique HT/BT)
  // ─────────────────────────────────────────────────────────────────────────
  'switchgear': {
    objectType: 'switchgear',
    displayName: 'Tableau Électrique',
    snapPoints: [
      // Entrée HT
      {
        localPosition: new THREE.Vector3(0, 1.3, -0.7),
        connectionType: 'power-ht',
        direction: new THREE.Vector3(0, 1, -0.5).normalize(),
        label: 'Entrée HT',
        cableWidth: 200,
        maxCables: 3,
        priority: 1,
      },
      // Sorties BT (plusieurs)
      {
        localPosition: new THREE.Vector3(-1, 0, 0.7),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Départ BT 1',
        cableWidth: 300,
        maxCables: 4,
        priority: 1,
      },
      {
        localPosition: new THREE.Vector3(0, 0, 0.7),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Départ BT 2',
        cableWidth: 300,
        maxCables: 4,
        priority: 1,
      },
      {
        localPosition: new THREE.Vector3(1, 0, 0.7),
        connectionType: 'power-bt',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Départ BT 3',
        cableWidth: 300,
        maxCables: 4,
        priority: 1,
      },
      // Terre
      {
        localPosition: new THREE.Vector3(-1.5, -1, 0),
        connectionType: 'earth',
        direction: new THREE.Vector3(-1, -0.5, 0).normalize(),
        label: 'Terre Tableau',
        cableWidth: 70,
        maxCables: 1,
        priority: 1,
      },
      // Bus data
      {
        localPosition: new THREE.Vector3(1.5, 0.8, 0.7),
        connectionType: 'data',
        direction: new THREE.Vector3(0, 0, 1),
        label: 'Bus Communication',
        cableWidth: 50,
        maxCables: 4,
        priority: 2,
      },
    ],
    forbiddenZones: [
      // Zone accès avant
      {
        type: 'box',
        localPosition: new THREE.Vector3(0, 0, 1.5),
        size: new THREE.Vector3(3.2, 2.2, 1.5),
        reason: 'Zone accès maintenance',
      },
      // Zone arrière
      {
        type: 'box',
        localPosition: new THREE.Vector3(0, 0, -1.5),
        size: new THREE.Vector3(3.2, 2.2, 1.5),
        reason: 'Zone accès arrière',
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITAIRES - Génération des Snap Points pour un objet
// ═══════════════════════════════════════════════════════════════════════════

export interface WorldSnapPoint {
  id: string;
  objectId: string;
  objectName: string;
  objectType: string;
  position: THREE.Vector3;       // Position monde
  direction: THREE.Vector3;      // Direction monde
  connectionType: ConnectionType;
  label: string;
  cableWidth: number;
  maxCables: number;
  priority: number;
  currentCables: number;         // Nombre de câbles déjà connectés
}

// Type alias mapping - permet de matcher les types d'objets aux configs
const TYPE_ALIAS_MAP: Record<string, string> = {
  'container': 'iso-container-40ft',
  'iso-container': 'iso-container-40ft',
  'antspace': 'iso-container-40ft',
  'hd5': 'iso-container-40ft',
  'transformer': 'oil-transformer',
  'transfo': 'oil-transformer',
  'cooling': 'bitmain-cooling-ec2-dt',
  'ec2-dt': 'bitmain-cooling-ec2-dt',
  'dry-cooler': 'bitmain-cooling-ec2-dt',
  'pdu': 'pdu',
  'distribution': 'pdu',
  'skid': 'pdu',
  'rmu': 'switchgear',
  'switchgear': 'switchgear',
  'generator': 'generator',
  'genset': 'generator',
};

/**
 * Résout le type d'objet vers la config appropriée
 */
function resolveObjectType(objectType: string): string {
  const typeLC = objectType.toLowerCase();
  
  // Check direct match first
  if (EQUIPMENT_SNAP_CONFIGS[typeLC]) return typeLC;
  
  // Check aliases
  for (const [alias, configType] of Object.entries(TYPE_ALIAS_MAP)) {
    if (typeLC.includes(alias)) {
      return configType;
    }
  }
  
  return objectType; // Return original if no match
}

/**
 * Génère les snap points en coordonnées monde pour un objet
 */
export function generateSnapPointsForObject(
  objectId: string,
  objectName: string,
  objectType: string,
  position: THREE.Vector3,
  rotation: THREE.Euler,
  dimensions: { width: number; height: number; depth: number }
): WorldSnapPoint[] {
  const resolvedType = resolveObjectType(objectType);
  const config = EQUIPMENT_SNAP_CONFIGS[resolvedType];
  if (!config) {
    // Type inconnu: générer des snap points génériques
    return generateGenericSnapPoints(objectId, objectName, objectType, position, rotation, dimensions);
  }

  const snapPoints: WorldSnapPoint[] = [];
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotation);
  
  // Facteur d'échelle basé sur dimensions réelles vs dimensions de référence
  const refDims = EQUIPMENT_DIMENSIONS[resolvedType as keyof typeof EQUIPMENT_DIMENSIONS];
  const scaleX = refDims ? dimensions.width / refDims.width : 1;
  const scaleY = refDims ? dimensions.height / refDims.height : 1;
  const scaleZ = refDims ? dimensions.depth / refDims.depth : 1;

  config.snapPoints.forEach((sp, index) => {
    // Appliquer l'échelle
    const scaledLocalPos = new THREE.Vector3(
      sp.localPosition.x * scaleX,
      sp.localPosition.y * scaleY,
      sp.localPosition.z * scaleZ
    );
    
    // Transformer position locale en monde
    const worldPos = scaledLocalPos.clone().applyMatrix4(rotationMatrix).add(position);
    
    // Transformer direction
    const worldDir = sp.direction.clone().applyMatrix4(rotationMatrix).normalize();

    snapPoints.push({
      id: `${objectId}-snap-${index}`,
      objectId,
      objectName,
      objectType,
      position: worldPos,
      direction: worldDir,
      connectionType: sp.connectionType,
      label: sp.label,
      cableWidth: sp.cableWidth,
      maxCables: sp.maxCables,
      priority: sp.priority,
      currentCables: 0,
    });
  });

  return snapPoints;
}

/**
 * Génère des snap points génériques pour les types inconnus
 */
function generateGenericSnapPoints(
  objectId: string,
  objectName: string,
  objectType: string,
  position: THREE.Vector3,
  rotation: THREE.Euler,
  dimensions: { width: number; height: number; depth: number }
): WorldSnapPoint[] {
  const w = dimensions.width / 2000;
  const h = dimensions.height / 2000;
  const d = dimensions.depth / 2000;
  
  const snapPoints: WorldSnapPoint[] = [];
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotation);

  // Points sur le toit (4 coins)
  const roofPoints = [
    { pos: new THREE.Vector3(-w * 0.7, h, 0), label: 'Toit Gauche' },
    { pos: new THREE.Vector3(w * 0.7, h, 0), label: 'Toit Droit' },
    { pos: new THREE.Vector3(0, h, -d * 0.7), label: 'Toit Avant' },
    { pos: new THREE.Vector3(0, h, d * 0.7), label: 'Toit Arrière' },
  ];

  roofPoints.forEach((rp, i) => {
    const worldPos = rp.pos.clone().applyMatrix4(rotationMatrix).add(position);
    snapPoints.push({
      id: `${objectId}-snap-roof-${i}`,
      objectId,
      objectName,
      objectType,
      position: worldPos,
      direction: new THREE.Vector3(0, 1, 0),
      connectionType: 'power-bt',
      label: rp.label,
      cableWidth: 300,
      maxCables: 6,
      priority: 2,
      currentCables: 0,
    });
  });

  // Point de terre (bas gauche)
  const earthPos = new THREE.Vector3(-w, -h * 0.8, -d * 0.8)
    .applyMatrix4(rotationMatrix)
    .add(position);
  snapPoints.push({
    id: `${objectId}-snap-earth`,
    objectId,
    objectName,
    objectType,
    position: earthPos,
    direction: new THREE.Vector3(-1, -0.5, 0).normalize(),
    connectionType: 'earth',
    label: 'Terre',
    cableWidth: 50,
    maxCables: 1,
    priority: 1,
    currentCables: 0,
  });

  return snapPoints;
}

// ═══════════════════════════════════════════════════════════════════════════
// VÉRIFICATION ZONES INTERDITES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si un point est dans une zone interdite
 */
export function isInForbiddenZone(
  point: THREE.Vector3,
  objectType: string,
  objectPosition: THREE.Vector3,
  objectRotation: THREE.Euler
): { forbidden: boolean; reason?: string } {
  const config = EQUIPMENT_SNAP_CONFIGS[objectType];
  if (!config) return { forbidden: false };

  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(objectRotation);
  const inverseRotation = rotationMatrix.clone().invert();
  
  // Convertir le point en coordonnées locales de l'objet
  const localPoint = point.clone().sub(objectPosition).applyMatrix4(inverseRotation);

  for (const zone of config.forbiddenZones) {
    const zonePos = zone.localPosition;
    
    if (zone.type === 'box') {
      const halfSize = zone.size.clone().multiplyScalar(0.5);
      if (
        Math.abs(localPoint.x - zonePos.x) < halfSize.x &&
        Math.abs(localPoint.y - zonePos.y) < halfSize.y &&
        Math.abs(localPoint.z - zonePos.z) < halfSize.z
      ) {
        return { forbidden: true, reason: zone.reason };
      }
    } else if (zone.type === 'cylinder') {
      const dx = localPoint.x - zonePos.x;
      const dz = localPoint.z - zonePos.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);
      const halfHeight = zone.size.y / 2;
      
      if (distXZ < zone.size.x && Math.abs(localPoint.y - zonePos.y) < halfHeight) {
        return { forbidden: true, reason: zone.reason };
      }
    }
  }

  return { forbidden: false };
}

/**
 * Obtient toutes les zones interdites pour un objet en coordonnées monde
 */
export function getWorldForbiddenZones(
  objectType: string,
  objectPosition: THREE.Vector3,
  objectRotation: THREE.Euler,
  dimensions: { width: number; height: number; depth: number }
): Array<ForbiddenZone & { worldPosition: THREE.Vector3 }> {
  const config = EQUIPMENT_SNAP_CONFIGS[objectType];
  if (!config) return [];

  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(objectRotation);
  const refDims = EQUIPMENT_DIMENSIONS[objectType as keyof typeof EQUIPMENT_DIMENSIONS];
  const scaleX = refDims ? dimensions.width / refDims.width : 1;
  const scaleY = refDims ? dimensions.height / refDims.height : 1;
  const scaleZ = refDims ? dimensions.depth / refDims.depth : 1;

  return config.forbiddenZones.map(zone => {
    const scaledPos = new THREE.Vector3(
      zone.localPosition.x * scaleX,
      zone.localPosition.y * scaleY,
      zone.localPosition.z * scaleZ
    );
    const worldPos = scaledPos.applyMatrix4(rotationMatrix).add(objectPosition);
    
    return {
      ...zone,
      worldPosition: worldPos,
      size: new THREE.Vector3(
        zone.size.x * scaleX,
        zone.size.y * scaleY,
        zone.size.z * scaleZ
      ),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTRAGE ET RECHERCHE DE SNAP POINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trouve le snap point le plus proche compatible avec un type de connexion
 */
export function findNearestCompatibleSnapPoint(
  position: THREE.Vector3,
  allSnapPoints: WorldSnapPoint[],
  connectionType?: ConnectionType,
  maxDistance: number = 2
): WorldSnapPoint | null {
  let nearest: WorldSnapPoint | null = null;
  let minDist = maxDistance;

  for (const sp of allSnapPoints) {
    // Vérifier compatibilité type (si spécifié)
    if (connectionType && sp.connectionType !== connectionType) continue;
    
    // Vérifier capacité
    if (sp.currentCables >= sp.maxCables) continue;

    const dist = position.distanceTo(sp.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = sp;
    }
  }

  return nearest;
}

/**
 * Filtre les snap points par type de connexion
 */
export function filterSnapPointsByType(
  snapPoints: WorldSnapPoint[],
  types: ConnectionType[]
): WorldSnapPoint[] {
  return snapPoints.filter(sp => types.includes(sp.connectionType));
}

/**
 * Groupe les snap points par objet
 */
export function groupSnapPointsByObject(
  snapPoints: WorldSnapPoint[]
): Map<string, WorldSnapPoint[]> {
  const grouped = new Map<string, WorldSnapPoint[]>();
  
  for (const sp of snapPoints) {
    const existing = grouped.get(sp.objectId) || [];
    existing.push(sp);
    grouped.set(sp.objectId, existing);
  }
  
  return grouped;
}
