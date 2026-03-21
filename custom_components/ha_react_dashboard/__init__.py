"""HA React Dashboard — custom integration.

Automatically registers a React dashboard panel in Home Assistant.
Install via HACS: adds 'React Dashboard' to the sidebar automatically.
No configuration needed — just add the integration and go.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, JS_FILE, PANEL_ICON, PANEL_TITLE, PANEL_URL, STATIC_PATH

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[str] = []


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up HA React Dashboard."""
    # Only init if not already done
    if DOMAIN in hass.data:
        return True

    hass.data[DOMAIN] = {}

    www_path = Path(__file__).parent / "www"

    if not www_path.exists():
        _LOGGER.error("HA React Dashboard: www bundle not found at %s", www_path)
        return False

    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_PATH, str(www_path), True)]
        )
    except Exception as err:
        _LOGGER.exception("HA React Dashboard: failed to register static path: %s", err)
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
    except Exception as err:
        _LOGGER.exception("HA React Dashboard: failed to register panel: %s", err)
        return False

    _LOGGER.info("HA React Dashboard panel registered at /%s", PANEL_URL)
    return True

