#!/usr/bin/env bash
# Publie les captures de `tests/ha/screenshots.spec.ts` en commentaire d'une PR.
#
#   scripts/pr-screenshots.sh <numéro de PR> <dossier des .png>
#   scripts/pr-screenshots.sh <numéro de PR> --remove     (PR fermée)
#
# Un commentaire de PR ne sait pas afficher une image d'artefact : les captures
# vont sur la branche `ci-screenshots`, dans `pr-<n>/`, servies par
# raw.githubusercontent.com. Cette branche n'a jamais qu'un seul commit,
# remplacé à chaque publication : sans ça, chaque push ajouterait ses images à
# l'historique, et tout `git clone` du dépôt les téléchargerait.
#
# Pour la CI : `GH_TOKEN`, `GITHUB_REPOSITORY`, `GITHUB_RUN_ID`, et `HEAD_SHA`,
# le dernier commit de la PR (`GITHUB_SHA` est le commit de fusion que GitHub
# fabrique pour la tester) ; droits `contents: write` et `pull-requests: write`.
set -euo pipefail

PR=$1
SRC=$2
BRANCH=ci-screenshots
MARKER='<!-- ha-screenshots -->'

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

# Plusieurs PR publient en même temps : `--force-with-lease` refuse d'écraser un
# commit qu'on n'a pas lu, et on recommence à partir du nouveau.
for attempt in 1 2 3 4 5; do
  base=''
  if git fetch -q --depth 1 origin "$BRANCH" 2>/dev/null; then base=$(git rev-parse FETCH_HEAD); fi

  export GIT_INDEX_FILE
  GIT_INDEX_FILE=$(mktemp -u)
  if [ -n "$base" ]; then git read-tree "$base"; else git read-tree --empty; fi
  git rm -rq --cached --ignore-unmatch "pr-$PR"
  if [ "$SRC" != '--remove' ]; then
    for file in "$SRC"/*.png; do
      git update-index --add --cacheinfo 100644 "$(git hash-object -w "$file")" "pr-$PR/$(basename "$file")"
    done
  fi
  commit=$(git commit-tree "$(git write-tree)" -m "Captures des PR ouvertes")
  rm -f "$GIT_INDEX_FILE"
  unset GIT_INDEX_FILE

  if git push -q --force-with-lease="refs/heads/$BRANCH:$base" origin "$commit:refs/heads/$BRANCH"; then break; fi
  if [ "$attempt" = 5 ]; then exit 1; fi
  sleep $((attempt * 2))
done

[ "$SRC" = '--remove' ] && exit 0

# Une image par thème, côte à côte. `?v=` : le proxy d'images de GitHub garde
# une URL en cache, et celle-ci ne change pas d'un push à l'autre.
url() { echo "https://raw.githubusercontent.com/$GITHUB_REPOSITORY/$BRANCH/pr-$PR/$1?v=$GITHUB_RUN_ID"; }
rows=''
for dark in "$SRC"/*-dark.png; do
  name=$(basename "$dark" -dark.png)
  label=${name#*-}
  rows+="| ${label//-/ } | <img src=\"$(url "$name-dark.png")\" width=\"400\"> | <img src=\"$(url "$name-light.png")\" width=\"400\"> |"$'\n'
done

body="$MARKER
### La carte dans un vrai Home Assistant

Prises par \`tests/ha/screenshots.spec.ts\` sur le commit ${HEAD_SHA:0:7}, entités de l'intégration \`demo\`.

| | Sombre | Clair |
|---|---|---|
$rows"

id=$(gh api "repos/$GITHUB_REPOSITORY/issues/$PR/comments" --paginate --jq ".[] | select(.body | startswith(\"$MARKER\")) | .id" | head -n 1)
if [ -n "$id" ]; then
  gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" -f body="$body" > /dev/null
else
  gh api "repos/$GITHUB_REPOSITORY/issues/$PR/comments" -f body="$body" > /dev/null
fi
