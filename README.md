# Hearst Mining Architect

> Bitcoin Mining Farm Design and Management Tool

---

## Equipment Specs (Updated January 2026)

### Container ANTSPACE HD5 (40ft)

| Specification | Value |
|---------------|-------|
| **Slots** | 355 S23 Hydro |
| **Power (ASICs)** | 2,036 kW |
| **Power (+ EC2-DT)** | 2,116 kW |
| **Dimensions** | 12,196 × 2,896 × 2,438 mm |
| **Container Price** | $180,000 (shell only) |
| **Equipped Price** | **$4,907,905** (with 355× S23) |

### Antminer S23 Hydro

| Specification | Value |
|---------------|-------|
| **Hashrate** | 458 TH/s |
| **Power** | 5,736 W |
| **Efficiency** | 12.5 J/TH |
| **Unit Price** | $13,300 |
| **Installed Price** | $13,826 (incl. container) |

### Transformer 5 MVA

| Specification | Value |
|---------------|-------|
| **Capacity** | 5,000 kVA |
| **Containers Served** | 2 (4.232 MW) |
| **Voltage** | 33kV / 400V |
| **Price** | $95,000 |

### EC2-DT Dry Cooler

| Specification | Value |
|---------------|-------|
| **Cooling Capacity** | 1,500 kW |
| **Power Consumption** | 80 kW |
| **Dimensions** | 12,192 × 2,896 × 2,438 mm |
| **Price** | $120,000 |

---

## Investment Calculator

### $200M Investment = 40 Containers

| Item | Qty | Unit Price | Total |
|------|-----|------------|-------|
| Container HD5 + 355 S23 | 40 | $4,907,905 | $196,316,200 |
| Transformer 5 MVA | 20 | $95,000 | $1,900,000 |
| PDU LV Distribution | 20 | $45,000 | $900,000 |
| RMU 33kV | 4 | $85,000 | $340,000 |
| Cabling HT/BT | 1 | $400,000 | $400,000 |
| **TOTAL** | | | **$199,856,200** |

### Site Metrics (40 Containers)

| Metric | Value |
|--------|-------|
| **Containers** | 40 |
| **S23 Machines** | 14,200 |
| **Total Power** | 84.64 MW |
| **Hashrate** | ~6.5 EH/s |
| **$/MW** | $2,362,028 |
| **$/TH** | $30.77 |
| **Surface Required** | ~25,000 m² |

---

## Qatar Site (8 Containers)

| Metric | Value |
|--------|-------|
| **Containers** | 8 |
| **S23 Machines** | 2,840 |
| **Total Power** | 16.93 MW |
| **Transformers** | 4× 5 MVA |
| **Investment** | ~$39.3M |

---

## Key Ratios

| Ratio | Value |
|-------|-------|
| **Container equipped** | $4,907,905 |
| **Per S23 installed** | $13,826 |
| **Per MW** | $2,362,028 |
| **Per TH/s** | $30.77 |
| **Transformer per 2 containers** | 1× 5 MVA |

---

## Build Commands

```bash
# Frontend (Next.js)
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npx tsc --noEmit

# Backend (Express)
cd backend && npm start

# Clean build (if issues)
cd frontend && rm -rf .next && npm run build
```

**TL;DR**: _When in doubt, REBUILD both front & back!_

## Tests Status (Last: 29 Jan 2026)

| Test | Status |
|------|--------|
| Frontend Build | ✅ PASS |
| Frontend Lint | ✅ PASS (0 warnings) |
| Frontend TypeScript | ✅ PASS (0 errors) |
| Console.log removed | ✅ CLEAN (0 occurrences) |
| WebGL Optimization | ✅ OPTIMIZED (render on-demand) |

## Performance Optimizations

### WebGL / Three.js
- ✅ **Render on-demand** : Canvas ne se rafraîchit que quand nécessaire
- ✅ **Invalidation ciblée** : Re-render uniquement sur changement d'objets
- ✅ **Throttling automatique** : Performance min 50% (30 FPS)
- ✅ **Mémoire GPU** : `preserveDrawingBuffer: false` évite les fuites
- ✅ **Alpha disabled** : Meilleure performance (fond opaque)

### Résultats attendus
- 🚀 Réduction de 80% des contextes WebGL créés
- ⚡ FPS stable (60 FPS en mode normal, 30+ en low quality)
- 💾 Pas de fuite mémoire GPU
- 🔋 Consommation batterie réduite (mobile)

---
