import type { EntityType } from '@/types/aura';
import { useEntityStore } from '@/store/useEntityStore';

interface TemplateNode {
  type: EntityType;
  title: string;
  props?: Record<string, unknown>;
  children?: TemplateNode[];
}

export interface CascadeTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  root: TemplateNode;
}

const O = (title: string, horizon: string, children?: TemplateNode[]): TemplateNode => ({
  type: 'objective',
  title,
  props: { horizon, priority: 'high' },
  children,
});
const P = (title: string, children?: TemplateNode[]): TemplateNode => ({ type: 'project', title, props: { priority: 'medium' }, children });
const T = (title: string): TemplateNode => ({ type: 'task', title, props: { status: 'todo', priority: 'medium' } });

export const CASCADE_TEMPLATES: CascadeTemplate[] = [
  {
    id: 'job-search',
    name: "Recherche d'emploi",
    emoji: '🎯',
    description: 'Cibler, candidater, réseauter et décrocher un nouveau poste.',
    root: {
      type: 'vision',
      title: 'Faire évoluer ma carrière',
      props: { horizon: 'vision' },
      children: [
        O('Décrocher un nouveau poste cette année', 'annual', [
          O('Obtenir 3 entretiens ce trimestre', 'quarter', [
            P('Refondre mon CV et mon profil', [T('Mettre à jour le CV'), T('Optimiser le profil LinkedIn'), T('Préparer un pitch de 30s')]),
            P('Activer mon réseau', [T('Lister 20 contacts cibles'), T('Relancer 5 contacts clés'), T('Demander 2 mises en relation')]),
            P('Postuler', [T('Identifier 10 entreprises cibles'), T('Envoyer 10 candidatures'), T('Suivre les réponses')]),
          ]),
          O('Signer une offre', 'quarter', [P('Négociation', [T('Préparer mes arguments'), T('Comparer les offres')])]),
        ]),
      ],
    },
  },
  {
    id: 'product-launch',
    name: 'Lancement de produit',
    emoji: '🚀',
    description: 'De la conception au lancement public.',
    root: {
      type: 'vision',
      title: 'Lancer un produit à succès',
      props: { horizon: 'vision' },
      children: [
        O('Lancer la v1 ce trimestre', 'quarter', [
          P('Découverte & cadrage', [T('Interviews utilisateurs'), T('Définir le périmètre MVP'), T('Maquettes')]),
          P('Développement', [T('Architecture'), T('Implémenter le cœur'), T('Tests')]),
          P('Go-to-market', [T('Page de lancement'), T('Plan de communication'), T('Lister 50 early adopters')]),
        ]),
      ],
    },
  },
  {
    id: 'certification',
    name: 'Certification / examen',
    emoji: '📚',
    description: 'Préparer et réussir une certification.',
    root: {
      type: 'objective',
      title: 'Obtenir ma certification',
      props: { horizon: 'annual', priority: 'high' },
      children: [
        O('Réussir l’examen', 'quarter', [
          P('Plan de révision', [T('Recenser le programme'), T('Planifier 8 semaines de révision'), T('Rassembler les ressources')]),
          P('Apprentissage', [T('Réviser les modules'), T('Faire 3 examens blancs'), T('Réviser les points faibles')]),
          P('Jour J', [T('S’inscrire à l’examen'), T('Préparer la logistique')]),
        ]),
      ],
    },
  },
];

/** Instantiate a template as a real entity tree (with cascade relations). */
export async function applyCascadeTemplate(template: CascadeTemplate): Promise<string> {
  const s = useEntityStore.getState();
  const create = async (node: TemplateNode, parentId: string | null): Promise<string> => {
    const id = await s.createEntity(node.type, { title: node.title, props: node.props ?? {} });
    if (parentId) s.setParent(id, parentId);
    for (const child of node.children ?? []) await create(child, id);
    return id;
  };
  return create(template.root, null);
}
