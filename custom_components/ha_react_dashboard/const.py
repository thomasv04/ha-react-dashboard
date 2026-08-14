"""Constantes de l'intégration HA React Dashboard."""

DOMAIN = "ha_react_dashboard"

# Bundle JS (Web Component) construit par `npm run build:panel`.
JS_FILE = "ha-react-dashboard.js"
STATIC_URL = f"/{DOMAIN}_static"
# Fichiers téléversés, servis en statique : un `<img>` ou un `url()` CSS ne peut
# pas porter d'en-tête d'authentification. Noms en UUID, images matricielles
# uniquement — l'URL fait office de capacité, comme `/local` chez HA.
FILES_URL = f"/{DOMAIN}_files"

# Tableau de bord Lovelace créé automatiquement. C'est ce qui permet de le
# « définir par défaut » : un panneau custom ou un panneau d'add-on n'apparaît
# pas dans ce sélecteur, seuls les tableaux de bord Lovelace y figurent.
DASHBOARD_URL_PATH = "react-dashboard"
DASHBOARD_TITLE = "React Dashboard"
DASHBOARD_ICON = "mdi:view-dashboard-variant"
DASHBOARD_DIR = DOMAIN
DASHBOARD_FILENAME = f"{DASHBOARD_DIR}/dashboard.yaml"

# Le fichier n'est écrit que s'il n'existe pas : l'utilisateur peut le modifier.
DASHBOARD_YAML = """# Généré par l'intégration HA React Dashboard.
# Vue unique en mode panneau : la carte occupe tout l'écran.
views:
  - type: panel
    title: Dashboard
    cards:
      - type: custom:ha-react-dashboard-panel
        # `kiosk` ne fixe que le défaut. Chaque appareil tranche ensuite depuis
        # le dashboard : Paramètres → Disposition → Plein écran.
        # kiosk: false  ← garder l'en-tête et la barre latérale de HA
"""

STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1

# Téléversements : servis par notre propre vue, jamais par /local, pour pouvoir
# poser les en-têtes qui neutralisent un fichier piégé.
UPLOAD_DIR = DOMAIN
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_ICON_SIZE = 2 * 1024 * 1024
IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}
# ponytail: pas de SVG côté intégration — le nettoyer demande un parseur
# (DOMPurify côté add-on), et le servir tel quel ouvre une XSS same-origin.
# À rouvrir le jour où on ajoute une dépendance de sanitisation.
ICON_TYPES = {
    "image/png": ".png",
    "image/webp": ".webp",
}
