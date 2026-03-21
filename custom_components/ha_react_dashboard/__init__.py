"""HA React Dashboard — custom integration.

Install via HACS, then add via Settings → Integrations → Add Integration.
The React dashboard panel will appear in the HA sidebar automatically.
"""

from __future__ import annotations

import logging
from pathlib import Path

import homeassistant.helpers.config_validation as cv
from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, JS_FILE, PANEL_ICON, PANEL_TITLE, PANEL_URL, STATIC_PATH

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up HA React Dashboard from a config entry."""
    www_path = Path(__file__).parent / "www"

    if not www_path.exists():
        _LOGGER.error("HA React Dashboard: www bundle not found at %s", www_path)
        return False

    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_PATH, str(www_path), True)]
        )
    except Exception:
        _LOGGER.exception("HA React Dashboard: failed to register static path")
        return False

    add_extra_js_url(hass, f"{STATIC_PATH}/{JS_FILE}")

    try:
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            frontend_url_path=PANEL_URL,
            config={
                "_panel_custom": {
                    "name": "ha-react-dashboard-panel",
                    "js_url": f"{STATIC_PATH}/{JS_FILE}",
                    "embed_iframe": False,
                    "trust_external_script": False,
                }
            },
            require_admin=False,
        )
    except Exception:
        _LOGGER.exception("HA React Dashboard: failed to register panel")
        return False

    _LOGGER.info("HA React Dashboard panel registered at /%s", PANEL_URL)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return True
