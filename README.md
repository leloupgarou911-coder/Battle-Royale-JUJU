# Battle-Royale-JUJU

**Battle-Royale-JUJU** est un projet de jeu 3D jouable dans un navigateur. Son ambition est de construire progressivement un monde virtuel inspiré de la géographie réelle, avec exploration, environnements urbains et, à terme, des expériences multijoueurs.

> Le dépôt commence par un prototype technique d'exploration 3D. Il ne s'agit pas encore d'un Battle Royale complet.

## Première version — Prototype 0.1

- Scène 3D rendue avec Three.js.
- Petit quartier urbain fictif : routes, bâtiments et arbres.
- Personnage contrôlable à la troisième personne.
- Caméra orientable à la souris.
- Commandes clavier AZERTY et QWERTY.
- Interface de lancement et coordonnées du joueur.

## Technologies

- TypeScript
- Three.js
- Vite
- GitHub Pages (publication statique prévue)

## Lancer le projet en local

Prérequis : Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Ouvre ensuite l'adresse locale indiquée par Vite.

Pour vérifier et compiler :

```bash
npm run typecheck
npm run build
npm run preview
```

Le résultat de compilation est généré dans `dist/`.

## Commandes du prototype

| Action | Commande |
|---|---|
| Avancer | Z / W / ↑ |
| Reculer | S / ↓ |
| Aller à gauche | Q / A / ← |
| Aller à droite | D / → |
| Courir | Maj |
| Orienter la caméra | Souris |
| Libérer la souris | Échap |

Clique dans la scène pour reprendre le contrôle de la caméra.

## Feuille de route

1. Prototype 3D et contrôles de déplacement.
2. Collisions, terrain et bâtiments mieux détaillés.
3. Intégration progressive de données géographiques ouvertes et correctement attribuées.
4. Intérieurs fictifs et exploration de bâtiments sélectionnés.
5. Optimisation du chargement des zones.
6. Architecture réseau et sessions multijoueurs.
7. Modes de jeu et systèmes de progression.

## Données géographiques et vie privée

Les premières scènes utilisent des éléments fictifs. Les futures données géographiques devront respecter leurs licences, leurs conditions d'utilisation et la vie privée. Le projet ne cherchera pas à reproduire les intérieurs privés réels des habitations.

## Licence

La licence du projet sera définie avant une diffusion publique de ses fichiers et ressources. Les données et ressources tierces conserveront leurs propres licences et attributions.