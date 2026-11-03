# Assist — assistant vocal Home Assistant

Fiche « Assist » du lanceur : un champ de saisie, l'historique de la conversation
(bulles), des suggestions en cartes quand le fil est vide.

- **API** : commande WebSocket `conversation/process` (`src/lib/assist.ts`), la même que
  le frontend de HA. Elle renvoie, en plus de la phrase, le `conversation_id` qui permet
  d'enchaîner les questions et les entités touchées (affichées en pastilles sous la bulle).
  Le service `conversation.process` ne donne pas ce fil, d'où le choix de la commande.
- **Agent** : celui que HA désigne par défaut.
- **Erreurs** : `unreachable` (pas de connexion, socket perdue, 20 s sans réponse),
  `noAgent` (`unknown_command` : intégration `conversation` absente, ou agent introuvable),
  `unknown`. Chacune a son message (`layout.assist.errors.*`).
- **Micro** : présent mais **désactivé** — la reconnaissance vocale n'est pas dans ce lot
  (elle demande le pipeline `assist_pipeline/run` et la capture audio du navigateur).
- **Mode simulé** (`vite --mode mock`, e2e) : `src/mocks/demoAssist.ts` joue l'agent.
  Mots-clés : « lumière/light », « température », « agent » (aucun agent), « panne/offline » (HA injoignable).
- **Entrée** : le lanceur (`Launcher.tsx`). Pas d'entrée dans le rail, qui n'accueille que
  des pages et des panneaux épinglés.
