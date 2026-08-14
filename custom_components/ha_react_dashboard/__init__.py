"""HA React Dashboard — intégration Home Assistant.

Trois choses, toutes automatiques :

1. sert le bundle React et l'injecte dans le frontend (l'élément
   `<ha-react-dashboard-panel>` devient une carte Lovelace utilisable) ;
2. crée un tableau de bord Lovelace en mode YAML qui ne contient que cette
   carte — c'est ce qui le rend « définissable par défaut », ce qu'un panneau
   d'add-on ou un panneau custom ne permet pas ;
3. expose l'API de persistance qui remplace le serveur Express de l'add-on.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
    async_remove_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .api import async_register_views
from .const import (
    DASHBOARD_FILENAME,
    DASHBOARD_ICON,
    DASHBOARD_TITLE,
    DASHBOARD_URL_PATH,
    DASHBOARD_YAML,
    DOMAIN,
    FILES_URL,
    JS_FILE,
    STATIC_URL,
    UPLOAD_DIR,
)
from .store import DashboardStore

_LOGGER = logging.getLogger(__name__)

# Vues et chemins statiques ne se désenregistrent pas côté aiohttp, et les
# réenregistrer lève. On ne les pose donc qu'une fois par démarrage de HA, même
# si l'utilisateur recharge l'entrée.
_HTTP_READY = f"{DOMAIN}_http"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Met en place le dashboard."""
    store = DashboardStore(hass)
    await store.async_load()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = store

    www_dir = Path(__file__).parent / "www"
    uploads_dir = Path(hass.config.path(UPLOAD_DIR, "uploads"))

    def _prepare_files() -> int:
        uploads_dir.mkdir(parents=True, exist_ok=True)
        # Les chemins statiques sont enregistrés une fois pour toutes : si ces
        # dossiers n'existent pas encore, aiohttp refuse de démarrer.
        (www_dir / "chunks").mkdir(parents=True, exist_ok=True)
        (www_dir / "assets").mkdir(parents=True, exist_ok=True)
        dashboard_file = Path(hass.config.path(DASHBOARD_FILENAME))
        dashboard_file.parent.mkdir(parents=True, exist_ok=True)
        # Jamais réécrit : l'utilisateur peut ajuster la vue (kiosk, titre…).
        if not dashboard_file.exists():
            dashboard_file.write_text(DASHBOARD_YAML, encoding="utf-8")
        js_file = www_dir / JS_FILE
        return int(js_file.stat().st_mtime) if js_file.is_file() else 0

    js_version = await hass.async_add_executor_job(_prepare_files)
    if not js_version:
        _LOGGER.error(
            "Bundle %s absent de %s — lancez `npm run build:panel`", JS_FILE, www_dir
        )

    if not hass.data[DOMAIN].get(_HTTP_READY):
        # L'ordre compte, aiohttp retient le premier préfixe qui correspond.
        #
        # Les chunks portent une empreinte de contenu dans leur nom : ils sont
        # immuables, donc cachés longtemps. L'entrée, elle, garde le même nom
        # d'une version à l'autre — la mettre en cache long servait un bundle
        # périmé tant que HA n'avait pas redémarré, puisque le `?v=` n'est
        # recalculé qu'au démarrage. Elle ne pèse que 2 ko : on la revalide.
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(f"{STATIC_URL}/chunks", str(www_dir / "chunks"), True),
                StaticPathConfig(f"{STATIC_URL}/assets", str(www_dir / "assets"), True),
                StaticPathConfig(STATIC_URL, str(www_dir), False),
                StaticPathConfig(FILES_URL, str(uploads_dir), True),
            ]
        )
        async_register_views(hass, store)
        hass.data[DOMAIN][_HTTP_READY] = True

    # `?v=` : sans lui, le navigateur garde l'ancien bundle après mise à jour.
    await _async_register_resource(hass, f"{STATIC_URL}/{JS_FILE}?v={js_version}")
    _async_register_dashboard(hass)
    return True


async def _async_register_resource(hass: HomeAssistant, url: str) -> None:
    """Déclare le bundle comme ressource Lovelace.

    Indispensable, et pas interchangeable avec `add_extra_js_url` : Lovelace
    **attend** le chargement de ses ressources avant de rendre la vue, alors
    qu'un script ajouté à la page court en parallèle. Sur un rechargement un peu
    lent, la vue était rendue la première et affichait « Custom element doesn't
    exist: ha-react-dashboard-panel ».

    Repli sur `add_extra_js_url` si les ressources sont gérées en YAML : la
    collection est alors en lecture seule, et l'utilisateur doit déclarer la
    ressource lui-même.
    """
    data = hass.data.get("lovelace")
    resources = data.get("resources") if isinstance(data, dict) else getattr(data, "resources", None)

    try:
        if resources is None or not hasattr(resources, "async_create_item"):
            raise AttributeError("ressources Lovelace en lecture seule")

        # Charge la collection : sans ça, `async_items` est vide au démarrage et
        # on créerait un doublon à chaque redémarrage.
        await resources.async_get_info()

        for item in resources.async_items():
            if str(item.get("url", "")).startswith(f"{STATIC_URL}/{JS_FILE}"):
                if item["url"] != url:
                    await resources.async_update_item(item["id"], {"url": url})
                return
        await resources.async_create_item({"res_type": "module", "url": url})
    except Exception:  # noqa: BLE001 — dépend d'API internes de HA
        _LOGGER.warning(
            "Ressource Lovelace non enregistrée, repli sur l'injection globale. "
            "Si la carte s'affiche par intermittence, ajoutez %s comme ressource "
            "de type module.",
            url,
            exc_info=True,
        )
        add_extra_js_url(hass, url)


def _lovelace_dashboards(hass: HomeAssistant) -> dict | None:
    """Le registre des tableaux de bord Lovelace, quelle que soit sa forme.

    `hass.data["lovelace"]` est un dict jusqu'à HA 2025.1, une dataclass
    `LovelaceData` ensuite. Aucune API publique n'expose ce registre : les deux
    accès sont testés plutôt que d'en supposer un.
    """
    data = hass.data.get("lovelace")
    if isinstance(data, dict):
        return data.get("dashboards")
    return getattr(data, "dashboards", None)


def _async_register_dashboard(hass: HomeAssistant) -> None:
    """Déclare le tableau de bord Lovelace en mode YAML.

    On passe par les structures internes du composant `lovelace` : il n'y a pas
    d'API publique pour ajouter un tableau de bord depuis une intégration, et
    c'est le chemin qu'empruntent les projets du même genre (UI Lovelace
    Minimalist). En cas de changement côté HA, on renonce au tableau de bord
    plutôt que d'empêcher l'intégration de démarrer — la carte, elle, reste
    disponible et l'utilisateur peut créer le tableau de bord à la main.
    """
    try:
        from homeassistant.components.lovelace import dashboard  # noqa: PLC0415

        dashboards = _lovelace_dashboards(hass)
        if dashboards is None:
            _LOGGER.warning("Lovelace n'est pas chargé — tableau de bord non créé")
            return
        if DASHBOARD_URL_PATH in dashboards:
            return

        dashboards[DASHBOARD_URL_PATH] = dashboard.LovelaceYAML(
            hass,
            DASHBOARD_URL_PATH,
            {
                "mode": "yaml",
                "filename": DASHBOARD_FILENAME,
                "title": DASHBOARD_TITLE,
                "icon": DASHBOARD_ICON,
                "show_in_sidebar": True,
                "require_admin": False,
            },
        )
        async_register_built_in_panel(
            hass,
            "lovelace",
            sidebar_title=DASHBOARD_TITLE,
            sidebar_icon=DASHBOARD_ICON,
            frontend_url_path=DASHBOARD_URL_PATH,
            config={"mode": "yaml"},
            require_admin=False,
            update=True,
        )
    except Exception:  # noqa: BLE001 — dépend d'API internes de HA
        _LOGGER.exception("Création du tableau de bord Lovelace impossible")


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Retire le tableau de bord et le panneau."""
    try:
        dashboards = _lovelace_dashboards(hass)
        if dashboards is not None:
            dashboards.pop(DASHBOARD_URL_PATH, None)
        async_remove_panel(hass, DASHBOARD_URL_PATH)
    except Exception:  # noqa: BLE001
        _LOGGER.debug("Retrait du tableau de bord impossible", exc_info=True)

    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return True
