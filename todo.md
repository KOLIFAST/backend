# TODO Backend - KOLIFAST

## Vue d'ensemble du projet

Ce document liste toutes les fonctionnalités frontend qui nécessitent une implémentation backend. Le frontend Kolifast est une application React Native/Expo complète avec des fonctionnalités de livraison de colis, marketplace, wallet et suivi en temps réel.

---

## État actuel du Backend

### ✅ Déjà implémenté
- [x] Authentification par OTP WhatsApp (`/auth/request-otp`, `/auth/verify-otp`)
- [x] Gestion de session (`/auth/logout`)
- [x] Profil utilisateur basique (`GET /users`, `PATCH /users`)
- [x] Base de données PostgreSQL avec tables `users`, `otp_codes`, `sessions`
- [x] Middleware d'authentification
- [x] Validation des requêtes avec Zod
- [x] Gestion des erreurs avec Result pattern

### ❌ À implémenter
Tout le reste des fonctionnalités listées ci-dessous...

---

## Priorité 1 - Fonctionnalités critiques MVP

### 1.1 Authentification & Utilisateurs

#### 1.1.1 Améliorer l'authentification existante
- [ ] **Ajouter le support du nom complet lors de l'inscription**
  - Frontend envoie `fullName` lors de l'inscription
  - Backend doit parser et stocker `first_name` et `last_name`
  - Endpoint: `POST /auth/verify-otp` avec `{ phoneNumber, otpCode, fullName?, isSignup }`

- [ ] **Retourner un token JWT au lieu d'un simple session ID**
  - Frontend attend un champ `token` dans la réponse
  - Implémenter JWT avec expiration (ex: 7 jours)
  - Ajouter un endpoint `/auth/refresh-token` pour renouveler le token

- [ ] **Endpoint: Récupérer le profil utilisateur complet**
  - `GET /users/profile` (déjà partiellement implémenté)
  - Ajouter les statistiques: `{ stats: { deliveries, savings, rating } }`
  - Ajouter `isVerified` (KYC status)
  - Ajouter `email` dans la table users

#### 1.1.2 KYC (Vérification d'identité)
- [ ] **Créer table `kyc_verifications`**
  ```sql
  CREATE TABLE kyc_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    id_type TEXT NOT NULL,
    documents TEXT[], -- URLs des documents
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    submitted_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT
  );
  ```

- [ ] **Endpoint: Soumettre KYC**
  - `POST /users/kyc`
  - Body: `{ documents: string[], idType: string }`
  - Retourner: `{ success: boolean, status: 'pending' }`

- [ ] **Upload de fichiers pour les documents KYC**
  - Implémenter un endpoint `/upload` pour gérer les uploads
  - Utiliser multer ou similar pour multipart/form-data
  - Stocker sur AWS S3, Cloudinary, ou local storage
  - Retourner l'URL du fichier uploadé

---

### 1.2 Gestion des Colis (Parcel Management)

#### 1.2.1 Créer les tables de base de données
- [ ] **Table: `parcels` (livraisons)**
  ```sql
  CREATE TABLE parcels (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    tracking_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'send' ou 'receive'
    parcel_type TEXT NOT NULL, -- 'light', 'medium', 'ultra-heavy'
    weight DECIMAL(10,2),
    description TEXT,
    parcel_count INTEGER DEFAULT 1,
    delivery_type TEXT NOT NULL, -- 'grouped' ou 'express'
    waiting_hours INTEGER, -- pour grouped delivery
    status TEXT DEFAULT 'pending', -- pending, confirmed, picked_up, in_transit, delivered, cancelled
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Table: `parcel_addresses` (adresses de pickup/delivery)**
  ```sql
  CREATE TABLE parcel_addresses (
    id TEXT PRIMARY KEY,
    parcel_id TEXT REFERENCES parcels(id),
    type TEXT NOT NULL, -- 'pickup' ou 'delivery'
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    contact_name TEXT,
    contact_number TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    order_index INTEGER -- pour l'ordre des livraisons multiples
  );
  ```

- [ ] **Table: `parcel_timeline` (historique des statuts)**
  ```sql
  CREATE TABLE parcel_timeline (
    id TEXT PRIMARY KEY,
    parcel_id TEXT REFERENCES parcels(id),
    status TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

#### 1.2.2 Endpoints - Envoi de colis
- [ ] **Endpoint: Créer une demande d'envoi**
  - `POST /parcels/send`
  - Body:
    ```json
    {
      "pickupAddress": { "address": "...", "latitude": 6.123, "longitude": 1.234, "contactNumber": "+22812345678" },
      "deliveryAddresses": [
        { "address": "...", "latitude": 6.456, "longitude": 1.789, "contactNumber": "+22887654321", "contactName": "John Doe" }
      ],
      "parcelType": "light",
      "weight": 3.5,
      "description": "Livres",
      "parcelCount": 2,
      "deliveryType": "grouped",
      "waitingHours": 6
    }
    ```
  - Réponse: `{ parcelId, trackingNumber, estimatedCost, savingsAmount }`
  - Calculer le coût estimé basé sur distance, poids, type
  - Générer un tracking number unique

#### 1.2.3 Endpoints - Réception de colis
- [ ] **Endpoint: Créer une demande de réception**
  - `POST /parcels/receive`
  - Body similaire à send, mais inverse (multiple pickups, single delivery)
  - Logique similaire à l'envoi

#### 1.2.4 Endpoints - Consultation et suivi
- [ ] **Endpoint: Lister tous les colis de l'utilisateur**
  - `GET /parcels/list?status=pending&page=1`
  - Query params: `status` (optional), `page`, `limit`
  - Retourner tableau de colis avec pagination
  - Frontend filtre par: all, pending, in_progress, delivered, cancelled

- [ ] **Endpoint: Détails d'un colis**
  - `GET /parcels/:id`
  - Retourner:
    ```json
    {
      "id": "...",
      "trackingNumber": "KOL-123456",
      "status": "in_transit",
      "from": "Adresse pickup",
      "to": "Adresse delivery",
      "parcelCount": 3,
      "deliveredCount": 1,
      "timeline": [
        { "status": "pending", "date": "2024-01-01T10:00:00Z", "completed": true },
        { "status": "confirmed", "date": "2024-01-01T11:00:00Z", "completed": true },
        { "status": "picked_up", "date": null, "completed": false }
      ],
      "deliveryPerson": {
        "name": "Driver Name",
        "phone": "+22812345678",
        "photo": "url",
        "currentLocation": { "latitude": 6.123, "longitude": 1.234 }
      },
      "agency": { "name": "Kolifast Lomé", "phone": "+22890000000" },
      "price": "2500 FCFA",
      "isPaid": true
    }
    ```

- [ ] **Endpoint: Tracking en temps réel**
  - `GET /parcels/:id/track`
  - WebSocket ou Server-Sent Events pour le live tracking
  - Retourner position GPS du livreur en temps réel
  - Alternative: polling endpoint avec dernière position

#### 1.2.5 Endpoints - Gestion
- [ ] **Endpoint: Mettre à jour le statut d'un colis**
  - `PUT /parcels/:id`
  - Body: `{ status: 'delivered' }`
  - Permissions: seulement admin ou driver assigné

- [ ] **Endpoint: Signaler un problème**
  - `POST /parcels/:id/report`
  - Body: `{ reportText: string }`
  - Créer un ticket de support
  - Retourner: `{ success: true, ticketId: "..." }`

---

### 1.3 Drivers (Livreurs)

#### 1.3.1 Créer les tables
- [ ] **Table: `drivers`**
  ```sql
  CREATE TABLE drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    vehicle_type TEXT, -- moto, voiture, vélo
    license_number TEXT,
    vehicle_registration TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    current_location_lat DECIMAL(10,8),
    current_location_lng DECIMAL(11,8),
    last_location_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Table: `parcel_assignments` (affectation livreur-colis)**
  ```sql
  CREATE TABLE parcel_assignments (
    id TEXT PRIMARY KEY,
    parcel_id TEXT REFERENCES parcels(id),
    driver_id TEXT REFERENCES drivers(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' -- pending, accepted, declined
  );
  ```

#### 1.3.2 Endpoints Drivers
- [ ] **Endpoint: Mise à jour de position du driver**
  - `POST /drivers/location`
  - Body: `{ latitude, longitude }`
  - Utilisé par l'app driver pour envoyer la position toutes les 10s

- [ ] **Endpoint: Affectation de colis au driver**
  - `POST /drivers/assign-parcel`
  - Logique d'affectation automatique ou manuelle

- [ ] **Endpoint: Driver accepte/refuse une livraison**
  - `POST /drivers/assignments/:id/accept`
  - `POST /drivers/assignments/:id/decline`

---

### 1.4 Statistiques Utilisateur

- [ ] **Endpoint: Statistiques globales de l'utilisateur**
  - `GET /users/statistics`
  - Retourner:
    ```json
    {
      "deliveries": 42,
      "savings": 15000,
      "rating": 4.8
    }
    ```
  - Calculs:
    - `deliveries`: nombre de colis livrés (status = delivered)
    - `savings`: somme des économies réalisées (différence grouped vs express)
    - `rating`: moyenne des notes données par l'utilisateur

---

## Priorité 2 - Système de Paiement

### 2.1 Wallet & Balance

#### 2.1.1 Créer tables
- [ ] **Table: `wallets`**
  ```sql
  CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id),
    balance DECIMAL(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'FCFA',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Table: `transactions`**
  ```sql
  CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL, -- recharge, payment, refund, commission
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2),
    balance_after DECIMAL(12,2),
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    payment_method TEXT, -- mobile_money, card, cash
    reference_id TEXT, -- ID transaction externe
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

#### 2.1.2 Endpoints Wallet
- [ ] **Endpoint: Obtenir le solde**
  - `GET /wallet/balance`
  - Retourner: `{ balance: 50000, savedThisMonth: 5000 }`

- [ ] **Endpoint: Recharger le wallet**
  - `POST /wallet/recharge`
  - Body: `{ amount: 10000, method: 'mobile_money', phoneNumber: '+22812345678' }`
  - Intégration avec provider de paiement (TMoney, Flooz)
  - Retourner: `{ success: true, transactionId: "..." }`

- [ ] **Endpoint: Historique des transactions**
  - `GET /wallet/transactions?page=1&limit=20`
  - Retourner liste des transactions avec pagination

### 2.2 Paiements de livraison

#### 2.2.1 Endpoints
- [ ] **Endpoint: Initier un paiement**
  - `POST /payments/initiate`
  - Body:
    ```json
    {
      "parcelId": "...",
      "amount": 5000,
      "method": "mobile_money",
      "phoneNumber": "+22812345678"
    }
    ```
  - Intégration avec FedaPay, Kkiapay, ou similaire
  - Retourner: `{ transactionId, status: 'pending', paymentUrl }`

- [ ] **Endpoint: Confirmer un paiement**
  - `POST /payments/:transactionId/confirm`
  - Body: `{ otpCode?: "123456" }` (pour mobile money)
  - Vérifier avec le provider
  - Mettre à jour le colis `is_paid = true`
  - Débiter le wallet ou finaliser la transaction

- [ ] **Endpoint: Webhook de callback du provider**
  - `POST /payments/webhook`
  - Recevoir les confirmations de paiement des providers
  - Mettre à jour les transactions

---

## Priorité 3 - Marketplace

### 3.1 Tables Marketplace

- [ ] **Table: `products`**
  ```sql
  CREATE TABLE products (
    id TEXT PRIMARY KEY,
    seller_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    long_description TEXT,
    price DECIMAL(12,2) NOT NULL,
    category TEXT NOT NULL,
    images TEXT[], -- array d'URLs
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Table: `product_categories`**
  ```sql
  CREATE TABLE product_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Table: `carts`**
  ```sql
  CREATE TABLE carts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Table: `cart_items`**
  ```sql
  CREATE TABLE cart_items (
    id TEXT PRIMARY KEY,
    cart_id TEXT REFERENCES carts(id),
    product_id TEXT REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Table: `reviews`**
  ```sql
  CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id),
    user_id TEXT REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

### 3.2 Endpoints Marketplace

- [ ] **Endpoint: Lister les produits**
  - `GET /products?category=electronics&search=phone&page=1`
  - Query params: `category`, `search`, `page`, `limit`
  - Retourner tableau de produits avec pagination

- [ ] **Endpoint: Détails d'un produit**
  - `GET /products/:id`
  - Retourner produit avec spécifications, seller info, reviews

- [ ] **Endpoint: Ajouter au panier**
  - `POST /cart/add`
  - Body: `{ productId: "...", quantity: 2 }`
  - Créer ou mettre à jour le panier

- [ ] **Endpoint: Obtenir le panier**
  - `GET /cart`
  - Retourner: `{ items: [...], total: 50000 }`

- [ ] **Endpoint: Reviews d'un produit**
  - `GET /products/:id/reviews`
  - Retourner liste des avis clients

- [ ] **Endpoint: Ajouter une review**
  - `POST /reviews`
  - Body: `{ productId, rating, comment }`

---

## Priorité 4 - Fonctionnalités avancées

### 4.1 Notifications

- [ ] **Table: `notifications`**
  ```sql
  CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT, -- delivery_update, payment, promo, etc.
    data JSONB, -- données additionnelles
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [ ] **Endpoint: Obtenir les notifications**
  - `GET /notifications?page=1`
  - Retourner liste paginée

- [ ] **Endpoint: Marquer comme lu**
  - `POST /notifications/:id/read`

- [ ] **Push notifications**
  - Intégrer Firebase Cloud Messaging (FCM) ou similaire
  - Envoyer notifications lors de changements de statut de livraison

### 4.2 Real-time tracking

- [ ] **WebSocket pour le tracking**
  - Implémenter WebSocket avec Socket.IO
  - Channels par parcel_id
  - Broadcaster la position du driver toutes les 10s

- [ ] **Alternative: Server-Sent Events (SSE)**
  - Pour streaming unidirectionnel serveur → client

### 4.3 Algorithme de groupement

- [ ] **Logique de groupement intelligent**
  - Algorithme pour regrouper les livraisons proches
  - Optimisation de routes (TSP - Traveling Salesman Problem)
  - Calcul des économies réalisées
  - Création de `delivery_groups` (comme prévu dans database_models.sql)

- [ ] **Table: `delivery_groups`**
  ```sql
  CREATE TABLE delivery_groups (
    id TEXT PRIMARY KEY,
    driver_id TEXT REFERENCES drivers(id),
    status TEXT DEFAULT 'pending',
    optimized_route JSONB, -- coordinates array
    total_distance DECIMAL(10,2),
    estimated_duration INTEGER, -- minutes
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

### 4.4 Géolocalisation & Maps

- [ ] **Endpoint: Reverse geocoding**
  - `GET /locations/reverse-geocode?lat=6.1256&lng=1.2254`
  - Utiliser Google Maps Geocoding API
  - Retourner: `{ address: "123 Rue de Lomé, Togo" }`

- [ ] **Endpoint: Calcul de distance**
  - `GET /locations/distance?from=6.123,1.234&to=6.456,1.789`
  - Utiliser Google Maps Distance Matrix API
  - Retourner: `{ distance: 15.2, duration: 25, unit: 'km' }`

### 4.5 Support & Tickets

- [ ] **Table: `support_tickets`**
  ```sql
  CREATE TABLE support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    parcel_id TEXT REFERENCES parcels(id),
    subject TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
  );
  ```

- [ ] **Endpoint: Créer un ticket**
  - `POST /support/tickets`
  - Body: `{ parcelId, description }`

- [ ] **Endpoint: Lister les tickets de l'utilisateur**
  - `GET /support/tickets`

---

## Priorité 5 - Admin & Dashboard

### 5.1 Panel d'administration

- [ ] **Authentification admin**
  - Table `admins` avec rôles
  - JWT tokens avec role-based access control (RBAC)

- [ ] **Endpoints Admin - Users**
  - `GET /admin/users` - Liste tous les utilisateurs
  - `PUT /admin/users/:id/suspend` - Suspendre un utilisateur

- [ ] **Endpoints Admin - Drivers**
  - `GET /admin/drivers/pending` - Drivers en attente de vérification
  - `POST /admin/drivers/:id/verify` - Approuver un driver
  - `POST /admin/drivers/:id/suspend` - Suspendre un driver

- [ ] **Endpoints Admin - KYC**
  - `GET /admin/kyc/pending` - Vérifications KYC en attente
  - `POST /admin/kyc/:id/approve` - Approuver KYC
  - `POST /admin/kyc/:id/reject` - Rejeter KYC

- [ ] **Endpoints Admin - Stats**
  - `GET /admin/statistics` - Stats globales de la plateforme
    - Nombre d'utilisateurs
    - Nombre de livraisons (par statut)
    - Revenus totaux
    - Drivers actifs

### 5.2 Rapports financiers

- [ ] **Endpoint: Rapport des commissions**
  - `GET /admin/reports/commissions?from=2024-01-01&to=2024-01-31`

- [ ] **Endpoint: Revenus par driver**
  - `GET /admin/reports/driver-earnings/:driverId`

---

## Priorité 6 - Sécurité & Optimisations

### 6.1 Sécurité

- [ ] **Rate limiting**
  - Limiter les tentatives OTP (5 par heure par numéro)
  - Limiter les requêtes API (ex: 100 req/min par IP)
  - Utiliser `express-rate-limit`

- [ ] **CORS Configuration**
  - Configurer CORS pour autoriser le frontend
  - Whitelist des domaines autorisés

- [ ] **Expiration des sessions**
  - Ajouter `expires_at` dans la table `sessions`
  - Nettoyer automatiquement les sessions expirées
  - Tokens JWT avec expiration (7 jours)

- [ ] **Refresh tokens**
  - Table `refresh_tokens`
  - Endpoint `/auth/refresh-token`
  - Rotation des refresh tokens

- [ ] **RBAC (Role-Based Access Control)**
  - Table `roles` et `user_roles`
  - Middleware pour vérifier les permissions
  - Rôles: user, driver, admin

- [ ] **Validation avancée**
  - Valider les coordonnées GPS (latitude/longitude ranges)
  - Valider les numéros de téléphone togolais (+228)
  - Sanitiser les inputs pour prévenir XSS

- [ ] **HTTPS obligatoire en production**
  - Redirection automatique HTTP → HTTPS

### 6.2 Performance

- [ ] **Database indexing**
  - Index sur `users.phone`
  - Index sur `parcels.tracking_number`
  - Index sur `parcels.user_id`
  - Index sur `sessions.user_id`
  - Index composé sur `transactions(user_id, created_at)`

- [ ] **Connection pooling**
  - Configurer le pool de connexions PostgreSQL
  - Paramètres optimaux selon la charge

- [ ] **Caching**
  - Redis pour cacher les données fréquentes
  - Cache des produits marketplace
  - Cache des statistiques utilisateur

- [ ] **Pagination systématique**
  - Toutes les listes doivent avoir pagination
  - Limite max 100 items par page

### 6.3 Monitoring & Logging

- [ ] **Structured logging**
  - Logger toutes les erreurs avec Pino (déjà en place)
  - Logger les actions critiques (paiements, changements de statut)

- [ ] **Error tracking**
  - Intégrer Sentry ou similaire pour tracker les erreurs en production

- [ ] **Monitoring**
  - Health check endpoint amélioré
  - Metrics (Prometheus/Grafana)
  - Alertes sur les erreurs critiques

---

## Priorité 7 - Infrastructure & DevOps

### 7.1 Environnement

- [ ] **Fichier .env complet**
  - Documenter toutes les variables nécessaires
  - Créer `.env.development` et `.env.production`
  - Variables manquantes actuellement:
    - `ENV` (dev/prod)
    - `WHATSAPP_TOKEN`
    - `WHATSAPP_NUM_ID`
    - `JWT_SECRET`
    - `GOOGLE_MAPS_API_KEY`
    - `PAYMENT_PROVIDER_API_KEY` (FedaPay, Kkiapay, etc.)
    - `FRONTEND_URL` (pour CORS)

### 7.2 Tests

- [ ] **Tests unitaires**
  - Jest pour les tests
  - Tests des repositories
  - Tests des handlers
  - Tests des utils

- [ ] **Tests d'intégration**
  - Tests des endpoints API
  - Tests avec base de données de test

- [ ] **Tests E2E**
  - Flows complets (signup → create parcel → payment)

### 7.3 Documentation

- [ ] **Documentation API**
  - Générer avec Swagger/OpenAPI
  - Documenter tous les endpoints
  - Exemples de requêtes/réponses

- [ ] **README.md**
  - Instructions de setup
  - Variables d'environnement
  - Commandes disponibles

### 7.4 CI/CD

- [ ] **GitHub Actions / GitLab CI**
  - Pipeline de tests automatiques
  - Linting (ESLint)
  - Build TypeScript
  - Déploiement automatique

- [ ] **Docker**
  - Dockerfile pour l'app
  - Docker Compose avec PostgreSQL, Redis
  - Configuration production-ready

---

## Intégrations tierces nécessaires

### Paiement
- [ ] **FedaPay** ou **Kkiapay** (Mobile Money FCFA)
  - TMoney, Flooz support
  - Webhooks pour confirmations
  - API de recharge de wallet

### WhatsApp
- [ ] **Meta WhatsApp Business API**
  - Configuration complète
  - Templates de messages
  - Gestion des tokens

### Maps & Geolocation
- [ ] **Google Maps Platform**
  - Places API (autocomplete)
  - Geocoding API (reverse geocoding)
  - Distance Matrix API (calcul distances)
  - Directions API (optimisation routes)

### Storage
- [ ] **Cloudinary** ou **AWS S3**
  - Stockage des images de profil
  - Documents KYC
  - Photos de produits marketplace

### Notifications
- [ ] **Firebase Cloud Messaging (FCM)**
  - Push notifications iOS/Android
  - Configuration des topics
  - Envoi via backend

### SMS (optionnel)
- [ ] **Twilio** ou **Nexmo**
  - Backup si WhatsApp échoue
  - Notifications SMS critiques

---

## Notes importantes

### Calcul des coûts de livraison
Le frontend affiche des économies basées sur le temps d'attente pour les livraisons groupées:
- 2h d'attente = économie faible
- 6h d'attente = 30% de réduction

Le backend doit implémenter cette logique:
```typescript
function calculateDeliveryCost(distance: number, weight: number, deliveryType: 'grouped' | 'express', waitingHours?: number) {
  const baseCost = distance * 100 + weight * 50 // exemple
  if (deliveryType === 'express') {
    return baseCost * 1.5 // +50% pour express
  }
  // Grouped: réduction selon waiting time
  const discount = Math.min(waitingHours / 6 * 0.3, 0.3) // max 30%
  return baseCost * (1 - discount)
}
```

### Format des numéros de téléphone
- Tous les numéros sont au format togolais: `+228XXXXXXXX`
- Le frontend retire le préfixe +228 pour l'affichage
- Le backend doit toujours stocker avec +228

### Tracking numbers
Format suggéré: `KOL-YYMMDD-XXXX`
- KOL = Kolifast
- YYMMDD = date
- XXXX = numéro séquentiel

### Monnaie
- Toujours en FCFA (Franc CFA)
- Affichage frontend: "5 000 FCFA" (avec espaces)

---

## Ordre d'implémentation recommandé

1. **Semaine 1**: Améliorer auth + profil utilisateur + KYC
2. **Semaine 2**: Tables parcels + endpoints send/receive + listing
3. **Semaine 3**: Système de drivers + affectation + tracking
4. **Semaine 4**: Wallet + transactions + intégration paiement
5. **Semaine 5**: Marketplace (tables + CRUD produits)
6. **Semaine 6**: Notifications + WebSocket tracking temps réel
7. **Semaine 7**: Algorithme de groupement + optimisation routes
8. **Semaine 8**: Admin panel + dashboard stats
9. **Semaine 9**: Tests + sécurité + rate limiting
10. **Semaine 10**: Documentation + CI/CD + déploiement

---

## Fichiers à créer/modifier

### Nouveaux fichiers à créer
```
src/
├── handlers/
│   ├── parcel.ts              # Handlers pour les colis
│   ├── driver.ts              # Handlers drivers
│   ├── payment.ts             # Handlers paiements
│   ├── wallet.ts              # Handlers wallet
│   ├── product.ts             # Handlers marketplace
│   ├── notification.ts        # Handlers notifications
│   └── admin.ts               # Handlers admin panel
├── repositories/
│   ├── parcel.ts              # Repo parcels
│   ├── driver.ts              # Repo drivers
│   ├── transaction.ts         # Repo transactions
│   ├── product.ts             # Repo produits
│   └── notification.ts        # Repo notifications
├── providers/
│   ├── payment.ts             # Intégration FedaPay/Kkiapay
│   ├── maps.ts                # Intégration Google Maps
│   ├── fcm.ts                 # Firebase notifications
│   └── storage.ts             # S3/Cloudinary
├── services/
│   ├── pricing.ts             # Calcul des prix
│   ├── routing.ts             # Algorithme de groupement
│   └── tracking.ts            # Tracking temps réel
├── middleware/
│   ├── rbac.ts                # Role-based access control
│   └── ratelimit.ts           # Rate limiting
└── websocket/
    └── tracking.ts            # WebSocket setup
```

### Fichiers existants à modifier
```
src/server.ts                  # Ajouter nouvelles routes
schema.sql                     # Ajouter toutes les nouvelles tables
.env.example                   # Ajouter variables manquantes
docs/api_routes.md             # Mettre à jour avec implémentation réelle
```

---

**Status**: 🔴 0% complété (3/82+ tâches)
**Dernière mise à jour**: 2025-01-25
