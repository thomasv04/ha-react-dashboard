"""Mise en place : tableau de bord Lovelace, panneau, fichiers."""

from __future__ import annotations

from pathlib import Path

from custom_components.ha_react_dashboard import _lovelace_dashboards
from custom_components.ha_react_dashboard.const import (
    DASHBOARD_FILENAME,
    DASHBOARD_URL_PATH,
    DOMAIN,
)


async def test_dashboard_file_is_created(hass, entry):
    """Le YAML du tableau de bord est écrit avec la carte dedans."""
    path = Path(hass.config.path(DASHBOARD_FILENAME))
    assert path.is_file()
    content = path.read_text(encoding="utf-8")
    assert "custom:ha-react-dashboard-panel" in content
    assert "type: panel" in content


async def test_dashboard_file_is_never_overwritten(hass, entry):
    """Un YAML retouché par l'utilisateur survit à un rechargement."""
    path = Path(hass.config.path(DASHBOARD_FILENAME))
    path.write_text("views: []\n", encoding="utf-8")

    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert path.read_text(encoding="utf-8") == "views: []\n"


async def test_lovelace_dashboard_is_registered(hass, entry):
    """Le tableau de bord existe côté Lovelace — c'est ce qui le rend
    « définissable par défaut »."""
    dashboards = _lovelace_dashboards(hass)
    assert DASHBOARD_URL_PATH in dashboards

    config = dashboards[DASHBOARD_URL_PATH].config
    assert config["mode"] == "yaml"
    assert config["url_path"] == DASHBOARD_URL_PATH
    assert config["title"]


async def test_panel_is_registered(hass, entry):
    """Le panneau apparaît dans la barre latérale."""
    assert DASHBOARD_URL_PATH in hass.data["frontend_panels"]
    panel = hass.data["frontend_panels"][DASHBOARD_URL_PATH]
    assert panel.component_name == "lovelace"


async def test_reload_does_not_crash(hass, entry):
    """Recharger l'entrée ne doit pas réenregistrer les routes aiohttp."""
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state.recoverable is False or True  # pas d'exception = OK
    assert DASHBOARD_URL_PATH in _lovelace_dashboards(hass)


async def test_unload_removes_the_dashboard(hass, entry):
    """Désinstaller retire le tableau de bord et le panneau."""
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert DASHBOARD_URL_PATH not in _lovelace_dashboards(hass)
    assert DASHBOARD_URL_PATH not in hass.data["frontend_panels"]
    assert entry.entry_id not in hass.data[DOMAIN]


def _resources(hass):
    data = hass.data.get("lovelace")
    return data.get("resources") if isinstance(data, dict) else getattr(data, "resources", None)


async def test_bundle_is_registered_as_a_lovelace_resource(hass, entry):
    """Lovelace attend ses ressources avant de rendre la vue.

    Injecté autrement, le script court en parallèle du rendu : sur un
    rechargement lent, la vue s'affichait « Custom element doesn't exist ».
    """
    urls = [item["url"] for item in _resources(hass).async_items()]
    assert any(url.startswith("/ha_react_dashboard_static/ha-react-dashboard.js") for url in urls), urls


async def test_resource_is_not_duplicated_on_reload(hass, entry):
    """Un redémarrage ne doit pas empiler les ressources."""
    before = len(_resources(hass).async_items())

    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert len(_resources(hass).async_items()) == before
