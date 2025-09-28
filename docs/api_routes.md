# API Endpoints - Phase MVP
## Documentation des Routes

---

## 🔐 AUTHENTIFICATION

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `POST` | `/api/auth/send-otp` | Envoyer code OTP | `{ phone }` |
| `POST` | `/api/auth/verify-otp` | Vérifier OTP et connecter | `{ phone, otp_code }` |
| `POST` | `/api/auth/complete-profile` | Compléter profil première connexion | `{ first_name, last_name, email, date_of_birth }` |
| `POST` | `/api/auth/refresh-token` | Renouveler le token JWT | `{ refresh_token }` |
| `POST` | `/api/auth/logout` | Déconnecter l'utilisateur | - |

---

## 👤 GESTION UTILISATEURS

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `GET` | `/api/users/profile` | Récupérer profil utilisateur | - |
| `PUT` | `/api/users/profile` | Mettre à jour profil | `{ first_name, last_name, email, default_address, default_latitude, default_longitude }` + `profile_image` (file) |
| `PUT` | `/api/users/notifications` | Gérer préférences notifications | `{ push, sms, email }` |
| `GET` | `/api/users/delivery-history` | Historique des livraisons | `?page=1&limit=20&status=completed` |
| `DELETE` | `/api/users/account` | Supprimer le compte | `{ confirmation_password }` |

---

## 🚗 DEVENIR LIVREUR

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `POST` | `/api/drivers/register` | S'inscrire comme livreur | `{ id_card_number, vehicle_type, max_weight_kg, max_volume_liters, has_cooling_box }` + files |
| `GET` | `/api/drivers/profile` | Profil livreur complet | - |
| `PUT` | `/api/drivers/profile` | Mettre à jour profil livreur | `{ vehicle_type, max_weight_kg, max_volume_liters, has_cooling_box }` |
| `PUT` | `/api/drivers/location` | Mettre à jour localisation | `{ latitude, longitude }` |
| `PUT` | `/api/drivers/status` | Changer statut en ligne/disponible | `{ is_online, is_available }` |
| `GET` | `/api/drivers/earnings` | Consultation gains | `?period=today&start_date=2024-01-01&end_date=2024-01-31` |
| `POST` | `/api/drivers/deposit` | Effectuer dépôt de garantie | `{ amount, payment_method }` |
| `POST` | `/api/drivers/withdraw` | Retirer gains | `{ amount, withdrawal_method }` |

---

## 📦 DEMANDES DE LIVRAISON

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `POST` | `/api/delivery-requests` | Créer demande livraison | `{ pickup_*, delivery_*, item_*, delivery_priority, requested_delivery_time, payment_method }` |
| `GET` | `/api/delivery-requests` | Liste demandes utilisateur | `?status=pending&page=1&limit=20` |
| `GET` | `/api/delivery-requests/:id` | Détail d'une demande | - |
| `PUT` | `/api/delivery-requests/:id` | Modifier demande (si pending) | `{ delivery_address, requested_delivery_time, etc. }` |
| `DELETE` | `/api/delivery-requests/:id` | Annuler demande | - |
| `GET` | `/api/delivery-requests/:id/track` | Suivi temps réel | - |
| `POST` | `/api/delivery-requests/calculate-price` | Calculer prix avant création | `{ pickup_lat, pickup_lng, delivery_lat, delivery_lng, item_type, priority }` |

---

## 🎯 MISSIONS LIVREUR

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `GET` | `/api/drivers/available-missions` | Missions disponibles | `?radius=10&item_type=repas` |
| `POST` | `/api/drivers/accept-mission/:groupId` | Accepter une mission | - |
| `GET` | `/api/drivers/current-missions` | Missions en cours | - |
| `PUT` | `/api/drivers/mission/:groupId/start` | Démarrer mission | - |
| `PUT` | `/api/drivers/mission/:groupId/pickup/:requestId` | Confirmer récupération | - + `pickup_proof` (file) |
| `PUT` | `/api/drivers/mission/:groupId/deliver/:requestId` | Confirmer livraison | - + `delivery_proof`, `recipient_signature` (files) |
| `PUT` | `/api/drivers/mission/:groupId/complete` | Terminer mission complète | - |
| `POST` | `/api/drivers/mission/:groupId/issue` | Signaler problème | `{ issue_type, description, location }` |

---

## 💳 PAIEMENTS & TRANSACTIONS

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `POST` | `/api/payments/process` | Traiter paiement digital | `{ request_id, payment_method, payment_data }` |
| `POST` | `/api/payments/cash-confirm` | Confirmer paiement cash (livreur) | `{ request_id, amount_received }` |
| `GET` | `/api/payments/history` | Historique transactions | `?type=payment&page=1&limit=20` |
| `GET` | `/api/payments/balance` | Solde livreur | - |
| `POST` | `/api/payments/commission-transfer` | Reverser commission (cash) | `{ amount, transaction_ids[] }` |
| `GET` | `/api/payments/pending-commissions` | Commissions à reverser | - |

---

## ⭐ ÉVALUATIONS

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `POST` | `/api/ratings/create` | Évaluer un livreur | `{ request_id, driver_id, rating, comment, punctuality_rating, communication_rating, professionalism_rating }` |
| `GET` | `/api/ratings/received` | Évaluations reçues (livreur) | `?page=1&limit=20` |
| `GET` | `/api/ratings/given` | Évaluations données | `?page=1&limit=20` |
| `GET` | `/api/ratings/driver/:driverId` | Évaluations d'un livreur | - |

---

## 🔔 NOTIFICATIONS

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `GET` | `/api/notifications` | Liste notifications | `?is_read=false&page=1&limit=50` |
| `PUT` | `/api/notifications/:id/read` | Marquer comme lue | - |
| `PUT` | `/api/notifications/mark-all-read` | Tout marquer comme lu | - |
| `DELETE` | `/api/notifications/:id` | Supprimer notification | - |

---

## 📊 STATISTIQUES & RAPPORTS

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `GET` | `/api/stats/driver-dashboard` | Dashboard livreur | `?period=week` |
| `GET` | `/api/stats/user-summary` | Résumé activité utilisateur | `?period=month` |
| `GET` | `/api/stats/delivery-performance` | Performance livraisons | `?start_date=2024-01-01&end_date=2024-01-31` |

---

## 🛠 UTILITAIRES

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `POST` | `/api/utils/geocode` | Géocodage adresse | `{ address }` |
| `POST` | `/api/utils/reverse-geocode` | Géocodage inverse | `{ latitude, longitude }` |
| `GET` | `/api/utils/delivery-zones` | Zones de livraison disponibles | - |
| `POST` | `/api/utils/distance-matrix` | Calcul distances multiples | `{ origins[], destinations[] }` |
| `POST` | `/api/utils/optimize-route` | Optimiser itinéraire | `{ waypoints[], vehicle_type }` |

---

## 🔧 ADMIN (Gestion Plateforme)

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `GET` | `/api/admin/drivers/pending` | Livreurs en attente validation | `?page=1&limit=20` |
| `PUT` | `/api/admin/drivers/:id/verify` | Valider un livreur | `{ is_verified, notes }` |
| `PUT` | `/api/admin/drivers/:id/suspend` | Suspendre livreur | `{ reason, duration_days }` |
| `GET` | `/api/admin/delivery-requests/active` | Demandes actives | `?status=grouped&page=1` |
| `PUT` | `/api/admin/delivery-groups/:id/reassign` | Réassigner groupe | `{ new_driver_id, reason }` |
| `GET` | `/api/admin/stats/platform` | Statistiques plateforme | `?period=today` |
| `GET` | `/api/admin/financial/summary` | Résumé financier | `?start_date=2024-01-01&end_date=2024-01-31` |

---

## 📱 REAL-TIME & WEBSOCKETS

| Event | Description | Data |
|-------|-------------|------|
| `location_update` | Mise à jour localisation livreur | `{ driver_id, latitude, longitude, timestamp }` |
| `delivery_status_changed` | Changement statut livraison | `{ request_id, old_status, new_status, timestamp }` |
| `mission_assigned` | Mission assignée | `{ group_id, driver_id, requests[] }` |
| `delivery_completed` | Livraison terminée | `{ request_id, delivery_time, rating_prompt }` |
| `driver_arrived` | Livreur arrivé | `{ request_id, location, estimated_pickup_time }` |

---

## 🚀 ALGORITHME DE REGROUPEMENT

| Méthode | Endpoint | Description | Body/Params |
|---------|----------|-------------|-------------|
| `POST` | `/api/grouping/trigger` | Déclencher regroupement manuel | `{ request_ids[], force_group }` |
| `GET` | `/api/grouping/simulation` | Simuler regroupement | `{ pickup_locations[], delivery_locations[], priorities[] }` |
| `PUT` | `/api/grouping/optimize/:groupId` | Re-optimiser groupe existant | - |

---

## 📋 CODES DE STATUT

### Demandes de Livraison
- `pending` - En attente de regroupement
- `grouped` - Regroupée mais pas assignée
- `assigned` - Assignée à un livreur
- `pickup_in_progress` - Récupération en cours
- `in_transit` - En transit
- `delivered` - Livrée
- `cancelled` - Annulée
- `failed` - Échec de livraison

### Groupes de Livraison
- `pending` - En attente d'assignation
- `assigned` - Assigné à un livreur
- `in_progress` - En cours d'exécution
- `completed` - Terminé
- `cancelled` - Annulé

### Paiements
- `pending` - En attente
- `completed` - Terminé
- `failed` - Échec
- `refunded` - Remboursé

### Livreurs
- `pending` - En attente de vérification
- `active` - Actif et vérifié
- `suspended` - Suspendu temporairement
- `banned` - Banni définitivement

---

## 🔒 AUTHENTIFICATION REQUISE

**Headers requis pour les endpoints protégés :**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Niveaux d'accès :**
- 🟢 **Public** : Pas d'auth requise
- 🟡 **User** : Token utilisateur requis
- 🟠 **Driver** : Token + profil livreur vérifié
- 🔴 **Admin** : Token + rôle administrateur

---

## 📱 CODES DE RÉPONSE HTTP

- `200` - Succès
- `201` - Créé avec succès
- `400` - Erreur de validation
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Ressource non trouvée
- `409` - Conflit (ex: déjà existant)
- `429` - Trop de requêtes
- `500` - Erreur serveur

---

## 🔄 PAGINATION STANDARD

**Query params pour endpoints paginés :**
```
?page=1&limit=20&sort=created_at&order=desc
```

**Format de réponse :**
```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 100,
    "per_page": 20,
    "has_next": true,
    "has_prev": false
  }
}
```
