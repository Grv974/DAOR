# DAOR — Notion statique, sans serveur

DAOR est un clone de Notion **100 % statique**, hébergeable gratuitement sur **GitHub Pages**.
Toutes les données vivent dans le navigateur (IndexedDB + LocalStorage) : aucun backend, aucune base
de données serveur, fonctionnement hors ligne et installable en PWA.

## Stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** (thème clair/sombre)
- **Tiptap** (éditeur par blocs, ProseMirror)
- **Zustand** (état applicatif)
- **Dexie** (IndexedDB) + **LocalStorage** (préférences)
- **MiniSearch** (recherche full-text côté navigateur)
- **vite-plugin-pwa** (offline + installable)

## Démarrer

```bash
npm install
npm run dev      # serveur de dev
npm run build    # build de production (dist/)
npm run preview  # prévisualiser le build
```

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy.yml` build et publie `dist/` sur GitHub Pages à chaque push
sur `main`. Le `base` Vite est `/daor/` (à adapter au nom du dépôt). Le routing utilise **HashRouter**
pour éviter les 404 sur deep-link, sans configuration serveur.

---

## Périmètre — résultat de l'audit fonctionnel

### ✅ Réalisable et livré (MVP, sprints S0→S3)

- Arborescence de pages / sous-pages infinies, sidebar, favoris, breadcrumbs
- Éditeur par blocs : texte, titres, listes, checklist, citation, code, **callout**, **colonnes**,
  séparateur, **tableau**, **image** et **fichier** (stockés en Blob dans IndexedDB)
- **Slash commands** (`/`), raccourcis clavier, collage/glisser d'images
- Recherche instantanée indexée (Ctrl/Cmd+K)
- Export **JSON** (sauvegarde complète) + **Markdown** (.zip prêt pour un dépôt GitHub)
- Import **JSON**
- Thème clair/sombre, responsive, **PWA** offline

### ⚠️ Compromis liés à l'absence de backend

| Besoin Notion | Alternative locale retenue |
|---|---|
| Sync multi-appareils | Export/Import + snapshot Markdown commitables dans un dépôt GitHub |
| Historique de versions | (prévu) snapshots locaux périodiques dans IndexedDB |
| Embeds riches | iframe directe (pas de proxy de preview) |

### ❌ Hors périmètre (impossible sans serveur)

Collaboration temps réel, présence, partage/permissions, comptes/auth, notifications email,
API publique, Notion AI hébergée.

### Limites assumées

- Données liées au navigateur courant : vider le cache = perte → exports/backups essentiels.
- Mono-utilisateur, mono-appareil.
- Quotas IndexedDB du navigateur (gros fichiers à surveiller).

---

## Roadmap (sprints suivants)

- ✅ **S4** : bases de données locales (propriétés texte/nombre/date/checkbox/select/multi-select),
  vue table éditable.
- ✅ **S5** : vues kanban / galerie / calendrier, filtres / tris / groupes, templates de lignes.
- ✅ **S6** : recherche incrémentale (index maintenu en continu) couvrant pages, contenus
  et lignes de bases de données.
- ✅ **S7** : import Markdown (.md → page), en plus de l'import/export JSON et de l'export
  Markdown .zip.
- ✅ **S8** : drag & drop de réorganisation des pages (réordonner / imbriquer), corbeille
  (restauration & suppression définitive), guide des fonctionnalités intégré, code-splitting
  (éditeur et vues de bases chargés à la demande → chunk initial ~108 KB gzip).
- **À venir** : virtualisation de l'arbre (cible 10 000+ pages), drag & drop de blocs dans
  l'éditeur, sauvegarde GitHub avancée.

## Architecture des données

```
Page   { id, parentId, title, icon, cover, type, content(Tiptap JSON),
         childrenOrder[], favorite, trashed, createdAt, updatedAt }
FileBlob { id, name, mime, size, blob, createdAt }   // stockés dans IndexedDB
```

Les pages et les fichiers binaires sont stockés dans des object stores séparés afin que les
uploads volumineux ne forcent jamais la réécriture des documents. Les écritures de contenu de
l'éditeur sont *debounced* pour limiter les accès IndexedDB.
