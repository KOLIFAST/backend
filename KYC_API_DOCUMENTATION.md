# KYC API Documentation - Kolideliver Driver Verification

## Overview

Ce système KYC (Know Your Customer) permet aux livreurs de l'application Kolideliver de soumettre leurs documents d'identité pour vérification. Le processus comprend 4 étapes (3 obligatoires + 1 optionnelle).

---

## Différenciation Client vs Driver

### Lors de l'inscription (OTP Verification)

**Frontend doit envoyer le paramètre `appType`:**

```json
POST /auth/verify-otp
{
  "phone": "+22812345678",
  "code": "123456",
  "fullName": "John Doe",
  "appType": "kolideliver"  // "kolifast" pour clients, "kolideliver" pour drivers
}
```

**Réponse:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "phone": "+22812345678",
      "full_name": "John Doe",
      "user_type": "driver",  // ou "client"
      "is_driver": true,
      "driver_verified": false,
      "profile_picture": "",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "isNewUser": true
  }
}
```

**Comportement automatique:**
- Si `appType = "kolideliver"` → `user_type = "driver"` + **KYC status initialisé automatiquement**
- Si `appType = "kolifast"` (ou absent) → `user_type = "client"`

---

## Routes KYC (Driver Only)

**Toutes les routes KYC nécessitent:**
1. Header `Authorization: <JWT_TOKEN>` ou `Authorization: Bearer <JWT_TOKEN>`
2. User type = `driver` (middleware `requireDriver`)

### Base URL
```
http://localhost:8080
```

---

## 1. Upload Identity Document

**Endpoint:** `POST /kyc/identity-upload`

**Headers:**
- `Authorization: <token>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `documentType` | string | ✅ | Type: `cni`, `passport`, ou `permit` |
| `frontImage` | file | ✅ | Image recto (JPEG/PNG/PDF, max 5MB) |
| `backImage` | file | ⚠️ | Image verso (**obligatoire pour CNI**, optionnel pour autres) |

**Exemple (curl):**
```bash
curl -X POST http://localhost:8080/kyc/identity-upload \
  -H "Authorization: your-jwt-token" \
  -F "documentType=cni" \
  -F "frontImage=@/path/to/front.jpg" \
  -F "backImage=@/path/to/back.jpg"
```

**Réponse (200 OK):**
```json
{
  "message": "Identity document uploaded successfully",
  "data": {
    "documentId": "doc-uuid",
    "documentType": "cni",
    "frontImage": "uploads/kyc/identity/1234567890-abc123.jpg",
    "backImage": "uploads/kyc/identity/1234567891-def456.jpg",
    "status": "pending"
  }
}
```

**Erreurs possibles:**
- `400` - Fichier manquant ou type de document invalide
- `403` - Utilisateur n'est pas un driver
- `413` - Fichier trop volumineux (>5MB)

---

## 2. Upload Address Proof

**Endpoint:** `POST /kyc/address-upload`

**Headers:**
- `Authorization: <token>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document` | file | ✅ | Justificatif de domicile (facture, attestation, etc.) |

**Exemple:**
```bash
curl -X POST http://localhost:8080/kyc/address-upload \
  -H "Authorization: your-jwt-token" \
  -F "document=@/path/to/bill.pdf"
```

**Réponse (200 OK):**
```json
{
  "message": "Address proof uploaded successfully",
  "data": {
    "documentId": "doc-uuid",
    "filePath": "uploads/kyc/address/1234567890-xyz789.pdf",
    "status": "pending"
  }
}
```

---

## 3. Upload Selfie with Document

**Endpoint:** `POST /kyc/selfie-upload`

**Headers:**
- `Authorization: <token>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selfie` | file | ✅ | Photo du driver tenant son document d'identité |

**Exemple:**
```bash
curl -X POST http://localhost:8080/kyc/selfie-upload \
  -H "Authorization: your-jwt-token" \
  -F "selfie=@/path/to/selfie.jpg"
```

**Réponse (200 OK):**
```json
{
  "message": "Selfie uploaded successfully",
  "data": {
    "documentId": "doc-uuid",
    "filePath": "uploads/kyc/selfie/1234567890-selfie123.jpg",
    "status": "pending"
  }
}
```

**Erreurs possibles:**
- `400` - Fichier manquant ou pas une image

---

## 4. Submit Personal References (Optional)

**Endpoint:** `POST /kyc/references`

**Headers:**
- `Authorization: <token>`
- `Content-Type: application/json`

**Body (JSON):**
```json
{
  "references": [
    {
      "fullName": "Marie Dupont",
      "phone": "+22891234567",
      "relation": "Ami"
    },
    {
      "fullName": "Jean Martin",
      "phone": "+22898765432",
      "relation": "Collègue"
    }
  ]
}
```

**Contraintes:**
- Minimum: 0 (optionnel)
- Maximum: 3 références

**Pour sauter cette étape (optionnel):**
```json
{
  "references": []
}
```

**Réponse (200 OK):**
```json
{
  "message": "References submitted successfully",
  "data": {
    "count": 2,
    "status": "pending"
  }
}
```

**Si sauté:**
```json
{
  "message": "References skipped (optional)",
  "data": {
    "status": "skipped"
  }
}
```

---

## 5. Get KYC Status

**Endpoint:** `GET /kyc/status`

**Headers:**
- `Authorization: <token>`

**Exemple:**
```bash
curl -X GET http://localhost:8080/kyc/status \
  -H "Authorization: your-jwt-token"
```

**Réponse (200 OK):**
```json
{
  "data": {
    "overallStatus": "in_progress",
    "completionPercentage": 66,
    "canResubmit": true,
    "rejectionReason": null,
    "documents": {
      "identity": {
        "status": "pending",
        "uploadedAt": "2024-01-01T10:00:00Z",
        "documentType": "cni",
        "verificationNotes": null
      },
      "address": {
        "status": "pending",
        "uploadedAt": "2024-01-01T10:05:00Z",
        "verificationNotes": null
      },
      "selfie": {
        "status": "pending",
        "uploadedAt": "2024-01-01T10:10:00Z",
        "verificationNotes": null
      },
      "references": {
        "status": "pending",
        "count": 2,
        "references": [
          {
            "name": "Marie Dupont",
            "phone": "+22891234567",
            "relation": "Ami",
            "verificationStatus": "pending"
          }
        ]
      }
    },
    "dates": {
      "startedAt": "2024-01-01T09:55:00Z",
      "submittedAt": null,
      "verifiedAt": null,
      "rejectedAt": null
    }
  }
}
```

**Status possibles:**
- `not_started` - Aucun document soumis
- `in_progress` - Documents en cours de soumission
- `pending_review` - Tous les documents soumis, en attente de vérification admin
- `verified` - KYC approuvé ✅
- `rejected` - KYC rejeté ❌

**Status des documents individuels:**
- `not_submitted` - Pas encore envoyé
- `pending` - En attente de vérification
- `verified` - Vérifié
- `rejected` - Rejeté
- `skipped` - Sauté (uniquement pour references)

---

## 6. Submit KYC for Review

**Endpoint:** `POST /kyc/submit`

**Headers:**
- `Authorization: <token>`
- `Content-Type: application/json`

**Body:** Aucun body requis

**Exemple:**
```bash
curl -X POST http://localhost:8080/kyc/submit \
  -H "Authorization: your-jwt-token"
```

**Réponse (200 OK):**
```json
{
  "message": "KYC submitted for review successfully. You will be notified once the review is complete.",
  "data": {
    "status": "pending_review",
    "submittedAt": "2024-01-01T10:30:00Z"
  }
}
```

**Erreurs possibles:**
- `400` - Documents manquants
  ```json
  {
    "error": "Cannot submit KYC. Please upload all required documents first.",
    "missing": {
      "identity": false,
      "address": true,
      "selfie": false
    }
  }
  ```

---

## Workflow Complet

### Étape 1: Inscription Driver
```
POST /auth/verify-otp
Body: { phone, code, fullName, appType: "kolideliver" }
→ user_type = "driver" + KYC status initialisé
```

### Étape 2: Upload des documents (ordre flexible)
```
POST /kyc/identity-upload (CNI/Passport/Permit)
POST /kyc/address-upload (Justificatif domicile)
POST /kyc/selfie-upload (Selfie avec document)
POST /kyc/references (Optionnel)
```

### Étape 3: Vérifier le statut
```
GET /kyc/status
→ Vérifier completion_percentage = 100
```

### Étape 4: Soumettre pour validation
```
POST /kyc/submit
→ overallStatus = "pending_review"
```

### Étape 5: Admin valide (Dashboard)
```
(Admin dashboard - à implémenter)
→ overallStatus = "verified"
→ user.driver_verified = true
```

---

## Calcul du pourcentage de complétion

**3 documents obligatoires:**
- Identity ✅
- Address ✅
- Selfie ✅

**1 document optionnel:**
- References (pas compté dans le pourcentage)

**Formule:**
```
completion_percentage = (documents_verified / 3) * 100
```

**Exemples:**
- 0/3 → 0%
- 1/3 → 33%
- 2/3 → 66%
- 3/3 → 100%

---

## Contraintes de fichiers

| Type | Formats acceptés | Taille max | Notes |
|------|-----------------|------------|-------|
| Identity | JPEG, PNG, PDF | 5 MB | CNI nécessite front+back |
| Address | JPEG, PNG, PDF | 5 MB | - |
| Selfie | JPEG, PNG | 5 MB | Doit être une image |

---

## Codes d'erreur

| Code | Description |
|------|-------------|
| 400 | Requête invalide (fichier manquant, format invalide, etc.) |
| 401 | Non authentifié (token manquant ou invalide) |
| 403 | Accès refusé (pas un driver ou KYC déjà vérifié) |
| 413 | Fichier trop volumineux (>5MB) |
| 422 | Validation échouée |
| 500 | Erreur serveur |

---

## Base de données

**Tables créées:**
1. `kyc_documents` - Documents uploadés
2. `kyc_references` - Références personnelles
3. `kyc_status` - État global du KYC

**Migrations à exécuter:**
```bash
# 1. Migration user_type
psql -U dbuser -d db -f migration_user_type.sql

# 2. Schema KYC
psql -U dbuser -d db -f kyc_schema.sql
```

---

## Frontend Integration (Kolideliver)

### 1. Inscription
```typescript
// auth.tsx
const response = await fetch('/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: phoneNumber,
    code: otpCode,
    fullName: fullName,
    appType: 'kolideliver'  // ⭐ Important!
  })
})
```

### 2. Upload Identity
```typescript
// kyc-identity.tsx
const formData = new FormData()
formData.append('documentType', selectedType) // 'cni', 'passport', 'permit'
formData.append('frontImage', frontImageFile)
if (selectedType === 'cni') {
  formData.append('backImage', backImageFile)
}

const response = await fetch('/kyc/identity-upload', {
  method: 'POST',
  headers: { 'Authorization': token },
  body: formData
})
```

### 3. Get Status
```typescript
// kyc.tsx
const response = await fetch('/kyc/status', {
  headers: { 'Authorization': token }
})
const { data } = await response.json()
// Utiliser data.completionPercentage pour la progress bar
```

---

## Admin Dashboard (À implémenter)

**Routes Admin nécessaires:**
```
GET  /admin/kyc/pending          # Liste des KYC en attente
GET  /admin/kyc/:userId          # Détails KYC d'un driver
POST /admin/kyc/:userId/approve  # Approuver KYC
POST /admin/kyc/:userId/reject   # Rejeter KYC (avec raison)
```

---

## Notes importantes

1. **Sécurité:** Les fichiers sont stockés localement dans `uploads/kyc/`. En production, utiliser AWS S3, Google Cloud Storage, ou similaire.

2. **Validation manuelle:** Le système marque automatiquement les documents comme "pending". Un admin doit valider manuellement via le dashboard.

3. **Resoumission:** Si un document est rejeté, le driver peut le re-uploader. Le système garde l'historique.

4. **Notifications:** Implémenter des notifications (email/SMS/push) pour informer le driver du statut de sa vérification.

5. **RGPD:** Les données KYC sont sensibles. Assurer le chiffrement et la conformité RGPD.

---

## Variables d'environnement

Ajouter dans `.env`:
```env
JWT_SECRET="your-secret-key"
ENV="dev"
```

---

## Tests

**Tester avec curl:**
```bash
# 1. Inscription driver
curl -X POST http://localhost:8080/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+22812345678","code":"123456","fullName":"Test Driver","appType":"kolideliver"}'

# 2. Récupérer le token et tester KYC status
curl -X GET http://localhost:8080/kyc/status \
  -H "Authorization: <token-from-step-1>"
```

---

## Support

Pour toute question, consulter:
- `kyc_schema.sql` - Structure des tables
- `src/handlers/kyc.ts` - Logique des handlers
- `src/repositories/kyc.ts` - Accès base de données
- `src/middleware/rbac.ts` - Contrôle d'accès
