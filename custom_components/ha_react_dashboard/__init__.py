"""HA React Dashboard."""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

_LOGGER = logging.getLogger(__name__)

DOMAIN = "ha_react_dashboard"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up HA React Dashboard — minimal version for testing."""
    _LOGGER.info("HA React Dashboard: async_setup called")
    return True

