# Parcels API Documentation - Kolifast Delivery System

## Overview

Système complet de gestion de colis pour l'application Kolifast (clients). Permet aux utilisateurs d'envoyer et de recevoir des colis avec suivi en temps réel, calcul automatique des coûts, et livraison groupée ou express.

---

## Base URL
```
http://localhost:8080
```

---

## Authentication

**Toutes les routes nécessitent:**
- Header: `Authorization: <JWT_TOKEN>` ou `Authorization: Bearer <JWT_TOKEN>`
- User type = `client` pour créer des colis (middleware `requireClient`)
- Drivers et clients peuvent consulter les colis

---

## 1. Send Parcel (Envoyer un colis)

**Endpoint:** `POST /parcels/send`

**Permission:** Client only (`requireClient`)

**Description:** Créer une demande d'envoi de colis avec une adresse de pickup et une ou plusieurs adresses de livraison.

**Headers:**
- `Authorization: <token>`
- `Content-Type: application/json`

**Body (JSON):**
```json
{
  "pickupAddress": {
    "address": "123 Rue de Lomé, Togo",
    "latitude": 6.1256,
    "longitude": 1.2254,
    "contactNumber": "+22812345678"
  },
  "deliveryAddresses": [
    {
      "address": "456 Avenue de la Paix, Lomé",
      "latitude": 6.1356,
      "longitude": 1.2354,
      "contactNumber": "+22898765432",
      "contactName": "Jean Dupont"
    },
    {
      "address": "789 Boulevard du Commerce, Lomé",
      "latitude": 6.1456,
      "longitude": 1.2454,
      "contactNumber": "+22891234567",
      "contactName": "Marie Martin"
    }
  ],
  "parcelType": "light",
  "weight": 3.5,
  "description": "Livres et documents",
  "parcelCount": 2,
  "deliveryType": "grouped",
  "waitingHours": 6
}
```

**Champs:**
| Champ | Type | Required | Description |
|-------|------|----------|-------------|
| `pickupAddress` | object | ✅ | Adresse de récupération |
| `pickupAddress.address` | string | ✅ | Adresse complète |
| `pickupAddress.latitude` | number | ⚠️ | Optionnel mais requis pour calcul coût |
| `pickupAddress.longitude` | number | ⚠️ | Optionnel mais requis pour calcul coût |
| `pickupAddress.contactNumber` | string | ✅ | Numéro de téléphone |
| `deliveryAddresses` | array | ✅ | Minimum 1 adresse de livraison |
| `deliveryAddresses[].address` | string | ✅ | Adresse de livraison |
| `deliveryAddresses[].latitude` | number | ⚠️ | Pour calcul de coût |
| `deliveryAddresses[].longitude` | number | ⚠️ | Pour calcul de coût |
| `deliveryAddresses[].contactNumber` | string | ✅ | Téléphone du destinataire |
| `deliveryAddresses[].contactName` | string | ✅ | Nom du destinataire |
| `parcelType` | enum | ✅ | `light` (0-5kg), `medium` (5-15kg), `ultra_heavy` (15kg+) |
| `weight` | number | ⚠️ | Poids en kg (optionnel) |
| `description` | string | ✅ | Description du colis |
| `parcelCount` | number | ✅ | Nombre de colis (minimum 1) |
| `deliveryType` | enum | ✅ | `grouped` ou `express` |
| `waitingHours` | number | ⚠️ | Requis pour `grouped` (2-24 heures) |

**Réponse (201 Created):**
```json
{
  "message": "Parcel created successfully",
  "data": {
    "parcelId": "parcel-uuid",
    "trackingNumber": "KOL-250125-0001",
    "estimatedCost": 2450,
    "savingsAmount": 1225
  }
}
```

**Calcul automatique du coût:**
- Distance totale calculée avec Haversine
- Coût = Base (500 FCFA) + Distance (100 FCFA/km) + Poids (50 FCFA/kg) + Destinations supplémentaires (200 FCFA)
- Multiplié par type de colis (light: x1.0, medium: x1.2, ultra_heavy: x1.5)
- **Express:** +50% du coût de base
- **Grouped:** Réduction jusqu'à 30% selon `waitingHours` (5% par heure)

**Exemples de tarifs:**
```
10 km, 3 kg, 2 destinations, grouped (6h):
- Base: 500 + 1000 (10km) + 150 (3kg) + 200 (1 destination suppl.) = 1850 FCFA
- Light (x1.0): 1850 FCFA
- Grouped 6h (-30%): 1295 FCFA
- Express (pour comparaison): 2775 FCFA
- Économie: 1480 FCFA
```

**Erreurs possibles:**
- `400` - Champs manquants ou invalides
- `403` - Utilisateur n'est pas un client

---

## 2. Receive Parcel (Recevoir un colis)

**Endpoint:** `POST /parcels/receive`

**Permission:** Client only

**Description:** Créer une demande de réception de colis (plusieurs adresses de pickup, une adresse de livraison).

**Body (JSON):**
```json
{
  "pickupAddresses": [
    {
      "address": "100 Marché de Lomé",
      "latitude": 6.1256,
      "longitude": 1.2254,
      "contactNumber": "+22891111111",
      "contactName": "Vendeur 1"
    }
  ],
  "deliveryAddress": {
    "address": "789 Ma maison, Lomé",
    "latitude": 6.1456,
    "longitude": 1.2454,
    "contactNumber": "+22812345678"
  },
  "parcelType": "medium",
  "weight": 8,
  "description": "Achats du marché",
  "parcelCount": 1,
  "deliveryType": "express"
}
```

**Différence avec Send:**
- **Send:** 1 pickup → N deliveries
- **Receive:** N pickups → 1 delivery

**Réponse:** Identique à `/parcels/send`

---

## 3. List Parcels (Lister les colis)

**Endpoint:** `GET /parcels/list`

**Permission:** Client ou Driver (tous les utilisateurs authentifiés)

**Query Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | Filtrer par statut (optionnel) |
| `type` | string | `send` ou `receive` (optionnel) |
| `page` | number | Numéro de page (défaut: 1) |
| `limit` | number | Résultats par page (défaut: 20, max: 100) |

**Exemples:**
```bash
# Tous les colis
GET /parcels/list

# Colis en attente uniquement
GET /parcels/list?status=pending

# Colis envoyés, page 2
GET /parcels/list?type=send&page=2

# Colis livrés avec limite de 10 par page
GET /parcels/list?status=delivered&limit=10
```

**Réponse (200 OK):**
```json
{
  "data": {
    "parcels": [
      {
        "id": "parcel-uuid",
        "user_id": "user-uuid",
        "tracking_number": "KOL-250125-0001",
        "type": "send",
        "parcel_type": "light",
        "weight": 3.5,
        "description": "Livres",
        "parcel_count": 2,
        "delivery_type": "grouped",
        "waiting_hours": 6,
        "status": "in_transit",
        "estimated_cost": 2450,
        "final_cost": 2450,
        "savings_amount": 1225,
        "is_paid": false,
        "driver_id": null,
        "created_at": "2025-01-25T10:00:00Z",
        "updated_at": "2025-01-25T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Status possibles:**
- `pending` - Créé, en attente de confirmation
- `confirmed` - Confirmé, en attente d'affectation driver
- `picked_up` - Récupéré par le livreur
- `in_transit` - En cours de livraison
- `delivered` - Livré avec succès ✅
- `cancelled` - Annulé ❌

---

## 4. Get Parcel Details (Détails d'un colis)

**Endpoint:** `GET /parcels/:id`

**Permission:** Propriétaire du colis OU driver assigné

**Exemple:**
```bash
GET /parcels/parcel-uuid-123
```

**Réponse (200 OK):**
```json
{
  "data": {
    "parcel": {
      "id": "parcel-uuid",
      "tracking_number": "KOL-250125-0001",
      "status": "in_transit",
      "type": "send",
      "parcel_type": "light",
      "description": "Livres et documents",
      "parcel_count": 2,
      "delivery_type": "grouped",
      "estimated_cost": 2450,
      "is_paid": false,
      "driver_id": "driver-uuid",
      "created_at": "2025-01-25T10:00:00Z"
    },
    "pickupAddresses": [
      {
        "id": "addr-uuid-1",
        "parcel_id": "parcel-uuid",
        "type": "pickup",
        "address": "123 Rue de Lomé",
        "latitude": 6.1256,
        "longitude": 1.2254,
        "contact_name": "John Doe",
        "contact_number": "+22812345678",
        "is_completed": true,
        "completed_at": "2025-01-25T11:00:00Z",
        "order_index": 1
      }
    ],
    "deliveryAddresses": [
      {
        "id": "addr-uuid-2",
        "type": "delivery",
        "address": "456 Avenue de la Paix",
        "contact_name": "Jean Dupont",
        "contact_number": "+22898765432",
        "is_completed": false,
        "order_index": 1
      }
    ],
    "timeline": [
      {
        "id": "timeline-uuid-1",
        "parcel_id": "parcel-uuid",
        "status": "pending",
        "description": "Colis créé, en attente de confirmation",
        "created_at": "2025-01-25T10:00:00Z"
      },
      {
        "id": "timeline-uuid-2",
        "status": "confirmed",
        "description": "Colis confirmé, en attente d'affectation",
        "created_at": "2025-01-25T10:30:00Z"
      },
      {
        "id": "timeline-uuid-3",
        "status": "picked_up",
        "description": "Colis récupéré par le livreur",
        "latitude": 6.1256,
        "longitude": 1.2254,
        "created_at": "2025-01-25T11:00:00Z"
      }
    ]
  }
}
```

**Erreurs:**
- `403` - Accès refusé (pas le propriétaire ni le driver)
- `404` - Colis non trouvé

---

## 5. Track Parcel (Tracking temps réel)

**Endpoint:** `GET /parcels/:id/track`

**Permission:** Accessible à tous (avec le parcel ID)

**Description:** Obtenir la position actuelle du colis en temps réel.

**Exemple:**
```bash
GET /parcels/parcel-uuid-123/track
```

**Réponse (200 OK):**
```json
{
  "data": {
    "trackingNumber": "KOL-250125-0001",
    "status": "in_transit",
    "currentLocation": {
      "latitude": 6.1356,
      "longitude": 1.2354,
      "lastUpdate": "2025-01-25T12:30:00Z"
    },
    "driverInfo": {
      "driverId": "driver-uuid"
    }
  }
}
```

**Note:**
- La position est mise à jour par le driver depuis son app (Kolideliver)
- Si pas de position GPS disponible, `currentLocation` sera `null`

---

## 6. Update Parcel Status (Mise à jour statut)

**Endpoint:** `PUT /parcels/:id`

**Permission:** Driver assigné OU Admin uniquement

**Description:** Mettre à jour le statut du colis (utilisé par les drivers).

**Body (JSON):**
```json
{
  "status": "in_transit"
}
```

**Status autorisés:**
- `confirmed` - Admin/System
- `picked_up` - Driver (après récupération)
- `in_transit` - Driver (en route)
- `delivered` - Driver (livraison terminée)
- `cancelled` - Admin/User

**Réponse (200 OK):**
```json
{
  "message": "Parcel status updated successfully",
  "data": {
    "status": "in_transit"
  }
}
```

**Comportement automatique:**
- Changement de statut → Entrée timeline automatique (via trigger SQL)
- `picked_up` → `pickup_completed_at` mis à jour
- `in_transit` → `delivery_started_at` mis à jour
- `delivered` → `delivered_at` mis à jour
- `cancelled` → `cancelled_at` mis à jour

**Erreurs:**
- `403` - Utilisateur n'est pas le driver assigné ni admin
- `404` - Colis non trouvé

---

## 7. Report Problem (Signaler un problème)

**Endpoint:** `POST /parcels/:id/report`

**Permission:** Propriétaire du colis uniquement

**Description:** Signaler un problème avec la livraison.

**Body (JSON):**
```json
{
  "reportText": "Le colis n'est pas arrivé à temps et le livreur ne répond pas au téléphone."
}
```

**Réponse (200 OK):**
```json
{
  "message": "Problem reported successfully. Our support team will contact you soon.",
  "data": {
    "ticketId": "ticket-uuid",
    "parcelId": "parcel-uuid",
    "trackingNumber": "KOL-250125-0001"
  }
}
```

**Note:**
- Pour l'instant, crée juste un ticket ID
- À implémenter: table `support_tickets` pour tracking complet

**Erreurs:**
- `403` - Pas le propriétaire du colis
- `404` - Colis non trouvé

---

## Base de données

### Tables créées

**1. `parcels` - Colis principaux**
- Stocke toutes les infos du colis
- Tracking number généré automatiquement (format: KOL-YYMMDD-XXXX)
- Status tracking avec timestamps

**2. `parcel_addresses` - Adresses**
- Multiple pickups et deliveries par colis
- Coordonnées GPS pour calcul de distance
- Flag `is_completed` pour suivi de livraison

**3. `parcel_timeline` - Historique**
- Auto-créé via trigger SQL à chaque changement de statut
- Peut stocker position GPS du driver
- Traçabilité complète

### Migration SQL

```bash
# Exécuter le schéma parcels
psql -U dbuser -d db -f parcels_schema.sql
```

---

## Calcul des coûts (Pricing)

### Formule de base

```
baseCost = BASE_FEE + (distance_km × 100) + (weight_kg × 50) + (destinations_extra × 200)
```

### Multiplicateurs

**Parcel Type:**
- `light` (0-5kg): x1.0
- `medium` (5-15kg): x1.2 (+20%)
- `ultra_heavy` (15kg+): x1.5 (+50%)

**Delivery Type:**
- `express`: +50% du coût de base
- `grouped`: -5% par heure d'attente (max -30%)

### Exemples de calcul

**Exemple 1: Livraison légère express**
```
Distance: 5 km
Poids: 2 kg
Type: light
Destinations: 1
Delivery: express

Base = 500 + (5×100) + (2×50) + 0 = 1100 FCFA
Light (x1.0) = 1100 FCFA
Express (+50%) = 1650 FCFA
```

**Exemple 2: Livraison groupée avec économie**
```
Distance: 10 km
Poids: 8 kg
Type: medium
Destinations: 3
Delivery: grouped (6h)

Base = 500 + (10×100) + (8×50) + (2×200) = 2300 FCFA
Medium (x1.2) = 2760 FCFA
Grouped 6h (-30%) = 1932 FCFA arrondi à 1930 FCFA

Express aurait coûté: 2760 × 1.5 = 4140 FCFA
Économie: 2210 FCFA
```

---

## Workflow complet

### Côté Client (Kolifast app)

```
1. Créer un colis
   POST /parcels/send ou /parcels/receive
   → Reçoit trackingNumber + estimatedCost

2. Consulter ses colis
   GET /parcels/list?status=pending

3. Voir les détails
   GET /parcels/:id
   → Voir timeline, adresses, status

4. Suivre en temps réel
   GET /parcels/:id/track
   → Position GPS du driver

5. Signaler un problème
   POST /parcels/:id/report
```

### Côté Driver (Kolideliver app)

```
1. Voir les colis disponibles
   GET /parcels/list?status=confirmed

2. Accepter un colis
   (À implémenter: POST /parcels/:id/accept)

3. Marquer comme récupéré
   PUT /parcels/:id { status: "picked_up" }

4. Mettre à jour position GPS
   (Envoi continu depuis l'app, mise à jour timeline)

5. Marquer livraison complète
   PUT /parcels/:id { status: "delivered" }
```

---

## Frontend Integration (Kolifast)

### 1. Créer un colis

```typescript
// send-parcel.tsx
const response = await fetch('/parcels/send', {
  method: 'POST',
  headers: {
    'Authorization': token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pickupAddress: {
      address: pickupAddr,
      latitude: pickupCoords.latitude,
      longitude: pickupCoords.longitude,
      contactNumber: userPhone
    },
    deliveryAddresses: deliveries.map(d => ({
      address: d.address,
      latitude: d.coords.latitude,
      longitude: d.coords.longitude,
      contactNumber: d.phone,
      contactName: d.name
    })),
    parcelType: selectedType, // 'light', 'medium', 'ultra_heavy'
    weight: weight,
    description: description,
    parcelCount: count,
    deliveryType: deliveryType, // 'grouped', 'express'
    waitingHours: waitHours
  })
})

const { data } = await response.json()
// Afficher trackingNumber, estimatedCost, savingsAmount
```

### 2. Lister les colis

```typescript
// activities.tsx
const response = await fetch(`/parcels/list?status=${filter}&page=${page}`, {
  headers: { 'Authorization': token }
})

const { data } = await response.json()
// data.parcels[] et data.pagination
```

### 3. Tracking en temps réel

```typescript
// activity-details.tsx
// Polling toutes les 10 secondes
setInterval(async () => {
  const response = await fetch(`/parcels/${parcelId}/track`, {
    headers: { 'Authorization': token }
  })

  const { data } = await response.json()
  if (data.currentLocation) {
    updateMapMarker(data.currentLocation.latitude, data.currentLocation.longitude)
  }
}, 10000)
```

---

## Notes importantes

### Tracking Number
Format: `KOL-YYMMDD-XXXX`
- KOL = Kolifast
- YYMMDD = Date (250125 = 25 janvier 2025)
- XXXX = Numéro séquentiel du jour (0001, 0002, etc.)

### Statuts Timeline
Créés automatiquement via trigger SQL à chaque changement de status.

### Permissions
- **Clients:** Peuvent créer des colis (send/receive)
- **Drivers:** Peuvent mettre à jour le statut et ajouter des positions GPS
- **Tous:** Peuvent consulter leurs propres colis
- **Tracking public:** Accessible avec le parcel ID

### Calcul de distance
Utilise la formule de Haversine pour calculer la distance entre deux coordonnées GPS.

### Arrondissement des prix
Tous les prix sont arrondis au multiple de 10 FCFA supérieur.

---

## TODO / Améliorations futures

- [ ] **Affectation automatique de drivers** (algorithme de matching)
- [ ] **Optimisation de routes** pour livraisons groupées
- [ ] **Paiement intégré** (lier avec wallet)
- [ ] **Notifications push** sur changements de statut
- [ ] **Photos de livraison** (preuve de livraison)
- [ ] **Signature électronique** du destinataire
- [ ] **Support tickets** complet (table + endpoints)
- [ ] **Ratings & reviews** pour drivers
- [ ] **Historique complet** avec filtres avancés
- [ ] **Export PDF** de reçus de livraison

---

## Support

Pour toute question:
- `parcels_schema.sql` - Structure des tables
- `src/handlers/parcel.ts` - Logique des handlers
- `src/repositories/parcel.ts` - Accès base de données
- `src/utils/pricing.ts` - Calcul des coûts
- `src/middleware/rbac.ts` - Contrôle d'accès
