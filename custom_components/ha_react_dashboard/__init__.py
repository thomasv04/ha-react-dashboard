"""HA React Dashboard — custom integration.

Registers a React-based dashboard panel in Home Assistant at startup.
The React app is bundled as a Web Component (IIFE) and served via a
static path registered here.

Activation (add to configuration.yaml):
    ha_react_dashboard:
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

_LOGGER = logging.getLogger(__name__)

DOMAIN = "ha_react_dashboard"
PANEL_URL = "ha-react-dashboard"
PANEL_TITLE = "React Dashboard"
PANEL_ICON = "mdi:view-dashboard-variant"
JS_FILE = "ha-react-dashboard.iife.js"
STATIC_PATH = f"/hakit/{DOMAIN}"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the HA React Dashboard integration."""
    www_path = Path(__file__).parent / "www"

    if not www_path.exists():
        _LOGGER.error(
            "HA React Dashboard: www directory not found at %s. "
            "The integration bundle may not have been installed correctly.",
            www_path,
        )
        return False

    # 1. Register a static path so HA serves our bundle files
    # HA 2024.6+ uses async_register_static_paths; fall back for older installs
    try:
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_PATH, str(www_path), True)]
        )
    except (ImportError, AttributeError):
        hass.http.register_static_path(STATIC_PATH, str(www_path), cache_headers=True)

    # 2. Inject our JS into every HA frontend page — registers the custom element
    # Note: es5 parameter was removed in HA 2026.x
    add_extra_js_url(hass, f"{STATIC_PATH}/{JS_FILE}")

    # 3. Register the built-in panel that points to our custom element
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

    _LOGGER.info("HA React Dashboard panel registered at /%s", PANEL_URL)
    return True
