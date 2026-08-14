"""Config flow — une seule étape, rien à saisir.

L'intégration n'a aucun réglage : tout se pilote depuis le dashboard lui-même.
Le flow n'existe que pour permettre l'installation depuis l'interface HA plutôt
qu'une ligne dans `configuration.yaml`.
"""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DASHBOARD_TITLE, DOMAIN


class HaReactDashboardConfigFlow(ConfigFlow, domain=DOMAIN):
    """Installation en un clic."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is None:
            return self.async_show_form(step_id="user")

        return self.async_create_entry(title=DASHBOARD_TITLE, data={})
