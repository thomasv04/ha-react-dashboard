# Maquette de test

`smart-home-floor-plan.glb` — « Smart Home Interior Floor Plan »
(https://skfb.ly/o8AKr), par US Frame Factory, sous licence Creative Commons
Attribution 4.0 (http://creativecommons.org/licenses/by/4.0/). Fichier tel que
téléchargé, non modifié. Ses métadonnées citent comme auteur Boxy Construction
(https://sketchfab.com/boxyconstruction).

Elle sert aux tests de bout en bout de la page Plan en 3D
(`tests/dashboard/floorplan3d.spec.ts`), servie par le serveur de
développement : elle n'est embarquée ni dans le dashboard, ni dans l'image de
l'add-on.

## Ouvertures d'une maquette ExportToHASS

`home.glb` — une maison exportée de Sweet Home 3D avec le plugin
[ExportToHASS](https://github.com/adizanni/ExportToHASS), puis convertie en
`.glb` (obj2gltf) : ses portes et fenêtres sont des objets séparés. Elle sert
aux tests unitaires des ouvertures (`src/lib/floorplan-openings.test.ts`) et à
la page « Maison SH3D » du mode mock.

`openings.glb` — une petite maquette façon ExportToHASS, générée par
`npx tsx scripts/make-openings-glb.ts` : les tests de bout en bout des
ouvertures.
