# Audit de sécurité & confidentialité — DAOR

_Dernière mise à jour : 2026-06-20_

DAOR est une application **100 % statique** (hébergée sur GitHub Pages) qui
fonctionne entièrement dans ton navigateur. Il n'y a **aucun serveur applicatif
ni base de données distante** : tes données ne transitent par aucun back-end.

## 1. Où vivent tes données

| Donnée | Emplacement | Exportée ? | Chiffrée au repos ? |
|---|---|---|---|
| Pages, bases, lignes, entités, relations, engagements, interactions | IndexedDB (navigateur) | ✅ JSON | ❌ (sauf export chiffré) |
| Fichiers joints, photos de profil | IndexedDB / props d'entité | ✅ JSON | ❌ |
| Ordre des pages racine, disposition du tableau de bord, thème | localStorage | ✅ JSON (depuis v3) | ❌ |
| Clé API Anthropic (copilote) | localStorage `daor:anthropicKey` | ❌ (secret) | ❌ **en clair** |
| Token GitHub / config sync (PAT) | localStorage `daor:gitSync` | ❌ (secret) | ❌ **en clair** |
| Code d'accès | localStorage `daor:passcode` | ❌ | ❌ |

Tout ceci est stocké **localement, sur l'appareil et le profil de navigateur que tu
utilises**. Rien n'est envoyé automatiquement ailleurs.

## 2. Qui peut accéder à tes données

- **Toi, sur ce navigateur/appareil.** Les données restent dans le stockage local
  du navigateur.
- **Toute personne ayant accès à ton appareil/profil déverrouillé.** Le code
  d'accès (écran d'ouverture) est **dissuasif** mais reste contournable côté
  navigateur (outils de développement, lecture directe d'IndexedDB). Ce n'est
  **pas** un chiffrement.
- **Pas les autres sites web.** La _same-origin policy_ du navigateur empêche
  tout autre site de lire le stockage de DAOR.
- **Pas l'hébergeur (GitHub Pages).** Il ne sert que des fichiers statiques en
  HTTPS ; il ne reçoit aucune de tes données saisies.
- **Extensions de navigateur** disposant des permissions adéquates : elles
  peuvent techniquement lire le stockage de n'importe quelle page. N'installe que
  des extensions de confiance.

## 3. Sorties réseau (les seules)

Deux appels réseau existent, **uniquement quand tu les déclenches**, avec **tes
propres identifiants** :

1. **Copilote IA** → `api.anthropic.com`. Quand tu poses une question, un
   **contexte construit à partir de tes données** (objectifs, tâches, contacts à
   relancer, etc.) est envoyé à Anthropic avec ta clé API. N'utilise le copilote
   que si tu acceptes que ce contexte parte chez Anthropic.
2. **Sauvegarde GitHub** → `api.github.com`. Envoie un instantané JSON dans **ton**
   dépôt via **ton** PAT. La confidentialité dépend de ton dépôt (privé recommandé).

Aucune télémétrie, aucun traceur, aucun script tiers.

## 4. Surface d'attaque applicative

- **XSS** : aucun usage de `innerHTML`, `dangerouslySetInnerHTML`, `eval` ou
  `new Function`. Le contenu est rendu via React / ProseMirror (échappement par
  défaut). Surface faible.
- **Secrets exposés au JS de la page** : la clé Anthropic et le PAT GitHub sont
  en clair dans `localStorage`. En cas de faille XSS (ou d'extension malveillante),
  ils pourraient être lus. Périmètre de risque limité car ce sont **tes** clés.

## 5. Recommandations

- **Pour des données sensibles**, utilise l'**export chiffré par passphrase**
  (AES-GCM + PBKDF2) plutôt que le verrou par code, qui n'est pas du chiffrement.
- **Sauvegarde** régulièrement (export JSON, ou sync GitHub vers un **dépôt privé**).
- **PAT GitHub** : portée minimale (`Contents` sur un seul dépôt privé) et rotation
  en cas de doute.
- **Clé Anthropic** : n'active le copilote que sur un appareil de confiance ;
  retire la clé (bouton « Changer la clé ») sur un appareil partagé.
- **Appareil partagé** : pense à vider le stockage du navigateur en fin de session,
  ou utilise une fenêtre privée.

## 6. Complétude de l'export JSON

Depuis la **version 3** du format, l'export JSON contient l'intégralité du contenu
(les 8 tables IndexedDB) **plus** la structure d'affichage non secrète (ordre des
pages racine, disposition du tableau de bord, thème). Les **secrets** (clés API,
PAT, code d'accès) en sont **volontairement exclus**.
