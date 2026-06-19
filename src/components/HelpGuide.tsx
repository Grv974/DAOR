import { X } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

interface Section {
  title: string;
  items: { label: string; desc: string }[];
}

const SECTIONS: Section[] = [
  {
    title: '✍️ Éditeur',
    items: [
      { label: 'Commandes /', desc: "Tapez « / » au début d'un bloc pour insérer titres, listes, checklist, code, citation, callout, tableau, colonnes, image, fichier, séparateur." },
      { label: 'Raccourcis Markdown', desc: '« # » titre, « - » liste, « [] » checklist, « > » citation, « ``` » code, « --- » séparateur.' },
      { label: 'Mise en forme', desc: 'Gras (Ctrl/Cmd+B), italique (Ctrl/Cmd+I), souligné (Ctrl/Cmd+U), code en ligne.' },
      { label: 'Images & fichiers', desc: "Via /image et /fichier, ou collez/glissez une image directement. Stockés localement dans le navigateur." },
    ],
  },
  {
    title: '🗂️ Pages & navigation',
    items: [
      { label: 'Sous-pages infinies', desc: 'Survolez une page dans la sidebar et cliquez « + » pour créer une sous-page.' },
      { label: 'Glisser-déposer', desc: 'Réorganisez les pages dans la sidebar : déposez sur le haut/bas d’une page pour la classer, ou au centre pour l’imbriquer.' },
      { label: 'Favoris', desc: 'Menu « … » d’une page → Ajouter aux favoris (section dédiée en haut de la sidebar).' },
      { label: 'Icône & titre', desc: 'Cliquez sur l’icône en haut de page pour choisir un emoji.' },
    ],
  },
  {
    title: '🔎 Recherche',
    items: [
      { label: 'Palette', desc: 'Ctrl/Cmd+K ouvre la recherche instantanée. Flèches pour naviguer, Entrée pour ouvrir.' },
      { label: 'Couverture', desc: 'Cherche dans les titres, le contenu des pages et les lignes des bases de données (badge « base »).' },
    ],
  },
  {
    title: '🧮 Bases de données',
    items: [
      { label: 'Créer', desc: '« Nouvelle base » dans la sidebar. Propriétés : texte, nombre, date, case à cocher, sélection, multi-sélection.' },
      { label: 'Vues', desc: 'Table, Kanban (drag & drop des cartes), Galerie, Calendrier. Ajoutez des vues via « + » dans la barre d’onglets.' },
      { label: 'Filtres / tris / groupes', desc: 'Barre d’outils de la vue : filtrez, triez sur plusieurs critères, groupez le kanban par une propriété sélection.' },
      { label: 'Modèles', desc: 'Définissez des modèles de lignes pré-remplis et réutilisez-les en un clic.' },
    ],
  },
  {
    title: '💾 Sauvegarde & corbeille',
    items: [
      { label: 'Export', desc: 'JSON (sauvegarde complète, ré-importable) ou Markdown (.zip arborescent prêt pour un dépôt GitHub).' },
      { label: 'Import', desc: 'Importez un JSON DAOR ou un fichier Markdown (.md) comme nouvelle page.' },
      { label: 'Corbeille', desc: 'Les pages supprimées sont récupérables depuis la corbeille (icône en bas de la sidebar) ou supprimables définitivement.' },
    ],
  },
  {
    title: '🎨 Confort',
    items: [
      { label: 'Thème', desc: 'Basculez clair/sombre via l’icône en haut à droite.' },
      { label: 'Sidebar', desc: 'Repliez/dépliez la barre latérale ; un bouton flottant la fait toujours réapparaître.' },
      { label: 'Hors ligne / PWA', desc: 'Installable et utilisable hors connexion. Les données vivent dans ce navigateur — pensez à exporter régulièrement.' },
    ],
  },
];

export function HelpGuide() {
  const { helpOpen, setHelpOpen } = useUIStore();
  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[8vh]"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-notion-border bg-white shadow-2xl dark:border-notion-border-dark dark:bg-[#202020]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-notion-border px-5 py-3 dark:border-notion-border-dark">
          <h2 className="text-lg font-semibold">Guide des fonctionnalités</h2>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {SECTIONS.map((section) => (
            <section key={section.title} className="mb-5">
              <h3 className="mb-2 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item.label} className="text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-notion-muted"> — {item.desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
