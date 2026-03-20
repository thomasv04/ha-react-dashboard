// this is an auto generated file, do not change this manually

import { ServiceFunction, ServiceFunctionTypes } from '@hakit/core';
declare module '@hakit/core' {
  export interface CustomSupportedServices<T extends ServiceFunctionTypes = 'target'> {
    persistentNotification: {
      // undefined
      create: ServiceFunction<
        object,
        T,
        {
          //  @example Please check your configuration.yaml.
          message: string;
          //  @example Test notification
          title?: string;
          //  @example 1234
          notification_id?: string;
        }
      >;
      // undefined
      dismiss: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          notification_id: string;
        }
      >;
      // undefined
      dismissAll: ServiceFunction<object, T, object>;
    };
    homeassistant: {
      // undefined
      savePersistentStates: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      stop: ServiceFunction<object, T, object>;
      // undefined
      checkConfig: ServiceFunction<object, T, object>;
      // undefined
      updateEntity: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
        }
      >;
      // undefined
      reloadCoreConfig: ServiceFunction<object, T, object>;
      // undefined
      setLocation: ServiceFunction<
        object,
        T,
        {
          //  @example 32.87336 @constraints  number: mode: box, min: -90, max: 90, step: any
          latitude: number;
          //  @example 117.22743 @constraints  number: mode: box, min: -180, max: 180, step: any
          longitude: number;
          //  @example 120 @constraints  number: mode: box, step: any
          elevation?: number;
        }
      >;
      // undefined
      reloadCustomTemplates: ServiceFunction<object, T, object>;
      // undefined
      reloadConfigEntry: ServiceFunction<
        object,
        T,
        {
          //  @example 8955375327824e14ba89e4b29cc3ec9a @constraints  config_entry:
          entry_id?: unknown;
        }
      >;
      // undefined
      reloadAll: ServiceFunction<object, T, object>;
      // Sets aliases for a floor. Overwrite and removed any existing aliases, fully replacing them with the new ones.
      setFloorAliases: ServiceFunction<
        object,
        T,
        {
          // The ID of the floor to set the aliases for. @constraints  floor: multiple: false
          floor_id: unknown;
          // The aliases to set for the floor. @constraints  object: multiple: false
          aliases: object;
        }
      >;
      // Disables an integration configuration entry.
      disableConfigEntry: ServiceFunction<
        object,
        T,
        {
          // The integration configuration entry to disable. @constraints  config_entry:
          config_entry_id: unknown;
        }
      >;
      // Restart the Home Assistant action.
      restart: ServiceFunction<
        object,
        T,
        {
          // If the restart should be done in safe mode. This will disable all custom integrations and frontend modules. @constraints  boolean:
          safe_mode?: boolean;
          // Force the restart. WARNING! This will not gracefully shutdown Home Assistant, it will skip configuration checks and ignore running database migrations. Only use this if you know what you are doing. @constraints  boolean:
          force?: boolean;
        }
      >;
      // Sets aliases for an area. Overwrite and removed any existing aliases, fully replacing them with the new ones.
      setAreaAliases: ServiceFunction<
        object,
        T,
        {
          // The ID of the area to set the aliases for. @constraints  area: multiple: false
          area_id: unknown;
          // The aliases to set for the area. @constraints  object: multiple: false
          aliases: object;
        }
      >;
      // Ignore all currently discovered devices that are shown on the integrations dashboard. This will not ignore devices that are discovered after this.
      ignoreAllDiscovered: ServiceFunction<
        object,
        T,
        {
          // The integration domain to ignore all discovered devices for. If not provided, all domains will be considered to be ignored.
          domain?: string;
        }
      >;
      // Unhides an entity (or entities) on the fly.
      unhideEntity: ServiceFunction<
        object,
        T,
        {
          // The entity/entities to unhide.
          entity_id: string;
        }
      >;
      // Removes an alias from a floor.
      removeAliasFromFloor: ServiceFunction<
        object,
        T,
        {
          // The ID of the floor to remove the alias from. @constraints  floor: multiple: false
          floor_id: unknown;
          // The alias (or list of aliasses) to remove from the floor. @constraints  object: multiple: false
          alias: object;
        }
      >;
      // Disables polling for updates for an integration configuration entry.
      disablePolling: ServiceFunction<
        object,
        T,
        {
          // The integration configuration entry to disable polling for. @constraints  config_entry:
          config_entry_id: unknown;
        }
      >;
      // Removes a label from a device. If multiple labels or multiple devices are provided, all combinations will be removed.
      removeLabelFromDevice: ServiceFunction<
        object,
        T,
        {
          // The ID(s) of the label(s) to remove from the device(s). @constraints  label: multiple: true
          label_id: unknown;
          // The ID(s) of the device(s) to remove the label(s) from.
          device_id: string;
        }
      >;
      // Removes an entity from an area. As an entity can only be in one area, this call doesn't need to specify the area. Please note, the entity will still be in the area of the device that provides it after this call.
      removeEntityFromArea: ServiceFunction<
        object,
        T,
        {
          // The ID of the entity (or entities) to remove the area from.
          entity_id: string;
        }
      >;
      // Adds an entity to an area. Please note, if the enity is already in an area, it will be removed from the previous area. This will override the area the device, that provides this entity, is in.
      addEntityToArea: ServiceFunction<
        object,
        T,
        {
          // The ID of the area to add the entity to. @constraints  area: multiple: false
          area_id: unknown;
          // The ID of the entity (or entities) to add to the area.
          entity_id: string;
        }
      >;
      // Enables polling for updates for an integration configuration entry.
      enablePolling: ServiceFunction<
        object,
        T,
        {
          // The integration configuration entry to enable polling for. @constraints  config_entry:
          config_entry_id: unknown;
        }
      >;
      // Renames an entity (or entities) on the fly.
      renameEntity: ServiceFunction<
        object,
        T,
        {
          // The entity/entities to rename.
          entity_id: string;
          // The new name for the entity/entities.
          name: string;
        }
      >;
      // Deletes all orphaned entities that no longer have an integration that claim/provide them. Please note, if the integration was just removed, it might need a restart for Home Assistant to realize they are orphaned. **WARNING** Entities might have been marked orphaned because an integration is offline or not working since Home Assistant started. Calling this action will delete those entities as well.
      deleteAllOrphanedEntities: ServiceFunction<object, T, object>;
      // Adds an area to a floor. Please note, if the area is already on a floor, it will be removed from the previous floor.
      addAreaToFloor: ServiceFunction<
        object,
        T,
        {
          // The ID of the floor to add the area on. @constraints  floor: multiple: false
          floor_id: unknown;
          // The ID of the area(s) to add to the floor. @constraints  area: multiple: true
          area_id: unknown;
        }
      >;
      // Enables a device on the fly.
      enableDevice: ServiceFunction<
        object,
        T,
        {
          // The device(s) to enable.
          device_id: string;
        }
      >;
      // Adds an device to an area. Please note, if the device is already in an area, it will be removed from the previous area.
      addDeviceToArea: ServiceFunction<
        object,
        T,
        {
          // The ID of the area to add the device to. @constraints  area: multiple: false
          area_id: unknown;
          // The ID of the device(s) to add to the area.
          device_id: string;
        }
      >;
      // Hides an entity (or entities) on the fly.
      hideEntity: ServiceFunction<
        object,
        T,
        {
          // The entity/entities to hide.
          entity_id: string;
        }
      >;
      // Updates an entity's ID on the fly.
      updateEntityId: ServiceFunction<
        object,
        T,
        {
          // The entity/entities to update.
          entity_id: string;
          // The new ID for the entity
          new_entity_id: string;
        }
      >;
      // Adds an alias to a floor.
      addAliasToFloor: ServiceFunction<
        object,
        T,
        {
          // The ID of the floor to add the alias to. @constraints  floor: multiple: false
          floor_id: unknown;
          // The alias (or list of aliasses) to add to the floor. @constraints  object: multiple: false
          alias: object;
        }
      >;
      // Creates a new label on the fly.
      createLabel: ServiceFunction<
        object,
        T,
        {
          // The name of the label to create.
          name: string;
          // Description for the label.
          description: string;
          // Icon to use for the label. @constraints  icon: placeholder: mdi:tag
          icon?: string;
          // Color to use for the label. Can be a color name from the list, or a hex color code (like #FF0000).
          color?:
            | 'primary'
            | 'accent'
            | 'disabled'
            | 'red'
            | 'pink'
            | 'purple'
            | 'deep_purple'
            | 'indigo'
            | 'blue'
            | 'light_blue'
            | 'cyan'
            | 'teal'
            | 'green'
            | 'light_green'
            | 'lime'
            | 'yellow'
            | 'orange'
            | 'deep_orange'
            | 'brown'
            | 'grey'
            | 'blue_grey'
            | 'black'
            | 'white';
        }
      >;
      // Deletes a new area on the fly.
      deleteArea: ServiceFunction<
        object,
        T,
        {
          // The ID of the area to delete. @constraints  area: multiple: false
          area_id: unknown;
        }
      >;
      // Removes a label from an entity. If multiple labels or multiple entities are provided, all combinations will be removed.
      removeLabelFromEntity: ServiceFunction<
        object,
        T,
        {
          // The ID(s) of the label(s) to remove from the entity/entities. @constraints  label: multiple: true
          label_id: unknown;
          // The ID(s) of the entity/entities to remove the label(s) from.
          entity_id: string;
        }
      >;
      // Creates a new area on the fly.
      createArea: ServiceFunction<
        object,
        T,
        {
          // The name of the area to create.
          name: string;
          // Icon to use for the area. @constraints  icon: placeholder: mdi:texture-box
          icon?: string;
          // A list of aliases for the area. This is useful if you want to use the area in a different language or different nickname. @constraints  object: multiple: false
          aliases?: object;
        }
      >;
      // Enables an entity (or entities) on the fly.
      enableEntity: ServiceFunction<
        object,
        T,
        {
          // The entity/entities to enable.
          entity_id: string;
        }
      >;
      // Removes a device from an area. As a device can only be in one area, this call doesn't need to specify the area.
      removeDeviceFromArea: ServiceFunction<
        object,
        T,
        {
          // The ID of the device to remove the area from.
          device_id: string;
        }
      >;
      // Removes a label to an area. If multiple labels or multiple areas are provided, all combinations will be removed.
      removeLabelFromArea: ServiceFunction<
        object,
        T,
        {
          // The ID(s) of the label(s) to remove from the area(s). @constraints  label: multiple: true
          label_id: unknown;
          // The ID(s) of the area(s) to remove the label(s) from. @constraints  area: multiple: true
          area_id: unknown;
        }
      >;
      // Removes an area from a floor. As an area can only be on one floor, this call doesn't need to specify the floor.
      removeAreaFromFloor: ServiceFunction<
        object,
        T,
        {
          // The ID of the area to remove the floor from. @constraints  area: multiple: true
          area_id: unknown;
        }
      >;
      // Lists all orphaned database entities unclaimed by any integration.
      listOrphanedDatabaseEntities: ServiceFunction<object, T, object>;
      // Enables an integration configuration entry.
      enableConfigEntry: ServiceFunction<
        object,
        T,
        {
          // The integration configuration entry to enable. @constraints  config_entry:
          config_entry_id: unknown;
        }
      >;
      // Deletes a floor on the fly.
      deleteFloor: ServiceFunction<
        object,
        T,
        {
          // The ID of the floor to delete. @constraints  floor: multiple: false
          floor_id: unknown;
        }
      >;
      // Adds a label to an entity. If multiple labels or multiple entities are provided, all combinations will be added.
      addLabelToEntity: ServiceFunction<
        object,
        T,
        {
          // The ID(s) of the label(s) to add the entity/entities. @constraints  label: multiple: true
          label_id: unknown;
          // The ID(s) of the entity/entities to add the label(s) to.
          entity_id: string;
        }
      >;
      // Disables an entity (or entities) on the fly.
      disableEntity: ServiceFunction<
        object,
        T,
        {
          // The entity/entities to disable.
          entity_id: string;
        }
      >;
      // Adds a label to a device. If multiple labels or multiple devices are provided, all combinations will be added.
      addLabelToDevice: ServiceFunction<
        object,
        T,
        {
          // The ID(s) of the label(s) to add the device(s). @constraints  label: multiple: true
          label_id: unknown;
          // The ID(s) of the device(s) to add the label(s) to.
          device_id: string;
        }
      >;
      // Adds a label to an area. If multiple labels or multiple areas are provided, all combinations will be added.
      addLabelToArea: ServiceFunction<
        object,
        T,
        {
          // The ID(s) of the label(s) to add the area(s). @constraints  label: multiple: true
          label_id: unknown;
          // The ID(s) of the area(s) to add the label(s) to. @constraints  area: multiple: true
          area_id: unknown;
        }
      >;
      // Adds an alias to an area.
      addAliasToArea: ServiceFunction<
        object,
        T,
        {
          // The ID of the area to add the alias to. @constraints  area: multiple: false
          area_id: unknown;
          // The alias (or list of aliasses) to add to the area. @constraints  object: multiple: false
          alias: object;
        }
      >;
      // Removes an alias from an area.
      removeAliasFromArea: ServiceFunction<
        object,
        T,
        {
          // The ID of the area to remove the alias from. @constraints  area: multiple: false
          area_id: unknown;
          // The alias (or list of aliasses) to remove from the area. @constraints  object: multiple: false
          alias: object;
        }
      >;
      // Disables a device on the fly.
      disableDevice: ServiceFunction<
        object,
        T,
        {
          // The device(s) to disable.
          device_id: string;
        }
      >;
      // Deletes a label on the fly.
      deleteLabel: ServiceFunction<
        object,
        T,
        {
          // The ID of the label to delete. @constraints  label: multiple: false
          label_id: unknown;
        }
      >;
      // Creates a new floor on the fly.
      createFloor: ServiceFunction<
        object,
        T,
        {
          // The name of the floor to create.
          name: string;
          // Icon to use for the floor. @constraints  icon: placeholder: mdi:texture-box
          icon?: string;
          // The level the floor is on in your home. @constraints  number: step: 1, mode: box
          level?: number;
          // A list of aliases for the floor. This is useful if you want to use the floor in a different language or different nickname. @constraints  object: multiple: false
          aliases?: object;
        }
      >;
    };
    systemLog: {
      // undefined
      clear: ServiceFunction<object, T, object>;
      // undefined
      write: ServiceFunction<
        object,
        T,
        {
          //  @example Something went wrong
          message: string;
          //
          level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
          //  @example mycomponent.myplatform
          logger?: string;
        }
      >;
    };
    logger: {
      // undefined
      setDefaultLevel: ServiceFunction<
        object,
        T,
        {
          //
          level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'critical';
        }
      >;
      // undefined
      setLevel: ServiceFunction<object, T, object>;
    };
    frontend: {
      // undefined
      setTheme: ServiceFunction<
        object,
        T,
        {
          //  @example default
          name?: string;
          //  @example default
          name_dark?: string;
        }
      >;
      // undefined
      reloadThemes: ServiceFunction<object, T, object>;
    };
    recorder: {
      // undefined
      purge: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 365, unit_of_measurement: days, step: 1, mode: slider
          keep_days?: number;
          //  @constraints  boolean:
          repack?: boolean;
          //  @constraints  boolean:
          apply_filter?: boolean;
        }
      >;
      // undefined
      purgeEntities: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
          //  @example sun @constraints  object: multiple: false
          domains?: object;
          //  @example domain*.object_id* @constraints  object: multiple: false
          entity_globs?: object;
          //  @constraints  number: min: 0, max: 365, unit_of_measurement: days, step: 1, mode: slider
          keep_days?: number;
        }
      >;
      // undefined
      enable: ServiceFunction<object, T, object>;
      // undefined
      disable: ServiceFunction<object, T, object>;
      // undefined
      getStatistics: ServiceFunction<
        object,
        T,
        {
          //  @example 2025-01-01 00:00:00 @constraints  datetime:
          start_time: string;
          //  @example 2025-01-02 00:00:00 @constraints  datetime:
          end_time?: string;
          //  @example sensor.energy_consumption,sensor.temperature @constraints  statistic: multiple: true
          statistic_ids: unknown;
          //  @example hour
          period: '5minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
          //  @example mean,sum
          types: 'change' | 'last_reset' | 'max' | 'mean' | 'min' | 'state' | 'sum';
          //  @example [object Object] @constraints  object: multiple: false
          units?: object;
        }
      >;
      // Import long-term statistics.
      importStatistics: ServiceFunction<
        object,
        T,
        {
          // The statistics ID (entity ID) to import for.
          statistic_id: string;
          // The name of the statistics.
          name?: string;
          // The source of the statistics data.
          source: string;
          // The unit of measurement of the statistics.
          unit_of_measurement?: string;
          // If the statistics has a mean value. @constraints  boolean:
          has_mean: boolean;
          // If the statistics has a sum value. @constraints  boolean:
          has_sum: boolean;
          // A list of mappings/dictionaries with statistics to import. The dictionaries must contain a 'start' key with a datetime string other valid options are 'mean', 'sum', 'min', 'max', 'last_reset', and 'state'. All of those are optional and either an integer or a float, except for 'last_reset' which is a datetime string. @constraints  object: multiple: false
          stats: object;
        }
      >;
    };
    hassio: {
      // undefined
      addonStart: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  addon:
          addon: string;
        }
      >;
      // undefined
      addonStop: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  addon:
          addon: string;
        }
      >;
      // undefined
      addonRestart: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  addon:
          addon: string;
        }
      >;
      // undefined
      addonStdin: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  addon:
          addon: string;
        }
      >;
      // undefined
      appStart: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  app:
          app: unknown;
        }
      >;
      // undefined
      appStop: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  app:
          app: unknown;
        }
      >;
      // undefined
      appRestart: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  app:
          app: unknown;
        }
      >;
      // undefined
      appStdin: ServiceFunction<
        object,
        T,
        {
          //  @example core_ssh @constraints  app:
          app: unknown;
          //  @constraints  object: multiple: false
          input: object;
        }
      >;
      // undefined
      hostShutdown: ServiceFunction<object, T, object>;
      // undefined
      hostReboot: ServiceFunction<object, T, object>;
      // undefined
      backupFull: ServiceFunction<
        object,
        T,
        {
          //  @example Backup 1
          name?: string;
          //  @example password
          password?: string;
          //  @constraints  boolean:
          compressed?: boolean;
          //  @example my_backup_mount @constraints  backup_location:
          location?: string;
          //  @constraints  boolean:
          homeassistant_exclude_database?: boolean;
        }
      >;
      // undefined
      backupPartial: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          homeassistant?: boolean;
          //  @constraints  boolean:
          homeassistant_exclude_database?: boolean;
          //  @example core_ssh,core_samba,core_mosquitto @constraints  object: multiple: false
          apps?: object;
          //  @example core_ssh,core_samba,core_mosquitto @constraints  object: multiple: false
          addons?: object;
          //  @example homeassistant,share @constraints  object: multiple: false
          folders?: object;
          //  @example Partial backup 1
          name?: string;
          //  @example password
          password?: string;
          //  @constraints  boolean:
          compressed?: boolean;
          //  @example my_backup_mount @constraints  backup_location:
          location?: string;
        }
      >;
      // undefined
      restoreFull: ServiceFunction<
        object,
        T,
        {
          //
          slug: string;
          //  @example password
          password?: string;
        }
      >;
      // undefined
      restorePartial: ServiceFunction<
        object,
        T,
        {
          //
          slug: string;
          //  @constraints  boolean:
          homeassistant?: boolean;
          //  @example homeassistant,share @constraints  object: multiple: false
          folders?: object;
          //  @example core_ssh,core_samba,core_mosquitto @constraints  object: multiple: false
          apps?: object;
          //  @example core_ssh,core_samba,core_mosquitto @constraints  object: multiple: false
          addons?: object;
          //  @example password
          password?: string;
        }
      >;
    };
    ffmpeg: {
      // undefined
      start: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
        }
      >;
      // undefined
      stop: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
        }
      >;
      // undefined
      restart: ServiceFunction<
        object,
        T,
        {
          //
          entity_id?: string;
        }
      >;
    };
    update: {
      // undefined
      install: ServiceFunction<
        object,
        T,
        {
          //  @example 1.0.0
          version?: string;
          //  @constraints  boolean:
          backup?: boolean;
        }
      >;
      // undefined
      skip: ServiceFunction<object, T, object>;
      // undefined
      clearSkipped: ServiceFunction<object, T, object>;
    };
    camera: {
      // undefined
      enableMotionDetection: ServiceFunction<object, T, object>;
      // undefined
      disableMotionDetection: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      snapshot: ServiceFunction<
        object,
        T,
        {
          //  @example /tmp/snapshot_{{ entity_id.name }}.jpg
          filename: string;
        }
      >;
      // undefined
      playStream: ServiceFunction<
        object,
        T,
        {
          //
          media_player: string;
          //
          format?: 'hls';
        }
      >;
      // undefined
      record: ServiceFunction<
        object,
        T,
        {
          //  @example /tmp/snapshot_{{ entity_id.name }}.mp4
          filename: string;
          //  @constraints  number: min: 1, max: 3600, unit_of_measurement: seconds, step: 1, mode: slider
          duration?: number;
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          lookback?: number;
        }
      >;
    };
    conversation: {
      // undefined
      process: ServiceFunction<
        object,
        T,
        {
          //  @example Turn all lights on
          text: string;
          //  @example NL
          language?: string;
          //  @example homeassistant @constraints  conversation_agent:
          agent_id?: string;
          //  @example my_conversation_1
          conversation_id?: string;
        }
      >;
      // undefined
      reload: ServiceFunction<
        object,
        T,
        {
          //  @example NL
          language?: string;
          //  @example homeassistant @constraints  conversation_agent:
          agent_id?: string;
        }
      >;
    };
    group: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      set: ServiceFunction<
        object,
        T,
        {
          //  @example test_group
          object_id: string;
          //  @example My test group
          name?: string;
          //  @example mdi:camera @constraints  icon:
          icon?: string;
          //  @example domain.entity_id1, domain.entity_id2
          entities?: string;
          //  @example domain.entity_id1, domain.entity_id2
          add_entities?: string;
          //  @example domain.entity_id1, domain.entity_id2
          remove_entities?: string;
          //  @constraints  boolean:
          all?: boolean;
        }
      >;
      // undefined
      remove: ServiceFunction<
        object,
        T,
        {
          //  @example test_group @constraints  object: multiple: false
          object_id: object;
        }
      >;
    };
    light: {
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          //  @example [255, 100, 100] @constraints  color_rgb:
          rgb_color?: [number, number, number];
          //  @constraints  color_temp: unit: kelvin, min: 2000, max: 6500
          color_temp_kelvin?: number;
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          brightness_pct?: number;
          //  @constraints  number: min: -100, max: 100, unit_of_measurement: %, step: 1, mode: slider
          brightness_step_pct?: number;
          //
          effect?: string;
          //  @example [255, 100, 100, 50] @constraints  object: multiple: false
          rgbw_color?: [number, number, number, number];
          //  @example [255, 100, 100, 50, 70] @constraints  object: multiple: false
          rgbww_color?: [number, number, number, number, number];
          //
          color_name?:
            | 'homeassistant'
            | 'aliceblue'
            | 'antiquewhite'
            | 'aqua'
            | 'aquamarine'
            | 'azure'
            | 'beige'
            | 'bisque'
            | 'blanchedalmond'
            | 'blue'
            | 'blueviolet'
            | 'brown'
            | 'burlywood'
            | 'cadetblue'
            | 'chartreuse'
            | 'chocolate'
            | 'coral'
            | 'cornflowerblue'
            | 'cornsilk'
            | 'crimson'
            | 'cyan'
            | 'darkblue'
            | 'darkcyan'
            | 'darkgoldenrod'
            | 'darkgray'
            | 'darkgreen'
            | 'darkgrey'
            | 'darkkhaki'
            | 'darkmagenta'
            | 'darkolivegreen'
            | 'darkorange'
            | 'darkorchid'
            | 'darkred'
            | 'darksalmon'
            | 'darkseagreen'
            | 'darkslateblue'
            | 'darkslategray'
            | 'darkslategrey'
            | 'darkturquoise'
            | 'darkviolet'
            | 'deeppink'
            | 'deepskyblue'
            | 'dimgray'
            | 'dimgrey'
            | 'dodgerblue'
            | 'firebrick'
            | 'floralwhite'
            | 'forestgreen'
            | 'fuchsia'
            | 'gainsboro'
            | 'ghostwhite'
            | 'gold'
            | 'goldenrod'
            | 'gray'
            | 'green'
            | 'greenyellow'
            | 'grey'
            | 'honeydew'
            | 'hotpink'
            | 'indianred'
            | 'indigo'
            | 'ivory'
            | 'khaki'
            | 'lavender'
            | 'lavenderblush'
            | 'lawngreen'
            | 'lemonchiffon'
            | 'lightblue'
            | 'lightcoral'
            | 'lightcyan'
            | 'lightgoldenrodyellow'
            | 'lightgray'
            | 'lightgreen'
            | 'lightgrey'
            | 'lightpink'
            | 'lightsalmon'
            | 'lightseagreen'
            | 'lightskyblue'
            | 'lightslategray'
            | 'lightslategrey'
            | 'lightsteelblue'
            | 'lightyellow'
            | 'lime'
            | 'limegreen'
            | 'linen'
            | 'magenta'
            | 'maroon'
            | 'mediumaquamarine'
            | 'mediumblue'
            | 'mediumorchid'
            | 'mediumpurple'
            | 'mediumseagreen'
            | 'mediumslateblue'
            | 'mediumspringgreen'
            | 'mediumturquoise'
            | 'mediumvioletred'
            | 'midnightblue'
            | 'mintcream'
            | 'mistyrose'
            | 'moccasin'
            | 'navajowhite'
            | 'navy'
            | 'navyblue'
            | 'oldlace'
            | 'olive'
            | 'olivedrab'
            | 'orange'
            | 'orangered'
            | 'orchid'
            | 'palegoldenrod'
            | 'palegreen'
            | 'paleturquoise'
            | 'palevioletred'
            | 'papayawhip'
            | 'peachpuff'
            | 'peru'
            | 'pink'
            | 'plum'
            | 'powderblue'
            | 'purple'
            | 'red'
            | 'rosybrown'
            | 'royalblue'
            | 'saddlebrown'
            | 'salmon'
            | 'sandybrown'
            | 'seagreen'
            | 'seashell'
            | 'sienna'
            | 'silver'
            | 'skyblue'
            | 'slateblue'
            | 'slategray'
            | 'slategrey'
            | 'snow'
            | 'springgreen'
            | 'steelblue'
            | 'tan'
            | 'teal'
            | 'thistle'
            | 'tomato'
            | 'turquoise'
            | 'violet'
            | 'wheat'
            | 'white'
            | 'whitesmoke'
            | 'yellow'
            | 'yellowgreen';
          //  @example [300, 70] @constraints  object: multiple: false
          hs_color?: [number, number];
          //  @example [0.52, 0.43] @constraints  object: multiple: false
          xy_color?: [number, number];
          //  @constraints  number: min: 0, max: 255, step: 1, mode: slider
          brightness?: number;
          //  @constraints  number: min: -225, max: 255, step: 1, mode: slider
          brightness_step?: number;
          //
          white?: boolean;
          //  @example relax
          profile?: string;
          //
          flash?: 'long' | 'short';
        }
      >;
      // undefined
      turnOff: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          //
          flash?: 'long' | 'short';
        }
      >;
      // undefined
      toggle: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          //  @example [255, 100, 100] @constraints  color_rgb:
          rgb_color?: [number, number, number];
          //  @constraints  color_temp: unit: kelvin, min: 2000, max: 6500
          color_temp_kelvin?: number;
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          brightness_pct?: number;
          //
          effect?: string;
          //  @example [255, 100, 100, 50] @constraints  object: multiple: false
          rgbw_color?: [number, number, number, number];
          //  @example [255, 100, 100, 50, 70] @constraints  object: multiple: false
          rgbww_color?: [number, number, number, number, number];
          //
          color_name?:
            | 'homeassistant'
            | 'aliceblue'
            | 'antiquewhite'
            | 'aqua'
            | 'aquamarine'
            | 'azure'
            | 'beige'
            | 'bisque'
            | 'blanchedalmond'
            | 'blue'
            | 'blueviolet'
            | 'brown'
            | 'burlywood'
            | 'cadetblue'
            | 'chartreuse'
            | 'chocolate'
            | 'coral'
            | 'cornflowerblue'
            | 'cornsilk'
            | 'crimson'
            | 'cyan'
            | 'darkblue'
            | 'darkcyan'
            | 'darkgoldenrod'
            | 'darkgray'
            | 'darkgreen'
            | 'darkgrey'
            | 'darkkhaki'
            | 'darkmagenta'
            | 'darkolivegreen'
            | 'darkorange'
            | 'darkorchid'
            | 'darkred'
            | 'darksalmon'
            | 'darkseagreen'
            | 'darkslateblue'
            | 'darkslategray'
            | 'darkslategrey'
            | 'darkturquoise'
            | 'darkviolet'
            | 'deeppink'
            | 'deepskyblue'
            | 'dimgray'
            | 'dimgrey'
            | 'dodgerblue'
            | 'firebrick'
            | 'floralwhite'
            | 'forestgreen'
            | 'fuchsia'
            | 'gainsboro'
            | 'ghostwhite'
            | 'gold'
            | 'goldenrod'
            | 'gray'
            | 'green'
            | 'greenyellow'
            | 'grey'
            | 'honeydew'
            | 'hotpink'
            | 'indianred'
            | 'indigo'
            | 'ivory'
            | 'khaki'
            | 'lavender'
            | 'lavenderblush'
            | 'lawngreen'
            | 'lemonchiffon'
            | 'lightblue'
            | 'lightcoral'
            | 'lightcyan'
            | 'lightgoldenrodyellow'
            | 'lightgray'
            | 'lightgreen'
            | 'lightgrey'
            | 'lightpink'
            | 'lightsalmon'
            | 'lightseagreen'
            | 'lightskyblue'
            | 'lightslategray'
            | 'lightslategrey'
            | 'lightsteelblue'
            | 'lightyellow'
            | 'lime'
            | 'limegreen'
            | 'linen'
            | 'magenta'
            | 'maroon'
            | 'mediumaquamarine'
            | 'mediumblue'
            | 'mediumorchid'
            | 'mediumpurple'
            | 'mediumseagreen'
            | 'mediumslateblue'
            | 'mediumspringgreen'
            | 'mediumturquoise'
            | 'mediumvioletred'
            | 'midnightblue'
            | 'mintcream'
            | 'mistyrose'
            | 'moccasin'
            | 'navajowhite'
            | 'navy'
            | 'navyblue'
            | 'oldlace'
            | 'olive'
            | 'olivedrab'
            | 'orange'
            | 'orangered'
            | 'orchid'
            | 'palegoldenrod'
            | 'palegreen'
            | 'paleturquoise'
            | 'palevioletred'
            | 'papayawhip'
            | 'peachpuff'
            | 'peru'
            | 'pink'
            | 'plum'
            | 'powderblue'
            | 'purple'
            | 'red'
            | 'rosybrown'
            | 'royalblue'
            | 'saddlebrown'
            | 'salmon'
            | 'sandybrown'
            | 'seagreen'
            | 'seashell'
            | 'sienna'
            | 'silver'
            | 'skyblue'
            | 'slateblue'
            | 'slategray'
            | 'slategrey'
            | 'snow'
            | 'springgreen'
            | 'steelblue'
            | 'tan'
            | 'teal'
            | 'thistle'
            | 'tomato'
            | 'turquoise'
            | 'violet'
            | 'wheat'
            | 'white'
            | 'whitesmoke'
            | 'yellow'
            | 'yellowgreen';
          //  @example [300, 70] @constraints  object: multiple: false
          hs_color?: [number, number];
          //  @example [0.52, 0.43] @constraints  object: multiple: false
          xy_color?: [number, number];
          //  @constraints  number: min: 0, max: 255, step: 1, mode: slider
          brightness?: number;
          //
          white?: boolean;
          //  @example relax
          profile?: string;
          //
          flash?: 'long' | 'short';
        }
      >;
    };
    cover: {
      // undefined
      openCover: ServiceFunction<object, T, object>;
      // undefined
      closeCover: ServiceFunction<object, T, object>;
      // undefined
      setCoverPosition: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          position: number;
        }
      >;
      // undefined
      stopCover: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      openCoverTilt: ServiceFunction<object, T, object>;
      // undefined
      closeCoverTilt: ServiceFunction<object, T, object>;
      // undefined
      stopCoverTilt: ServiceFunction<object, T, object>;
      // undefined
      setCoverTiltPosition: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          tilt_position: number;
        }
      >;
      // undefined
      toggleCoverTilt: ServiceFunction<object, T, object>;
    };
    tts: {
      // undefined
      speak: ServiceFunction<
        object,
        T,
        {
          //
          media_player_entity_id: string;
          //  @example My name is hanna
          message: string;
          //  @constraints  boolean:
          cache?: boolean;
          //  @example ru
          language?: string;
          //  @example platform specific @constraints  object: multiple: false
          options?: object;
        }
      >;
      // undefined
      clearCache: ServiceFunction<object, T, object>;
      // Say something using text-to-speech on a media player with google_translate.
      googleSay: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
          //  @example My name is hanna
          message: string;
          //
          cache?: boolean;
          //  @example ru
          language?: string;
          //  @example platform specific
          options?: object;
        }
      >;
      // Say something using text-to-speech on a media player with cloud.
      cloudSay: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
          //  @example My name is hanna
          message: string;
          //
          cache?: boolean;
          //  @example ru
          language?: string;
          //  @example platform specific
          options?: object;
        }
      >;
    };
    switch: {
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    backup: {
      // undefined
      createAutomatic: ServiceFunction<object, T, object>;
    };
    calendar: {
      // undefined
      createEvent: ServiceFunction<
        object,
        T,
        {
          //  @example Department Party
          summary: string;
          //  @example Meeting to provide technical review for 'Phoenix' design.
          description?: string;
          //  @example 2022-03-22 20:00:00 @constraints  datetime:
          start_date_time?: string;
          //  @example 2022-03-22 22:00:00 @constraints  datetime:
          end_date_time?: string;
          //  @example 2022-03-22 @constraints  date:
          start_date?: string;
          //  @example 2022-03-23 @constraints  date:
          end_date?: string;
          //  @example {'days': 2} or {'weeks': 2}
          in?: object;
          //  @example Conference Room - F123, Bldg. 002
          location?: string;
        }
      >;
      // undefined
      getEvents: ServiceFunction<
        object,
        T,
        {
          //  @example 2022-03-22 20:00:00 @constraints  datetime:
          start_date_time?: string;
          //  @example 2022-03-22 22:00:00 @constraints  datetime:
          end_date_time?: string;
          //  @constraints  duration: enable_second: true
          duration?: {
            hours?: number;
            days?: number;
            minutes?: number;
            seconds?: number;
          };
        }
      >;
    };
    wasteCollectionSchedule: {
      // Fetch data from all sources.
      fetchData: ServiceFunction<object, T, object>;
    };
    matter: {
      // undefined
      waterHeaterBoost: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 60, max: 14400, step: 60, mode: box
          duration: number;
          //  @constraints  boolean:
          emergency_boost?: boolean;
          //  @constraints  number: min: 30, max: 65, step: 1, mode: slider
          temporary_setpoint?: number;
        }
      >;
    };
    template: {
      // undefined
      reload: ServiceFunction<object, T, object>;
    };
    number: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example 42
          value: string;
        }
      >;
      // Set a number entity to its maximum value.
      max: ServiceFunction<object, T, object>;
      // Set a number entity to its minimum value.
      min: ServiceFunction<object, T, object>;
      // Decrease a number entity value by a certain amount.
      decrement: ServiceFunction<
        object,
        T,
        {
          // The amount to decrease the number with. If not provided, the step of the number entity will be used. @constraints  number: step: 1, mode: box
          amount?: number;
        }
      >;
      // Increase a number entity value by a certain amount.
      increment: ServiceFunction<
        object,
        T,
        {
          // The amount to increase the number with. If not provided, the step of the number entity will be used. @constraints  number: step: 1, mode: box
          amount?: number;
        }
      >;
    };
    button: {
      // undefined
      press: ServiceFunction<object, T, object>;
    };
    climate: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      setHvacMode: ServiceFunction<
        object,
        T,
        {
          //  @constraints  state: hide_states: unavailable,unknown, multiple: false
          hvac_mode?: unknown;
        }
      >;
      // undefined
      setPresetMode: ServiceFunction<
        object,
        T,
        {
          //  @example away
          preset_mode: string;
        }
      >;
      // undefined
      setTemperature: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 250, step: 0.1, mode: box
          temperature?: number;
          //  @constraints  number: min: 0, max: 250, step: 0.1, mode: box
          target_temp_high?: number;
          //  @constraints  number: min: 0, max: 250, step: 0.1, mode: box
          target_temp_low?: number;
          //
          hvac_mode?: 'off' | 'auto' | 'cool' | 'dry' | 'fan_only' | 'heat_cool' | 'heat';
        }
      >;
      // undefined
      setHumidity: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 30, max: 99, unit_of_measurement: %, step: 1, mode: slider
          humidity: number;
        }
      >;
      // undefined
      setFanMode: ServiceFunction<
        object,
        T,
        {
          //  @example low
          fan_mode: string;
        }
      >;
      // undefined
      setSwingMode: ServiceFunction<
        object,
        T,
        {
          //  @example on
          swing_mode: string;
        }
      >;
      // undefined
      setSwingHorizontalMode: ServiceFunction<
        object,
        T,
        {
          //  @example on
          swing_horizontal_mode: string;
        }
      >;
    };
    fan: {
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          percentage?: number;
          //  @example auto
          preset_mode?: string;
        }
      >;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      increaseSpeed: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          percentage_step?: number;
        }
      >;
      // undefined
      decreaseSpeed: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          percentage_step?: number;
        }
      >;
      // undefined
      oscillate: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          oscillating: boolean;
        }
      >;
      // undefined
      setDirection: ServiceFunction<
        object,
        T,
        {
          //
          direction: 'forward' | 'reverse';
        }
      >;
      // undefined
      setPercentage: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          percentage: number;
        }
      >;
      // undefined
      setPresetMode: ServiceFunction<
        object,
        T,
        {
          //  @example auto
          preset_mode: string;
        }
      >;
    };
    lock: {
      // undefined
      unlock: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      lock: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      open: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
    };
    select: {
      // undefined
      selectFirst: ServiceFunction<object, T, object>;
      // undefined
      selectLast: ServiceFunction<object, T, object>;
      // undefined
      selectNext: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
      // undefined
      selectOption: ServiceFunction<
        object,
        T,
        {
          //  @example 'Item A' @constraints  state: hide_states: unavailable,unknown, multiple: false
          option: unknown;
        }
      >;
      // undefined
      selectPrevious: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
      // Select an random option for a select entity.
      random: ServiceFunction<
        object,
        T,
        {
          // Limits the options to select from. If not provided, all options will be considered. @constraints  object: multiple: false
          options?: object;
        }
      >;
    };
    vacuum: {
      // undefined
      start: ServiceFunction<object, T, object>;
      // undefined
      pause: ServiceFunction<object, T, object>;
      // undefined
      returnToBase: ServiceFunction<object, T, object>;
      // undefined
      cleanSpot: ServiceFunction<object, T, object>;
      // undefined
      cleanArea: ServiceFunction<
        object,
        T,
        {
          //  @constraints  area: multiple: true
          cleaning_area_id: unknown;
        }
      >;
      // undefined
      locate: ServiceFunction<object, T, object>;
      // undefined
      stop: ServiceFunction<object, T, object>;
      // undefined
      setFanSpeed: ServiceFunction<
        object,
        T,
        {
          //  @example low
          fan_speed: string;
        }
      >;
      // undefined
      sendCommand: ServiceFunction<
        object,
        T,
        {
          //  @example set_dnd_timer
          command: string;
          //  @example { 'key': 'value' } @constraints  object: multiple: false
          params?: object;
        }
      >;
    };
    valve: {
      // undefined
      openValve: ServiceFunction<object, T, object>;
      // undefined
      closeValve: ServiceFunction<object, T, object>;
      // undefined
      setValvePosition: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          position: number;
        }
      >;
      // undefined
      stopValve: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    waterHeater: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      setAwayMode: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          away_mode: boolean;
        }
      >;
      // undefined
      setTemperature: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 250, step: 0.5, mode: box, unit_of_measurement: °
          temperature: number;
          //  @example eco
          operation_mode?: string;
        }
      >;
      // undefined
      setOperationMode: ServiceFunction<
        object,
        T,
        {
          //  @example eco
          operation_mode: string;
        }
      >;
    };
    googleAssistant: {
      // undefined
      requestSync: ServiceFunction<
        object,
        T,
        {
          //
          agent_user_id?: string;
        }
      >;
    };
    cloud: {
      // undefined
      remoteConnect: ServiceFunction<object, T, object>;
      // undefined
      remoteDisconnect: ServiceFunction<object, T, object>;
    };
    scene: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      apply: ServiceFunction<
        object,
        T,
        {
          //  @example light.kitchen: 'on' light.ceiling:   state: 'on'   brightness: 80  @constraints  object: multiple: false
          entities: object;
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
        }
      >;
      // undefined
      create: ServiceFunction<
        object,
        T,
        {
          //  @example all_lights
          scene_id: string;
          //  @example light.tv_back_light: 'on' light.ceiling:   state: 'on'   brightness: 200  @constraints  object: multiple: false
          entities?: object;
          //  @example - light.ceiling - light.kitchen
          snapshot_entities?: string;
        }
      >;
      // undefined
      delete: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
        }
      >;
    };
    assistSatellite: {
      // undefined
      announce: ServiceFunction<
        object,
        T,
        {
          //  @example Time to wake up!
          message?: string;
          //  @constraints  media: accept: audio/*, multiple: false
          media_id?: unknown;
          //  @constraints  boolean:
          preannounce?: boolean;
          //  @constraints  media: accept: audio/*, multiple: false
          preannounce_media_id?: unknown;
        }
      >;
      // undefined
      startConversation: ServiceFunction<
        object,
        T,
        {
          //  @example You left the lights on in the living room. Turn them off?
          start_message?: string;
          //  @constraints  media: accept: audio/*, multiple: false
          start_media_id?: unknown;
          //
          extra_system_prompt?: string;
          //  @constraints  boolean:
          preannounce?: boolean;
          //  @constraints  media: accept: audio/*, multiple: false
          preannounce_media_id?: unknown;
        }
      >;
      // undefined
      askQuestion: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
          //  @example What kind of music would you like to play?
          question?: string;
          //  @constraints  media: accept: audio/*, multiple: false
          question_media_id?: unknown;
          //  @constraints  boolean:
          preannounce?: boolean;
          //  @constraints  media: accept: audio/*, multiple: false
          preannounce_media_id?: unknown;
          //  @constraints  object: label_field: sentences, description_field: id, multiple: true, translation_key: answers, fields: [object Object]
          answers?: object;
        }
      >;
    };
    timer: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      start: ServiceFunction<
        object,
        T,
        {
          //  @example 00:01:00 or 60 @constraints  duration: enable_second: true
          duration?: {
            hours?: number;
            days?: number;
            minutes?: number;
            seconds?: number;
          };
        }
      >;
      // undefined
      pause: ServiceFunction<object, T, object>;
      // undefined
      cancel: ServiceFunction<object, T, object>;
      // undefined
      finish: ServiceFunction<object, T, object>;
      // undefined
      change: ServiceFunction<
        object,
        T,
        {
          //  @example 00:01:00, 60 or -60 @constraints  duration: allow_negative: true, enable_second: true
          duration: {
            hours?: number;
            days?: number;
            minutes?: number;
            seconds?: number;
          };
        }
      >;
      // Set duration for an existing timer.
      setDuration: ServiceFunction<
        object,
        T,
        {
          // New duration for the timer, as a timedelta string. @example 00:01:00, 60
          duration: string;
        }
      >;
    };
    zone: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // Delete a zone. This works only with zones created and managed via the UI. Zones created and managed in YAML cannot be managed by Spook.
      delete: ServiceFunction<
        object,
        T,
        {
          // The ID of the entity (or entities) to remove.
          entity_id: string;
        }
      >;
      // Update properties of a zone on the fly.
      update: ServiceFunction<
        object,
        T,
        {
          // The ID of the entity (or entities) to update.
          entity_id: string;
          // Name of the zone
          name?: string;
          // Icon to use for the zone @constraints  icon: placeholder: mdi:map-marker
          icon?: string;
          // Latitude of the zone @constraints  number: min: -90, max: 90, step: any, mode: box, unit_of_measurement: °
          latitude?: number;
          // Longitude of the zone @constraints  number: min: -180, max: 180, step: any, mode: box, unit_of_measurement: °
          longitude?: number;
          // Radius of the zone @constraints  number: min: 0, max: 999999999999, step: any, unit_of_measurement: m, mode: box
          radius?: number;
        }
      >;
      // Create a new zone in Home Assistant on the fly.
      create: ServiceFunction<
        object,
        T,
        {
          // Name of the zone
          name: string;
          // Icon to use for the zone @constraints  icon: placeholder: mdi:map-marker
          icon?: string;
          // Latitude of the zone @constraints  number: min: -90, max: 90, step: any, mode: box, unit_of_measurement: °
          latitude: number;
          // Longitude of the zone @constraints  number: min: -180, max: 180, step: any, mode: box, unit_of_measurement: °
          longitude: number;
          // Radius of the zone @constraints  number: min: 0, max: 999999999999, unit_of_measurement: m, mode: box, step: 1
          radius?: number;
        }
      >;
    };
    logbook: {
      // undefined
      log: ServiceFunction<
        object,
        T,
        {
          //  @example Kitchen
          name: string;
          //  @example is being used
          message: string;
          //
          entity_id?: string;
          //  @example light
          domain?: string;
        }
      >;
    };
    script: {
      //
      allumeAlarmeEnModeAbsence: ServiceFunction<object, T, object>;
      //
      desactiverToutesLesFonctionsDeLaCameraCuisine: ServiceFunction<object, T, object>;
      //
      ouvreLesVolets: ServiceFunction<object, T, object>;
      //
      fermeLesVolets: ServiceFunction<object, T, object>;
      //
      envoiePhotoDiscord: ServiceFunction<object, T, object>;
      //
      prendreSnapshotsBal: ServiceFunction<object, T, object>;
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    inputNumber: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 9223372036854776000, step: 0.001, mode: box
          value: number;
        }
      >;
      // Set an input number entity to its maximum value.
      max: ServiceFunction<object, T, object>;
      // Set an input number entity to its minimum value.
      min: ServiceFunction<object, T, object>;
      // Decrease an input number entity value by a certain amount.
      decrement: ServiceFunction<
        object,
        T,
        {
          // The amount to decrease the input number with. If not provided, the step of the number entity will be used. @constraints  number: step: 1, mode: box
          amount?: number;
        }
      >;
      // Increase an input number entity value by a certain amount.
      increment: ServiceFunction<
        object,
        T,
        {
          // The amount to increase the input number with. If not provided, the step of the number entity will be used. @constraints  number: step: 1, mode: box
          amount?: number;
        }
      >;
    };
    inputSelect: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      selectFirst: ServiceFunction<object, T, object>;
      // undefined
      selectLast: ServiceFunction<object, T, object>;
      // undefined
      selectNext: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
      // undefined
      selectOption: ServiceFunction<
        object,
        T,
        {
          //  @example 'Item A' @constraints  state: hide_states: unavailable,unknown, multiple: false
          option: unknown;
        }
      >;
      // undefined
      selectPrevious: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          cycle?: boolean;
        }
      >;
      // undefined
      setOptions: ServiceFunction<
        object,
        T,
        {
          //  @example ['Item A', 'Item B', 'Item C']
          options: string;
        }
      >;
      // Shuffles the list of selectable options for an `input_select` entity. This is not persistent and will be undone once reloaded or Home Assistant restarts.
      shuffle: ServiceFunction<object, T, object>;
      // Sorts the list of selectable options for an `input_select` entity. This is not persistent and will be undone once reloaded or Home Assistant restarts.
      sort: ServiceFunction<object, T, object>;
      // Select an random option for an input_select entity.
      random: ServiceFunction<
        object,
        T,
        {
          // Limits the options to select from. If not provided, all options will be considered. @constraints  object: multiple: false
          options?: object;
        }
      >;
    };
    inputBoolean: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    inputButton: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      press: ServiceFunction<object, T, object>;
    };
    person: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // Add a device tracker to a person.
      addDeviceTracker: ServiceFunction<
        object,
        T,
        {
          // The person entity ID to add the device tracker to.
          entity_id: string;
          // The device tracker entity ID to add to the person.
          device_tracker: string;
        }
      >;
      // Remove a device tracker from a person.
      removeDeviceTracker: ServiceFunction<
        object,
        T,
        {
          // The person entity ID to remove the device tracker from.
          entity_id: string;
          // The device tracker entity ID to remove from the person.
          device_tracker: string;
        }
      >;
    };
    notify: {
      // undefined
      sendMessage: ServiceFunction<
        object,
        T,
        {
          //
          message: string;
          //
          title?: string;
        }
      >;
      // undefined
      persistentNotification: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific @constraints  object: multiple: false
          data?: object;
        }
      >;
      // Sends a notification message using the mobile_app_iphone_de_adeline integration.
      mobileAppIphoneDeAdeline: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific
          target?: object;
          //  @example platform specific
          data?: object;
        }
      >;
      // Sends a notification message using the mobile_app_ipad integration.
      mobileAppIpad: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific
          target?: object;
          //  @example platform specific
          data?: object;
        }
      >;
      // Sends a notification message using the mobile_app_pixel_9_pro_xl integration.
      mobileAppPixel9ProXl: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific
          target?: object;
          //  @example platform specific
          data?: object;
        }
      >;
      // Sends a notification message using the notify service.
      notify: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific
          target?: object;
          //  @example platform specific
          data?: object;
        }
      >;
      // Sends a notification message using the home_notification service.
      homeNotification: ServiceFunction<
        object,
        T,
        {
          //  @example The garage door has been open for 10 minutes.
          message: string;
          //  @example Your Garage Door Friend
          title?: string;
          //  @example platform specific
          target?: object;
          //  @example platform specific
          data?: object;
        }
      >;
    };
    counter: {
      // undefined
      increment: ServiceFunction<object, T, object>;
      // undefined
      decrement: ServiceFunction<object, T, object>;
      // undefined
      reset: ServiceFunction<object, T, object>;
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 9223372036854776000, mode: box, step: 1
          value: number;
        }
      >;
    };
    smtp: {
      // undefined
      reload: ServiceFunction<object, T, object>;
    };
    roborock: {
      // undefined
      getMaps: ServiceFunction<object, T, object>;
      // undefined
      getVacuumCurrentPosition: ServiceFunction<object, T, object>;
      // undefined
      setVacuumGotoPosition: ServiceFunction<
        object,
        T,
        {
          //  @example 27500
          x: string;
          //  @example 32000
          y: string;
        }
      >;
    };
    openplantbook: {
      // Searches Openplantbook for a plant
      search: ServiceFunction<
        object,
        T,
        {
          // The string to search for @example Capsicum
          alias: string;
        }
      >;
      // Fetches data for a single species
      get: ServiceFunction<
        object,
        T,
        {
          // The name of the species exactly as written in 'pid' or 'scientific species' in Openplantbook @example coleus 'marble'
          species: string;
        }
      >;
      // Clean up the cached entries from Openplantbook
      cleanCache: ServiceFunction<
        object,
        T,
        {
          // Minimum age of entries to clean from the cache. Defaults to 24 hours if not set @example 6 @constraints  number: mode: box, unit_of_measurement: hours, min: 0, max: 24, step: 1
          hours?: number;
        }
      >;
      // Upload sensors data of all plant instances
      upload: ServiceFunction<object, T, object>;
    };
    utilityMeter: {
      // undefined
      reset: ServiceFunction<object, T, object>;
      // undefined
      calibrate: ServiceFunction<
        object,
        T,
        {
          //  @example 100
          value: string;
        }
      >;
    };
    openaiConversation: {
      // undefined
      generateContent: ServiceFunction<
        object,
        T,
        {
          //  @constraints  config_entry: integration: openai_conversation
          config_entry: unknown;
          //  @example Hello, how can I help you?
          prompt: string;
          //  @example - /path/to/file1.txt - /path/to/file2.txt
          filenames?: string;
        }
      >;
      // undefined
      generateImage: ServiceFunction<
        object,
        T,
        {
          //  @constraints  config_entry: integration: openai_conversation
          config_entry: unknown;
          //
          prompt: string;
          //  @example 1024x1024
          size?: '1024x1024' | '1024x1792' | '1792x1024';
          //  @example standard
          quality?: 'standard' | 'hd';
          //  @example vivid
          style?: 'vivid' | 'natural';
        }
      >;
    };
    synologyDsm: {
      // undefined
      reboot: ServiceFunction<
        object,
        T,
        {
          //  @example 1NDVC86409
          serial?: string;
        }
      >;
      // undefined
      shutdown: ServiceFunction<
        object,
        T,
        {
          //  @example 1NDVC86409
          serial?: string;
        }
      >;
    };
    mqtt: {
      // undefined
      publish: ServiceFunction<
        object,
        T,
        {
          //  @example /homeassistant/hello
          topic: string;
          //  @example The temperature is {{ states('sensor.temperature') }} @constraints  template:
          payload?: unknown;
          //  @constraints  boolean:
          evaluate_payload?: boolean;
          //
          qos?: '0' | '1' | '2';
          //  @constraints  boolean:
          retain?: boolean;
        }
      >;
      // undefined
      dump: ServiceFunction<
        object,
        T,
        {
          //  @example OpenZWave/#
          topic?: string;
          //  @constraints  number: min: 1, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          duration?: number;
        }
      >;
      // undefined
      reload: ServiceFunction<object, T, object>;
    };
    scenePresets: {
      // Apply a scene preset to specified light entities
      applyPreset: ServiceFunction<
        object,
        T,
        {
          // The preset ID to use @example Rest
          preset_id: string;
          // What to apply the preset to @constraints  target: entity: [object Object]
          targets: unknown;
          // Override the presets brightness @example 150 @constraints  number: min: 0, max: 255, step: 1, mode: slider
          brightness?: number;
          // Transition duration between states @example 1 @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          // Shuffle the colors before applying @example true @constraints  boolean:
          shuffle?: boolean;
          // Ensure smooth color transitions when shuffling @example true @constraints  boolean:
          smart_shuffle?: boolean;
        }
      >;
      // Get all currently active dynamic scenes
      getDynamicScenes: ServiceFunction<object, T, object>;
      // Start a loop that periodically applies a shuffled scene preset
      startDynamicScene: ServiceFunction<
        object,
        T,
        {
          // The preset ID to use @example Rest
          preset_id: string;
          // What to apply the preset to @constraints  target: entity: [object Object]
          targets: unknown;
          // Override the presets brightness @example 150 @constraints  number: min: 0, max: 255, step: 1, mode: slider
          brightness?: number;
          // Transition duration between states @example 1 @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          transition?: number;
          // Time between color changes @example 60 @constraints  number: min: 0, max: 300, unit_of_measurement: seconds, step: 1, mode: slider
          interval?: number;
        }
      >;
      // Stop a dynamic scene by ID
      stopDynamicScene: ServiceFunction<
        object,
        T,
        {
          // The UUID of the dynamic scene to stop @example d1db9696-e8ef-41b7-ba71-af696ee89b28
          id: string;
        }
      >;
      // Stops all dynamic scenes that include any of the specified targets
      stopDynamicScenesForTargets: ServiceFunction<
        object,
        T,
        {
          // Targets to stop all dynamic scenes for @constraints  target: entity: [object Object]
          targets: unknown;
        }
      >;
      // Stops all currently running dynamic scenes
      stopAllDynamicScenes: ServiceFunction<object, T, object>;
    };
    bleMonitor: {
      // undefined
      cleanupEntries: ServiceFunction<object, T, object>;
      // undefined
      parseData: ServiceFunction<
        object,
        T,
        {
          //  @example 043E2B02010000123456789ABC1F12161A1819416538C1A41B073915810B529F0F0B094154435F363534313139AA
          packet: string;
          //  @example esp32_gateway
          gateway_id?: string;
        }
      >;
    };
    file: {
      // undefined
      readFile: ServiceFunction<
        object,
        T,
        {
          //  @example www/my_file.json
          file_name?: string;
          //  @example JSON
          file_encoding?: 'JSON' | 'YAML';
        }
      >;
    };
    googleGenerativeAiConversation: {
      // undefined
      generateContent: ServiceFunction<
        object,
        T,
        {
          //
          prompt: string;
          //
          filenames?: string;
        }
      >;
    };
    adguard: {
      // undefined
      addUrl: ServiceFunction<
        object,
        T,
        {
          //  @example Example
          name: string;
          //  @example https://www.example.com/filter/1.txt
          url: string;
        }
      >;
      // undefined
      removeUrl: ServiceFunction<
        object,
        T,
        {
          //  @example https://www.example.com/filter/1.txt
          url: string;
        }
      >;
      // undefined
      enableUrl: ServiceFunction<
        object,
        T,
        {
          //  @example https://www.example.com/filter/1.txt
          url: string;
        }
      >;
      // undefined
      disableUrl: ServiceFunction<
        object,
        T,
        {
          //  @example https://www.example.com/filter/1.txt
          url: string;
        }
      >;
      // undefined
      refresh: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          force?: boolean;
        }
      >;
    };
    solcastSolar: {
      // Deletes the solcast.json file to remove all current solcast site data
      clearAllSolcastData: ServiceFunction<object, T, object>;
      // Force fetches estimated actuals from Solcast
      forceUpdateEstimates: ServiceFunction<object, T, object>;
      // Force fetches the forecasts from Solcast
      forceUpdateForecasts: ServiceFunction<object, T, object>;
      // Get the forecast dampening factors
      getDampening: ServiceFunction<
        object,
        T,
        {
          //  @example 1234-5678-9012-3456
          site?: object;
        }
      >;
      // List of estimated actuals between start date/time and end date/time
      queryEstimateData: ServiceFunction<
        object,
        T,
        {
          //  @example 2024-10-06T00:00:00Z @constraints  datetime:
          start_date_time?: string;
          //  @example 2024-10-06T10:00:00Z @constraints  datetime:
          end_date_time?: string;
          //  @example false
          undampened?: object;
        }
      >;
      // List of forecasts between start date/time and end date/time
      queryForecastData: ServiceFunction<
        object,
        T,
        {
          //  @example 2024-10-06T00:00:00Z @constraints  datetime:
          start_date_time?: string;
          //  @example 2024-10-06T10:00:00Z @constraints  datetime:
          end_date_time?: string;
          //  @example false
          undampened?: object;
          //  @example 1234-5678-9012-3456
          site?: object;
        }
      >;
      // Remove set limit
      removeHardLimit: ServiceFunction<object, T, object>;
      // Set the hourly or half-hourly forecast dampening factors
      setDampening: ServiceFunction<
        object,
        T,
        {
          //  @example 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
          damp_factor?: object;
          //  @example 1234-5678-9012-3456
          site?: object;
        }
      >;
      // Set the custom hours sensor number of hours
      setCustomHours: ServiceFunction<
        object,
        T,
        {
          //  @example 6
          hours?: object;
        }
      >;
      // Prevent forecast values being higher than the inverter can produce
      setHardLimit: ServiceFunction<
        object,
        T,
        {
          //  @example 6.0
          hard_limit?: object;
        }
      >;
      // Fetches the forecasts from Solcast
      updateForecasts: ServiceFunction<object, T, object>;
    };
    musicAssistant: {
      // undefined
      search: ServiceFunction<
        object,
        T,
        {
          //  @constraints  config_entry: integration: music_assistant
          config_entry_id: unknown;
          //  @example We Are The Champions
          name: string;
          //  @example playlist
          media_type?: 'artist' | 'album' | 'audiobook' | 'playlist' | 'podcast' | 'track' | 'radio';
          //  @example Queen
          artist?: string;
          //  @example News of the world
          album?: string;
          //  @example 25 @constraints  number: min: 1, max: 100, step: 1, mode: slider
          limit?: number;
          //  @example true @constraints  boolean:
          library_only?: boolean;
        }
      >;
      // undefined
      getLibrary: ServiceFunction<
        object,
        T,
        {
          //  @constraints  config_entry: integration: music_assistant
          config_entry_id: unknown;
          //  @example playlist
          media_type: 'artist' | 'album' | 'audiobook' | 'playlist' | 'podcast' | 'track' | 'radio';
          //  @example true @constraints  boolean:
          favorite?: boolean;
          //  @example We Are The Champions
          search?: string;
          //  @example 25 @constraints  number: min: 1, max: 500, step: 1, mode: slider
          limit?: number;
          //  @example 25 @constraints  number: min: 1, max: 1000000, step: 1, mode: slider
          offset?: number;
          //  @example random
          order_by?:
            | 'name'
            | 'name_desc'
            | 'sort_name'
            | 'sort_name_desc'
            | 'timestamp_added'
            | 'timestamp_added_desc'
            | 'last_played'
            | 'last_played_desc'
            | 'play_count'
            | 'play_count_desc'
            | 'year'
            | 'year_desc'
            | 'position'
            | 'position_desc'
            | 'artist_name'
            | 'artist_name_desc'
            | 'random'
            | 'random_play_count';
          //  @example single
          album_type?: 'album' | 'single' | 'compilation' | 'ep' | 'unknown';
          //  @example true @constraints  boolean:
          album_artists_only?: boolean;
        }
      >;
      // undefined
      playMedia: ServiceFunction<
        object,
        T,
        {
          //  @example spotify://playlist/aabbccddeeff @constraints  object: multiple: false
          media_id: object;
          //  @example playlist
          media_type?: 'artist' | 'album' | 'audiobook' | 'folder' | 'playlist' | 'podcast' | 'track' | 'radio';
          //  @example Queen
          artist?: string;
          //  @example News of the world
          album?: string;
          //
          enqueue?: 'play' | 'replace' | 'next' | 'replace_next' | 'add';
          //  @constraints  boolean:
          radio_mode?: boolean;
        }
      >;
      // undefined
      playAnnouncement: ServiceFunction<
        object,
        T,
        {
          //  @example http://someremotesite.com/doorbell.mp3
          url: string;
          //  @example true @constraints  boolean:
          use_pre_announce?: boolean;
          //  @example http://someremotesite.com/chime.mp3
          pre_announce_url?: string;
          //  @example 75 @constraints  number: min: 1, max: 100, step: 1, mode: slider
          announce_volume?: number;
        }
      >;
      // undefined
      transferQueue: ServiceFunction<
        object,
        T,
        {
          //
          source_player?: string;
          //  @example true @constraints  boolean:
          auto_play?: boolean;
        }
      >;
      // undefined
      getQueue: ServiceFunction<object, T, object>;
    };
    inputDatetime: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      setDatetime: ServiceFunction<
        object,
        T,
        {
          //  @example '2019-04-20'
          date?: string;
          //  @example '05:04:20' @constraints  time:
          time?: string;
          //  @example '2019-04-20 05:04:20'
          datetime?: string;
          //  @constraints  number: min: 0, max: 9223372036854776000, mode: box, step: 1
          timestamp?: number;
        }
      >;
    };
    webrtc: {
      // undefined
      createLink: ServiceFunction<
        object,
        T,
        {
          //  @example fd0a53ca-e9ab-4e7a-86a2-441642b16ae1
          link_id: string;
          //  @example rtsp://rtsp:12345678@192.168.1.123:554/av_stream/ch0
          url?: string;
          //  @example camera.generic_stream
          entity?: string;
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: times, step: 1, mode: slider
          open_limit?: number;
          //  @constraints  number: min: 0, max: 100000, unit_of_measurement: seconds, step: 1, mode: slider
          time_to_live?: number;
        }
      >;
      // undefined
      dashCast: ServiceFunction<
        object,
        T,
        {
          //  @example media_player.mibox4
          entity_id: string;
          //  @example rtsp://rtsp:12345678@192.168.1.123:554/av_stream/ch0
          url?: string;
          //  @example camera.generic_stream
          entity?: string;
          //  @constraints  object: multiple: false
          extra?: object;
          //  @constraints  boolean:
          force?: boolean;
          //  @example http://192.168.1.123:8123
          hass_url?: string;
        }
      >;
    };
    reolink: {
      // undefined
      playChime: ServiceFunction<
        object,
        T,
        {
          //
          device_id: string;
          //
          ringtone:
            | 'citybird'
            | 'originaltune'
            | 'pianokey'
            | 'loop'
            | 'attraction'
            | 'hophop'
            | 'goodday'
            | 'operetta'
            | 'moonlight'
            | 'waybackhome';
        }
      >;
      // undefined
      ptzMove: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 1, max: 64, step: 1, mode: slider
          speed: number;
        }
      >;
    };
    inputText: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example This is an example text
          value: string;
        }
      >;
    };
    cast: {
      // undefined
      showLovelaceView: ServiceFunction<
        object,
        T,
        {
          //
          entity_id: string;
          //  @example lovelace-cast
          dashboard_path?: string;
          //  @example downstairs
          view_path: string;
        }
      >;
    };
    schedule: {
      // undefined
      reload: ServiceFunction<object, T, object>;
      // undefined
      getSchedule: ServiceFunction<object, T, object>;
    };
    mediaPlayer: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      volumeUp: ServiceFunction<object, T, object>;
      // undefined
      volumeDown: ServiceFunction<object, T, object>;
      // undefined
      mediaPlayPause: ServiceFunction<object, T, object>;
      // undefined
      mediaPlay: ServiceFunction<object, T, object>;
      // undefined
      mediaPause: ServiceFunction<object, T, object>;
      // undefined
      mediaStop: ServiceFunction<object, T, object>;
      // undefined
      mediaNextTrack: ServiceFunction<object, T, object>;
      // undefined
      mediaPreviousTrack: ServiceFunction<object, T, object>;
      // undefined
      clearPlaylist: ServiceFunction<object, T, object>;
      // undefined
      volumeSet: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 1, step: 0.01, mode: slider
          volume_level: number;
        }
      >;
      // undefined
      volumeMute: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          is_volume_muted: boolean;
        }
      >;
      // undefined
      mediaSeek: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 9223372036854776000, step: 0.01, mode: box
          seek_position: number;
        }
      >;
      // undefined
      join: ServiceFunction<
        object,
        T,
        {
          //  @example - media_player.multiroom_player2 - media_player.multiroom_player3
          group_members: string[];
        }
      >;
      // undefined
      selectSource: ServiceFunction<
        object,
        T,
        {
          //  @example video1
          source: string;
        }
      >;
      // undefined
      selectSoundMode: ServiceFunction<
        object,
        T,
        {
          //  @example Music
          sound_mode?: string;
        }
      >;
      // undefined
      playMedia: ServiceFunction<
        object,
        T,
        {
          //  @example {'media_content_id': 'https://home-assistant.io/images/cast/splash.png', 'media_content_type': 'music'} @constraints  media: multiple: false
          media: unknown;
          //
          enqueue?: 'play' | 'next' | 'add' | 'replace';
          //  @example true @constraints  boolean:
          announce?: boolean;
        }
      >;
      // undefined
      browseMedia: ServiceFunction<
        object,
        T,
        {
          //  @example music
          media_content_type?: string;
          //  @example A:ALBUMARTIST/Beatles
          media_content_id?: string | number;
        }
      >;
      // undefined
      searchMedia: ServiceFunction<
        object,
        T,
        {
          //  @example Beatles
          search_query: string;
          //  @example music
          media_content_type?: string;
          //  @example A:ALBUMARTIST/Beatles
          media_content_id?: string | number;
          //  @example album,artist
          media_filter_classes?: string;
        }
      >;
      // undefined
      shuffleSet: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          shuffle: boolean;
        }
      >;
      // undefined
      unjoin: ServiceFunction<object, T, object>;
      // undefined
      repeatSet: ServiceFunction<
        object,
        T,
        {
          //
          repeat: 'off' | 'all' | 'one';
        }
      >;
    };
    browserMod: {
      // Run a sequence of services
      sequence: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // List of services to run @constraints  object: multiple: false
          sequence?: object;
        }
      >;
      // Wait for a time
      delay: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // Time to wait (ms) @constraints  number: mode: box, step: 1
          time?: number;
        }
      >;
      // Display a popup
      popup: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // ID of the popup-card to use as a template for the popup
          popup_card_id?: string;
          // Popup title
          title?: string;
          // Use adaptive dialog instead of standard dialog. @constraints  boolean:
          adaptive?: boolean;
          // Allow adaptive dialog to continually change between standard and adaptive mode based on screen size instead of only on open. This can be used to make the popup responsive to screen size changes while open but may cause issues with content or styles. @constraints  boolean:
          adaptive_allow_mode_change?: boolean;
          // Force the popup to always open as a bottom sheet when in adaptive mode. @constraints  boolean:
          adaptive_force_bottom_sheet?: boolean;
          // Popup content (Text or lovelace card configuration) @constraints  object: multiple: false
          content: object;
          // Initial style to apply to the popup
          initial_style?: 'normal' | 'classic' | 'wide' | 'fullscreen';
          // Sequence of styles to cycle through when user taps the title or with browser_mod.set_popup_style service
          style_sequence?: 'initial' | 'normal' | 'classic' | 'wide' | 'fullscreen';
          // Popup styles to apply. Use 'all' to always apply the style. You can add to standard styles or create your own @constraints  object: label_field: style, description_field: include_styles, multiple: true, fields: [object Object]
          popup_styles?: object;
          // Text of the right button
          right_button?: string;
          // Variant of the right button
          right_button_variant?: 'brand' | 'neutral' | 'danger' | 'warning' | 'success';
          // Appearance of the right button
          right_button_appearance?: 'accent' | 'filled' | 'outlined' | 'plain';
          // Action to perform when the right button is pressed @constraints  object: multiple: false
          right_button_action?: object;
          // Text of the left button
          left_button?: string;
          // Variant of the left button
          left_button_variant?: 'brand' | 'neutral' | 'danger' | 'warning' | 'success';
          // Appearance of the left button
          left_button_appearance?: 'accent' | 'filled' | 'outlined' | 'plain';
          // Action to perform when left button is pressed @constraints  object: multiple: false
          left_button_action?: object;
          // Whether the popup can be closed by the user without action @constraints  boolean:
          dismissable?: boolean;
          // Action to perform when popup is dismissed @constraints  object: multiple: false
          dismiss_action?: object;
          // Close the popup automatically on mouse, pointer or keyboard activity @constraints  boolean:
          autoclose?: boolean;
          // Time before closing (ms) @constraints  number: mode: box, step: 1
          timeout?: number;
          // Action to perform when popup is closed by timeout @constraints  object: multiple: false
          timeout_action?: object;
          // Hide timeout progress bar @constraints  boolean:
          timeout_hide_progress?: boolean;
          // Tag for managing multiple popups
          tag?: string;
        }
      >;
      // Show more-info dialog
      moreInfo: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          //
          entity?: string;
          // More-info view to show
          view?: 'info' | 'history' | 'settings' | 'related';
          //  @constraints  boolean:
          large?: boolean;
          //  @constraints  boolean:
          ignore_popup_card?: boolean;
          // Close the more-info dialog if open @constraints  boolean:
          close?: boolean;
        }
      >;
      // Close a popup
      closePopup: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // Close all Browser Mod popups on the browser @constraints  boolean:
          all?: boolean;
          // Tag for popup to close when using multiple popups
          tag?: string;
        }
      >;
      // Set the style of a popup
      setPopupStyle: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // Set style for all open Browser Mod popups on the browser @constraints  boolean:
          all?: boolean;
          // Tag for popup to set style for when using multiple popups
          tag?: string;
          // Style to apply to the popup
          style?: 'normal' | 'classic' | 'wide' | 'fullscreen';
          // Direction to cycle through style sequence
          direction?: 'forward' | 'back';
        }
      >;
      // Display a short notification
      notification: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // Message to display
          message: string;
          // Time before closing (ms) @constraints  number: mode: box, step: 1
          duration?: number;
          // Text of optional action button
          action_text?: string;
          // Action to perform when the action button is pressed @constraints  object: multiple: false
          action?: object;
        }
      >;
      // Navigate browser to a different page
      navigate: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // Target path
          path?: string;
        }
      >;
      // Refresh page
      refresh: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
        }
      >;
      // Change browser ID
      changeBrowserId: ServiceFunction<
        object,
        T,
        {
          // Current Browser ID of the browser to change
          current_browser_id?: string;
          // New Browser ID for the browser
          new_browser_id?: string;
          // Register the browser @constraints  boolean:
          register?: boolean;
          // Refresh the browser after changing the ID @constraints  boolean:
          refresh?: boolean;
        }
      >;
      // Change the current theme
      setTheme: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // Name of theme or 'auto'
          theme?: string;
          // Dark/light mode
          dark?: 'auto' | 'light' | 'dark';
          // Primary theme color @constraints  color_rgb:
          primaryColor?: unknown;
          // Accent theme color @constraints  color_rgb:
          accentColor?: unknown;
        }
      >;
      // Print text to browser console
      console: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // Text to print
          message?: string;
        }
      >;
      // Run arbitrary JavaScript code
      javascript: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          //
          user_id?: string;
          // JavaScript code to run @constraints  object: multiple: false
          code?: object;
        }
      >;
      // Deregister a browser. Include at leaset one paremeter. Calling wiith either exclude parameter will deregister all browsers except those excluded.
      deregisterBrowser: ServiceFunction<
        object,
        T,
        {
          //
          browser_id?: string;
          // Exclude browser from deregister
          browser_id_exclude?: string;
          // Exclude browsers in area from deregister @constraints  area: multiple: true, entity: [object Object]
          area_id_exclude?: unknown;
        }
      >;
    };
    deviceTracker: {
      // undefined
      see: ServiceFunction<
        object,
        T,
        {
          //  @example FF:FF:FF:FF:FF:FF
          mac?: string;
          //  @example phonedave
          dev_id?: string;
          //  @example Dave
          host_name?: string;
          //  @example home
          location_name?: string;
          //  @example [51.509802, -0.086692] @constraints  object: multiple: false
          gps?: object;
          //  @constraints  number: min: 0, mode: box, unit_of_measurement: m, step: 1
          gps_accuracy?: number;
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          battery?: number;
        }
      >;
    };
    aiTask: {
      // undefined
      generateData: ServiceFunction<
        object,
        T,
        {
          //  @example home summary
          task_name: string;
          //  @example Generate a funny notification that the garage door was left open
          instructions: string;
          //
          entity_id?: string;
          //  @example { 'name': { 'selector': { 'text': }, 'description': 'Name of the user', 'required': 'True' } } }, 'age': { 'selector': { 'number': }, 'description': 'Age of the user' } } @constraints  object: multiple: false
          structure?: object;
          //  @constraints  media: accept: *, multiple: true
          attachments?: unknown;
        }
      >;
      // undefined
      generateImage: ServiceFunction<
        object,
        T,
        {
          //  @example picture of a dog
          task_name: string;
          //  @example Generate a high quality square image of a dog on transparent background
          instructions: string;
          //
          entity_id: string;
          //  @constraints  media: accept: *, multiple: true
          attachments?: unknown;
        }
      >;
    };
    scheduler: {
      // Execute the action of a schedule, optionally at a given time.
      runAction: ServiceFunction<
        object,
        T,
        {
          // Identifier of the scheduler entity. @example switch.schedule_abcdef
          entity_id: string;
          // Time for which to evaluate the action (only useful for schedules with multiple timeslot) @example '12:00' @constraints  time:
          time?: string;
          // Whether the conditions of the schedule should be skipped or not @constraints  boolean:
          skip_conditions?: boolean;
        }
      >;
      // Create a new schedule entity
      add: ServiceFunction<
        object,
        T,
        {
          // Days of the week for which the schedule should be repeated @example ['daily'] @constraints  object: multiple: false
          weekdays?: object;
          // Date from which schedule should be executed @example ['2021-01-01'] @constraints  object: multiple: false
          start_date?: object;
          // Date until which schedule should be executed @example ['2021-12-31'] @constraints  object: multiple: false
          end_date?: object;
          // list of timeslots with their actions and optionally conditions (should be kept the same for all timeslots) @example [{start: '12:00', stop: '13:00', actions: [{service: 'light.turn_on', entity_id: 'light.my_lamp', service_data: {brightness: 200}}]}] @constraints  object: multiple: false
          timeslots: object;
          // Control what happens after the schedule is triggered @example 'repeat'
          repeat_type: 'repeat' | 'single' | 'pause';
          // Friendly name for the schedule @example My schedule
          name?: string;
        }
      >;
      // Edit a schedule entity
      edit: ServiceFunction<
        object,
        T,
        {
          // Identifier of the scheduler entity. @example switch.schedule_abcdef
          entity_id: string;
          // Days of the week for which the schedule should be repeated @example ['daily'] @constraints  object: multiple: false
          weekdays?: object;
          // Date from which schedule should be executed @example ['2021-01-01'] @constraints  object: multiple: false
          start_date?: object;
          // Date until which schedule should be executed @example ['2021-12-31'] @constraints  object: multiple: false
          end_date?: object;
          // list of timeslots with their actions and optionally conditions (should be kept the same for all timeslots) @example [{start: '12:00', stop: '13:00', actions: [{service: 'light.turn_on', entity_id: 'light.my_lamp', service_data: {brightness: 200}}]}] @constraints  object: multiple: false
          timeslots?: object;
          // Control what happens after the schedule is triggered @example 'repeat'
          repeat_type?: 'repeat' | 'single' | 'pause';
          // Friendly name for the schedule @example My schedule
          name?: string;
        }
      >;
      // Remove a schedule entity
      remove: ServiceFunction<
        object,
        T,
        {
          // Identifier of the scheduler entity. @example switch.schedule_abcdef
          entity_id: string;
        }
      >;
      // Duplicate a schedule entity
      copy: ServiceFunction<
        object,
        T,
        {
          // Identifier of the scheduler entity. @example switch.schedule_abcdef
          entity_id: string;
          // Friendly name for the copied schedule @example My schedule
          name?: string;
        }
      >;
      // Disables all schedules
      disableAll: ServiceFunction<object, T, object>;
      // Enables all schedules
      enableAll: ServiceFunction<object, T, object>;
    };
    weather: {
      // undefined
      getForecasts: ServiceFunction<
        object,
        T,
        {
          //
          type: 'daily' | 'hourly' | 'twice_daily';
        }
      >;
    };
    openweathermap: {
      // undefined
      getMinuteForecast: ServiceFunction<object, T, object>;
    };
    alarmControlPanel: {
      // undefined
      alarmDisarm: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmHome: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmAway: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmNight: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmVacation: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmArmCustomBypass: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      alarmTrigger: ServiceFunction<
        object,
        T,
        {
          //  @example 1234
          code?: string;
        }
      >;
    };
    siren: {
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @example fire
          tone?: string;
          //  @example 0.5 @constraints  number: min: 0, max: 1, step: 0.05, mode: slider
          volume_level?: number;
          //  @example 15
          duration?: string;
        }
      >;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
    };
    time: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example 22:15 @constraints  time:
          time: string;
        }
      >;
    };
    humidifier: {
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      setMode: ServiceFunction<
        object,
        T,
        {
          //  @example away
          mode: string;
        }
      >;
      // undefined
      setHumidity: ServiceFunction<
        object,
        T,
        {
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          humidity: number;
        }
      >;
    };
    text: {
      // undefined
      setValue: ServiceFunction<
        object,
        T,
        {
          //  @example Hello world!
          value: string;
        }
      >;
    };
    image: {
      // undefined
      snapshot: ServiceFunction<
        object,
        T,
        {
          //  @example /tmp/image_snapshot.jpg
          filename: string;
        }
      >;
    };
    blueprint: {
      // Import a blueprint.
      import: ServiceFunction<
        object,
        T,
        {
          // The URL to import the blueprint from.
          url: string;
        }
      >;
    };
    spook: {
      // Calling this action spooks Home Assistant. Performing this action will always fail.
      boo: ServiceFunction<object, T, object>;
      // Performing this action will randomly fail.
      randomFail: ServiceFunction<object, T, object>;
    };
    repairs: {
      // Removes a manually created Home Assistant repairs issue. This action can only remove issues created with the `repairs_create` action.
      remove: ServiceFunction<
        object,
        T,
        {
          // The issue ID to remove.
          issue_id: string;
        }
      >;
      // Unignore all issues currently raised in Home Assistant Repairs.
      unignoreAll: ServiceFunction<object, T, object>;
      // Ignore all issues currently raised in Home Assistant Repairs.
      ignoreAll: ServiceFunction<object, T, object>;
      // Manually create and raise a issue in Home Assistant repairs.
      create: ServiceFunction<
        object,
        T,
        {
          // The title of the issue.
          title: string;
          // The description of the issue. Supports Markdown.
          description: string;
          // The issue can have an identifier, which allows you to cancel it later with that ID if needed. It also prevent duplicate issues to be created. If not provided, a random ID will be generated.
          issue_id?: string;
          // This field can be used to set the domain of the issue. For example, by default (if not set), it will use 'spook'. This causes Spook to be shown in the logo/image of the issue. If you set it to 'homeassistant', the Home Assistant logo will be used, or use 'hue', 'zwave_js', 'mqtt', etc. to use the logo of that integration.
          domain?: string;
          // The severity of the issue. This will be used to determine the priority of the issue. If not set, 'warning' will be used
          severity?: 'warning' | 'error' | 'critical';
          // If the issue should be persistent, which means it will survive restarts of Home Assistant. By default, issues are not persistent. @constraints  boolean:
          persistent?: boolean;
        }
      >;
    };
    plant: {
      // Replaces an external sensor
      replaceSensor: ServiceFunction<
        object,
        T,
        {
          // The meter entity to replace the sensor for @example plant.my_plant_current_temperature
          meter_entity: string;
          // Entity id of the new sensor. Leave blank to remove sensor. @example sensor.new_temperature_outdoor
          new_sensor?: string;
        }
      >;
    };
    fullyKiosk: {
      // undefined
      loadUrl: ServiceFunction<
        object,
        T,
        {
          //
          device_id: string;
          //  @example https://home-assistant.io
          url: string;
        }
      >;
      // undefined
      startApplication: ServiceFunction<
        object,
        T,
        {
          //  @example de.ozerov.fully
          application: string;
          //
          device_id: string;
        }
      >;
      // undefined
      setConfig: ServiceFunction<
        object,
        T,
        {
          //
          device_id: string;
          //  @example motionSensitivity
          key: string;
          //  @example 90
          value: string;
        }
      >;
    };
    alarmo: {
      // undefined
      arm: ServiceFunction<
        object,
        T,
        {
          //  @example alarm_control_panel.alarm
          entity_id: string;
          //  @example 1234
          code?: string;
          //  @example away
          mode?: 'away' | 'night' | 'home' | 'vacation' | 'custom';
          //  @constraints  boolean:
          skip_delay?: boolean;
          //  @constraints  boolean:
          force?: boolean;
        }
      >;
      // undefined
      disarm: ServiceFunction<
        object,
        T,
        {
          //  @example alarm_control_panel.alarm
          entity_id: string;
          //  @example 1234
          code?: string;
        }
      >;
      // undefined
      skipDelay: ServiceFunction<
        object,
        T,
        {
          //  @example alarm_control_panel.alarm
          entity_id: string;
        }
      >;
      // undefined
      enableUser: ServiceFunction<
        object,
        T,
        {
          //  @example Frank
          name: string;
        }
      >;
      // undefined
      disableUser: ServiceFunction<
        object,
        T,
        {
          //  @example Frank
          name: string;
        }
      >;
    };
    frigate: {
      // Export a custom recording or timelapse.
      exportRecording: ServiceFunction<
        object,
        T,
        {
          // Playback factor for recordings @example realtime
          playback_factor: 'realtime' | 'timelapse_25x';
          // Start time of exported recording @constraints  datetime:
          start_time: string;
          // End time of exported recording @constraints  datetime:
          end_time: string;
          // Optional name for the exported recording. If not provided, the API will generate one.
          name?: string;
        }
      >;
      // Favorites or unfavorites an event. Favorited events are retained indefinitely.
      favoriteEvent: ServiceFunction<
        object,
        T,
        {
          // ID of the event to favorite or unfavorite. @example 1656510950.19548-ihtjj7
          event_id: string;
          // If the event should be favorited or unfavorited. Enable to favorite, disable to unfavorite.  @example true @constraints  boolean:
          favorite?: boolean;
        }
      >;
      // Pan / Tilt, Zoom, or move a camera to a preset
      ptz: ServiceFunction<
        object,
        T,
        {
          // Type of PTZ action @example move
          action: 'move' | 'preset' | 'stop' | 'zoom';
          // left, right, up, down for move; in, out for zoom; name of preset  @example down
          argument?: string;
        }
      >;
      // Create a manual event with a given label for a camera.
      createEvent: ServiceFunction<
        object,
        T,
        {
          // Label for the event @example Doorbell press
          label: string;
          // Sub label for the event @example Front door
          sub_label?: string;
          // Predetermined length of event. Default is 30 seconds. Use 0 for indefinite.  @example 30 @constraints  number: min: 0, max: 300, step: 1, mode: slider
          duration?: number;
          // Whether the event should save recordings along with the snapshot that is taken.  @example true @constraints  boolean:
          include_recording?: boolean;
        }
      >;
      // End a manual event with a given id for a camera.
      endEvent: ServiceFunction<
        object,
        T,
        {
          // ID of the event to end. @example 1656510950.19548-ihtjj7
          event_id: string;
        }
      >;
      // Get a summary of review items for a specified time period. Only available in Frigate 0.17+.
      reviewSummarize: ServiceFunction<
        object,
        T,
        {
          // Start time for the review period @constraints  datetime:
          start_time: string;
          // End time for the review period @constraints  datetime:
          end_time: string;
        }
      >;
    };
    google: {
      // undefined
      createEvent: ServiceFunction<
        object,
        T,
        {
          //  @example Bowling
          summary: string;
          //  @example Birthday bowling
          description?: string;
          //  @example 2022-03-22 20:00:00
          start_date_time?: string;
          //  @example 2022-03-22 22:00:00
          end_date_time?: string;
          //  @example 2022-03-10
          start_date?: string;
          //  @example 2022-03-11
          end_date?: string;
          //  @example 'days': 2 or 'weeks': 2 @constraints  object: multiple: false
          in?: object;
          //  @example Conference Room - F123, Bldg. 002
          location?: string;
        }
      >;
    };
    automation: {
      // undefined
      trigger: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          skip_condition?: boolean;
        }
      >;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<object, T, object>;
      // undefined
      turnOff: ServiceFunction<
        object,
        T,
        {
          //  @constraints  boolean:
          stop_actions?: boolean;
        }
      >;
      // undefined
      reload: ServiceFunction<object, T, object>;
    };
    lawnMower: {
      // undefined
      startMowing: ServiceFunction<object, T, object>;
      // undefined
      pause: ServiceFunction<object, T, object>;
      // undefined
      dock: ServiceFunction<object, T, object>;
    };
    mammotion: {
      // undefined
      startMow: ServiceFunction<
        object,
        T,
        {
          //  @example true @constraints  boolean:
          modify?: boolean;
          //  @example true @constraints  boolean:
          is_mow?: boolean;
          //  @example true @constraints  boolean:
          is_dump?: boolean;
          //  @constraints  boolean:
          is_edge?: boolean;
          //  @example 10 @constraints  number: min: 5, max: 100, unit_of_measurement: m², step: 1, mode: slider
          collect_grass_frequency?: number;
          //  @example 0
          border_mode?: '0' | '1';
          //  @constraints  number: step: 1, mode: box
          job_version?: number;
          //  @constraints  number: step: 1, mode: box
          job_id?: number;
          //  @example 0.3 @constraints  number: min: 0.2, max: 1.2, step: 0.1, mode: box, unit_of_measurement: m/s
          speed?: number;
          //  @example 2
          ultra_wave?: '0' | '1' | '2' | '10' | '11';
          //  @example 0
          channel_mode?: '0' | '1' | '2' | '3';
          //  @example 25 @constraints  number: min: 5, max: 35, step: 1, mode: slider
          channel_width?: number;
          //  @example 1
          rain_tactics?: '0' | '1';
          //  @constraints  number: min: 15, max: 100, step: 5, unit_of_measurement: mm, mode: slider
          blade_height?: number;
          //  @constraints  number: min: -180, max: 180, unit_of_measurement: degrees, step: 1, mode: slider
          toward?: number;
          //  @constraints  number: min: -180, max: 180, unit_of_measurement: degrees, step: 1, mode: slider
          toward_included_angle?: number;
          //  @example 0
          toward_mode?: '0' | '1' | '2';
          //  @example 1
          mowing_laps?: '0' | '1' | '2' | '3' | '4';
          //  @example 1
          obstacle_laps?: '0' | '1' | '2' | '3' | '4';
          //  @constraints  number: min: 0, max: 100, unit_of_measurement: %, step: 1, mode: slider
          start_progress?: number;
          //
          areas: string;
        }
      >;
      // undefined
      cancelJob: ServiceFunction<object, T, object>;
      // undefined
      startStopBlades: ServiceFunction<
        object,
        T,
        {
          //  @example true @constraints  boolean:
          start_stop: boolean;
          //  @constraints  number: min: 15, max: 100, step: 5, unit_of_measurement: mm, mode: slider
          blade_height?: number;
        }
      >;
      // undefined
      setNonWorkHours: ServiceFunction<
        object,
        T,
        {
          //  @example 09:00 @constraints  time:
          start_time: string;
          //  @example 17:00 @constraints  time:
          end_time: string;
        }
      >;
    };
    onvif: {
      // undefined
      ptz: ServiceFunction<
        object,
        T,
        {
          //
          tilt?: 'DOWN' | 'UP';
          //
          pan?: 'LEFT' | 'RIGHT';
          //
          zoom?: 'ZOOM_IN' | 'ZOOM_OUT';
          //  @constraints  number: min: 0, max: 1, step: 0.01, mode: slider
          distance?: number;
          //  @constraints  number: min: 0, max: 1, step: 0.01, mode: slider
          speed?: number;
          //  @constraints  number: min: 0, max: 1, step: 0.01, mode: slider
          continuous_duration?: number;
          //  @example 1
          preset?: string;
          //
          move_mode?: 'AbsoluteMove' | 'ContinuousMove' | 'GotoPreset' | 'RelativeMove' | 'Stop';
        }
      >;
    };
    remote: {
      // undefined
      turnOff: ServiceFunction<object, T, object>;
      // undefined
      turnOn: ServiceFunction<
        object,
        T,
        {
          //  @example BedroomTV
          activity?: string;
        }
      >;
      // undefined
      toggle: ServiceFunction<object, T, object>;
      // undefined
      sendCommand: ServiceFunction<
        object,
        T,
        {
          //  @example 32756745
          device?: string;
          //  @example Play @constraints  object: multiple: false
          command: object;
          //  @constraints  number: min: 0, max: 255, step: 1, mode: slider
          num_repeats?: number;
          //  @constraints  number: min: 0, max: 60, step: 0.1, unit_of_measurement: seconds, mode: slider
          delay_secs?: number;
          //  @constraints  number: min: 0, max: 60, step: 0.1, unit_of_measurement: seconds, mode: slider
          hold_secs?: number;
        }
      >;
      // undefined
      learnCommand: ServiceFunction<
        object,
        T,
        {
          //  @example television
          device?: string;
          //  @example Turn on @constraints  object: multiple: false
          command?: object;
          //
          command_type?: 'ir' | 'rf';
          //  @constraints  boolean:
          alternative?: boolean;
          //  @constraints  number: min: 0, max: 60, step: 5, unit_of_measurement: seconds, mode: slider
          timeout?: number;
        }
      >;
      // undefined
      deleteCommand: ServiceFunction<
        object,
        T,
        {
          //  @example television
          device?: string;
          //  @example Mute @constraints  object: multiple: false
          command: object;
        }
      >;
    };
  }
  export interface CustomEntityNameContainer {
    names:
      | 'update.home_assistant_supervisor_update'
      | 'update.home_assistant_core_update'
      | 'update.frigate_full_access_mise_a_jour'
      | 'update.terminal_ssh_update'
      | 'update.node_red_update'
      | 'update.frigate_update'
      | 'update.home_assistant_google_drive_backup_update'
      | 'update.openwakeword_update'
      | 'update.cloudflared_update'
      | 'update.zigbee2mqtt_update'
      | 'update.zigbee2mqtt_edge_mise_a_jour'
      | 'update.mosquitto_broker_update'
      | 'update.music_assistant_server_update'
      | 'update.matter_server_update'
      | 'update.mqtt_explorer_update'
      | 'update.adguard_home_update'
      | 'update.samba_share_mise_a_jour'
      | 'update.studio_code_server_update'
      | 'update.home_assistant_operating_system_update'
      | 'conversation.home_assistant'
      | 'group.notifications_dashboard'
      | 'light.lumieres'
      | 'cover.volets'
      | 'binary_sensor.capteur_d_ouverture'
      | 'binary_sensor.capteurs_de_presence'
      | 'light.lumiere_cellier'
      | 'sensor.ramassage_poubelles'
      | 'sensor.collecte_poubelles_demain'
      | 'sensor.zendure_total_power'
      | 'binary_sensor.herbe_mouillee'
      | 'sensor.edf_prix_actuel'
      | 'calendar.ics_2'
      | 'number.production_du_jour_euro'
      | 'binary_sensor.presence_maison'
      | 'binary_sensor.notifications_badge'
      | 'sensor.jour_fr'
      | 'sensor.date_fr'
      | 'sensor.weather_forecast_jour_xxxx'
      | 'sensor.jour_aujourd_hui'
      | 'sensor.jour_demain'
      | 'event.backup_sauvegarde_automatique'
      | 'sensor.backup_etat_du_gestionnaire_de_sauvegarde'
      | 'sensor.backup_prochaine_sauvegarde_automatique_programmee'
      | 'sensor.backup_derniere_sauvegarde_automatique_reussie'
      | 'sensor.backup_derniere_tentative_de_sauvegarde_automatique'
      | 'update.capteur_d_ouverture_de_porte_chambre'
      | 'binary_sensor.capteur_d_ouverture_de_porte_chambre_porte'
      | 'button.capteur_d_ouverture_de_porte_chambre_identifier_2'
      | 'sensor.capteur_d_ouverture_de_porte_chambre_batterie'
      | 'sensor.capteur_d_ouverture_de_porte_chambre_tension'
      | 'sensor.capteur_d_ouverture_de_porte_chambre_type_de_batterie'
      | 'update.capteur_de_presence_cuisine'
      | 'binary_sensor.capteur_de_presence_cuisine_occupation'
      | 'button.capteur_de_presence_cuisine_identifier_1_2'
      | 'number.capteur_de_presence_cuisine_temps_de_maintien'
      | 'select.capteur_de_presence_cuisine_sensibilite'
      | 'button.capteur_de_presence_cuisine_identifier_2_2'
      | 'sensor.capteur_de_presence_cuisine_eclairement'
      | 'sensor.capteur_de_presence_cuisine_batterie'
      | 'sensor.capteur_de_presence_cuisine_tension'
      | 'sensor.capteur_de_presence_cuisine_type_de_batterie'
      | 'binary_sensor.smart_lock_ultra_actuator'
      | 'button.smart_lock_ultra_identifier_3'
      | 'lock.smart_lock_ultra'
      | 'select.smart_lock_ultra_mode_de_fonctionnement'
      | 'sensor.smart_lock_ultra_batterie_2'
      | 'sensor.smart_lock_ultra_battery_charge_state_2'
      | 'button.google_assistant_synchroniser_les_appareils'
      | 'binary_sensor.remote_ui'
      | 'stt.home_assistant_cloud'
      | 'tts.home_assistant_cloud'
      | 'zone.home'
      | 'script.allume_alarme_en_mode_absence'
      | 'script.desactiver_toutes_les_fonctions_de_la_camera_cuisine'
      | 'script.ouvre_les_volets'
      | 'script.ferme_les_volets'
      | 'script.envoie_photo_discord'
      | 'script.prendre_snapshots_bal'
      | 'input_number.seuil_minimum_d_eau_chaude'
      | 'input_number.menneville_temp_max'
      | 'input_number.menneville_temp_min'
      | 'input_number.seuil_humidite_rosee'
      | 'input_number.seuil_precipitation'
      | 'input_number.seuil_pluie'
      | 'input_number.edf_tempo_bleu_hc'
      | 'input_number.edf_tempo_bleu_hp'
      | 'input_number.edf_tempo_blanc_hc'
      | 'input_number.edf_tempo_blanc_hp'
      | 'input_number.edf_tempo_rouge_hc'
      | 'input_number.edf_tempo_rouge_hp'
      | 'input_select.camera_selectionnee'
      | 'input_boolean.laver_salon'
      | 'input_boolean.laver_cuisine'
      | 'input_boolean.lancer_le_lavage'
      | 'input_boolean.laver_salle_de_bain'
      | 'input_boolean.laver_chambre'
      | 'input_boolean.laver_cellier'
      | 'input_boolean.laver_salle_a_manger'
      | 'input_boolean.laver_chambre_amis'
      | 'input_boolean.laver_bureau'
      | 'input_boolean.laver_repos'
      | 'input_boolean.display_notification_washing_machine'
      | 'input_boolean.display_notification_trash'
      | 'input_boolean.wallpanel_screensaver'
      | 'person.thomas'
      | 'person.adeline'
      | 'tts.google_en_com'
      | 'tts.google_fr_fr'
      | 'openplantbook.search_result'
      | 'govee.state'
      | 'sun.sun'
      | 'sensor.sun_next_dawn'
      | 'sensor.sun_next_dusk'
      | 'sensor.sun_next_midnight'
      | 'sensor.sun_next_noon'
      | 'sensor.sun_next_rising'
      | 'sensor.sun_next_setting'
      | 'camera.restream_salon'
      | 'camera.rtsp_sonnette'
      | 'sensor.zendure'
      | 'sensor.production_du_jour'
      | 'sensor.ble_rssi_2686f39cbada4658854aa62e7e5e8b8d'
      | 'sensor.ble_measured_power_2686f39cbada4658854aa62e7e5e8b8d'
      | 'sensor.ble_mac_2686f39cbada4658854aa62e7e5e8b8d'
      | 'sensor.ble_major_2686f39cbada4658854aa62e7e5e8b8d'
      | 'sensor.ble_minor_2686f39cbada4658854aa62e7e5e8b8d'
      | 'sensor.zendure_total_energy_2_cost'
      | 'conversation.openai_conversation'
      | 'stt.openai_stt'
      | 'tts.openai_tts'
      | 'ai_task.openai_ai_task'
      | 'binary_sensor.iphone_de_adeline_focus'
      | 'device_tracker.iphone_de_adeline'
      | 'sensor.iphone_de_adeline_last_update_trigger'
      | 'sensor.iphone_de_adeline_battery_state'
      | 'sensor.iphone_de_adeline_activity'
      | 'sensor.iphone_de_adeline_steps'
      | 'sensor.iphone_de_adeline_ssid'
      | 'sensor.iphone_de_adeline_connection_type'
      | 'sensor.iphone_de_adeline_storage'
      | 'sensor.iphone_de_adeline_floors_descended'
      | 'sensor.iphone_de_adeline_sim_1'
      | 'sensor.iphone_de_adeline_battery_level'
      | 'sensor.iphone_de_adeline_average_active_pace'
      | 'sensor.iphone_de_adeline_bssid'
      | 'sensor.iphone_de_adeline_distance'
      | 'sensor.iphone_de_adeline_floors_ascended'
      | 'sensor.iphone_de_adeline_sim_2'
      | 'sensor.iphone_de_adeline_geocoded_location'
      | 'sensor.iphone_de_adeline_app_version'
      | 'sensor.iphone_de_adeline_location_permission'
      | 'sensor.iphone_de_adeline_watch_battery'
      | 'sensor.iphone_de_adeline_watch_battery_state'
      | 'sensor.iphone_de_adeline_audio_output'
      | 'device_tracker.ipad'
      | 'sensor.ipad_bssid'
      | 'sensor.ipad_geocoded_location'
      | 'sensor.ipad_connection_type'
      | 'sensor.ipad_ssid'
      | 'sensor.ipad_last_update_trigger'
      | 'sensor.ipad_storage'
      | 'sensor.ipad_location_permission'
      | 'sensor.ipad_audio_output'
      | 'sensor.ipad_battery_level'
      | 'sensor.ipad_battery_state'
      | 'sensor.ipad_app_version'
      | 'binary_sensor.pixel_9_pro_xl_doze_mode'
      | 'binary_sensor.pixel_9_pro_xl_high_accuracy_mode'
      | 'binary_sensor.pixel_9_pro_xl_nfc_state'
      | 'binary_sensor.pixel_9_pro_xl_interactive'
      | 'device_tracker.pixel_9_pro_xl'
      | 'sensor.pixel_9_pro_xl_battery_level'
      | 'sensor.pixel_9_pro_xl_battery_state'
      | 'sensor.pixel_9_pro_xl_charger_type'
      | 'sensor.pixel_9_pro_xl_car_battery'
      | 'sensor.pixel_9_pro_xl_car_charging_status'
      | 'sensor.pixel_9_pro_xl_do_not_disturb_sensor'
      | 'sensor.pixel_9_pro_xl_high_accuracy_update_interval'
      | 'sensor.pixel_9_pro_xl_next_alarm'
      | 'switch.schedule_3d6d30'
      | 'sensor.speedtest_ping'
      | 'sensor.speedtest_download'
      | 'sensor.speedtest_upload'
      | 'calendar.ms365_calendrier'
      | 'calendar.ms365_anniversaires'
      | 'calendar.ms365_vacances_en_france'
      | 'sensor.openweathermap_weather'
      | 'sensor.openweathermap_dew_point'
      | 'sensor.openweathermap_temperature'
      | 'sensor.openweathermap_feels_like_temperature'
      | 'sensor.openweathermap_wind_speed'
      | 'sensor.openweathermap_wind_gust'
      | 'sensor.openweathermap_wind_bearing'
      | 'sensor.openweathermap_humidity'
      | 'sensor.openweathermap_pressure'
      | 'sensor.openweathermap_cloud_coverage'
      | 'sensor.openweathermap_rain'
      | 'sensor.openweathermap_snow'
      | 'sensor.openweathermap_precipitation_kind'
      | 'sensor.openweathermap_uv_index'
      | 'sensor.openweathermap_visibility'
      | 'sensor.openweathermap_condition'
      | 'sensor.openweathermap_weather_code'
      | 'weather.openweathermap'
      | 'binary_sensor.chauffe_eau_sdb_heating_status_2'
      | 'binary_sensor.chauffe_eau_sdb_absence_mode_2'
      | 'binary_sensor.chauffe_eau_sdb_boost_mode_2'
      | 'binary_sensor.chauffe_eau_sdb_manual_mode_2'
      | 'number.chauffe_eau_sdb_expected_number_of_shower_2'
      | 'number.chauffe_eau_sdb_target_temperature_2'
      | 'number.chauffe_eau_sdb_water_target_temperature_2'
      | 'sensor.chauffe_eau_sdb_bottom_tank_water_temperature_2'
      | 'sensor.chauffe_eau_sdb_control_water_target_temperature_2'
      | 'sensor.chauffe_eau_sdb_expected_number_of_shower_2'
      | 'sensor.chauffe_eau_sdb_number_of_shower_remaining_2'
      | 'sensor.chauffe_eau_sdb_warm_water_remaining_2'
      | 'sensor.chauffe_eau_sdb_electric_power_consumption_2'
      | 'sensor.chauffe_eau_sdb_modbuslink_1_2_electric_energy_consumption_2'
      | 'water_heater.chauffe_eau_sdb_2'
      | 'sensor.adguard_home_requetes_dns'
      | 'sensor.adguard_home_navigation_securisee_bloquee'
      | 'ai_task.google_ai_task'
      | 'conversation.google_generative_ai'
      | 'sensor.adguard_home_requetes_dns_bloquees'
      | 'switch.adguard_home_protection'
      | 'stt.google_ai_stt'
      | 'sensor.adguard_home_taux_de_requetes_dns_bloquees'
      | 'tts.google_ai_tts'
      | 'sensor.adguard_home_controle_parental_bloque'
      | 'switch.adguard_home_controle_parental'
      | 'sensor.adguard_home_recherches_securisees_appliquees'
      | 'sensor.adguard_home_vitesse_de_traitement_moyenne'
      | 'switch.adguard_home_recherche_securisee'
      | 'binary_sensor.borne_tesla_probleme'
      | 'select.borne_tesla_etat_initial'
      | 'select.borne_tesla_mode_d_eclairage'
      | 'switch.adguard_home_navigation_securisee'
      | 'lock.borne_tesla_securite_enfant'
      | 'sensor.borne_tesla_courant_2'
      | 'sensor.borne_tesla_puissance_2'
      | 'sensor.borne_tesla_tension_2'
      | 'sensor.borne_tesla_temperature'
      | 'switch.borne_tesla'
      | 'switch.adguard_home_filtrage'
      | 'switch.adguard_home_journal_des_requetes'
      | 'time.borne_tesla_minuteur'
      | 'select.din_panneaux_solaire_etat_initial'
      | 'select.din_panneaux_solaire_mode_d_eclairage'
      | 'binary_sensor.rte_tempo_heures_creuses'
      | 'sensor.din_panneaux_solaire_courant'
      | 'sensor.din_panneaux_solaire_puissance'
      | 'sensor.din_panneaux_solaire_tension'
      | 'binary_sensor.din_panneaux_solaire_probleme'
      | 'binary_sensor.din_panneaux_solaire_online'
      | 'lock.din_panneaux_solaire_securite_enfant'
      | 'switch.din_panneaux_solaire'
      | 'time.din_panneaux_solaire_minuteur'
      | 'climate.pellet'
      | 'button.s95qr_185_favorite_current_song'
      | 'media_player.lg_speaker_s95qr_2'
      | 'button.freebox_player_pop_favorite_current_song'
      | 'media_player.freebox_player_pop_4'
      | 'button.maison_favorite_current_song'
      | 'media_player.maison_2'
      | 'button.salon_favorite_current_song'
      | 'media_player.salon_2'
      | 'button.television_chambre_favorite_current_song'
      | 'media_player.chambre_amis_2'
      | 'button.reveil_favorite_current_song'
      | 'media_player.reveil_2'
      | 'sensor.local_ip'
      | 'button.t10_reinitialiser_la_carte'
      | 'select.t10_mode'
      | 'sensor.panneaux_solaire_energie_totale'
      | 'sensor.panneaux_solaire_courant'
      | 'sensor.panneaux_solaire_puissance'
      | 'sensor.panneaux_solaire_tension'
      | 'sensor.borne_tesla_energie_totale'
      | 'sensor.t10_surface_de_nettoyage_totale'
      | 'sensor.t10_temps_total_de_nettoyage'
      | 'switch.recharge_voiture_securite_enfants'
      | 'switch.recharge_voiture_switch'
      | 'switch.borne_tesla_securite_enfants'
      | 'switch.borne_tesla_switch'
      | 'vacuum.t10'
      | 'update.swipe_card_update'
      | 'update.mushroom_update'
      | 'update.flower_card_update'
      | 'update.apexcharts_card_update'
      | 'update.petkit_smart_devices_update'
      | 'update.xiaomi_miot_auto_update'
      | 'update.google_photos_update'
      | 'update.button_card_update'
      | 'update.bar_card_update'
      | 'update.navbar_card_update'
      | 'update.search_card_update'
      | 'update.dashcast_update'
      | 'update.microsoft_365_calendar_update'
      | 'update.qr_code_generator_card_update'
      | 'update.rte_tempo_update'
      | 'update.mini_graph_card_update'
      | 'update.passive_ble_monitor_integration_update'
      | 'update.stack_in_card_update'
      | 'update.bubble_card_update'
      | 'update.haier_hon_update'
      | 'update.weather_card_update'
      | 'update.decluttering_card_update'
      | 'update.layout_card_update'
      | 'update.fontawesome_update'
      | 'update.honeywell_smb_card_update'
      | 'update.sidebar_card_update'
      | 'update.mysmart_frigate_events_card_update'
      | 'update.webrtc_camera_update'
      | 'update.global_mod_update'
      | 'update.hourly_weather_card_update'
      | 'update.calendar_card_pro_update'
      | 'update.paper_buttons_row_update'
      | 'update.smartlife_update'
      | 'update.kiosk_mode_update'
      | 'update.light_entity_card_update'
      | 'update.frigate_card_update'
      | 'update.ingress_webpage_card_update'
      | 'update.auto_entities_update'
      | 'update.ui_lovelace_minimalist_update'
      | 'update.hacs_update'
      | 'update.scheduler_component_update'
      | 'update.flexible_horseshoe_card_for_lovelace_update'
      | 'update.my_cards_bundle_update'
      | 'update.solcast_pv_forecast_update'
      | 'update.vacuum_card_update'
      | 'update.google_find_my_device_update'
      | 'update.clock_weather_card_update'
      | 'update.govee_update'
      | 'update.alarmo_update'
      | 'update.vertical_stack_in_card_update'
      | 'update.edilkamin_update'
      | 'update.mammotion_update'
      | 'update.google_home_update'
      | 'update.simple_tabs_card_update'
      | 'update.scene_presets_update'
      | 'update.waste_collection_schedule_update'
      | 'update.openplantbook_update'
      | 'update.home_assistant_plant_update'
      | 'update.local_tuya_update'
      | 'update.power_flow_card_plus_update'
      | 'update.simple_weather_card_update'
      | 'update.local_conditional_card_update'
      | 'update.tuya_local_update'
      | 'update.spook_your_homie_update'
      | 'update.frosted_glass_theme_update'
      | 'update.c_a_f_e_update'
      | 'update.zendure_home_assistant_integration_update'
      | 'update.digital_clock_update'
      | 'update.week_planner_card_update'
      | 'update.scheduler_card_update'
      | 'update.browser_mod_update'
      | 'update.frigate_update_2'
      | 'update.xiaomi_gateway_3_update'
      | 'update.mini_media_player_update'
      | 'update.state_switch_update'
      | 'update.wallpanel_update'
      | 'update.bubble_card_tools_update'
      | 'update.card_mod_update'
      | 'select.solcast_pv_forecast_utiliser_le_champ_de_prevision'
      | 'sensor.solcast_pv_forecast_api_utilisee'
      | 'sensor.solcast_pv_forecast_limite_api'
      | 'sensor.solcast_pv_forecast_previsions_heure_actuel'
      | 'sensor.solcast_pv_forecast_previsions_pour_la_prochaine_heure'
      | 'sensor.solcast_pv_forecast_previsions_de_production_restantes_aujourd_hui'
      | 'sensor.solcast_pv_forecast_derniere_interrogation_de_l_api'
      | 'sensor.solcast_pv_forecast_heure_du_pic_aujourd_hui'
      | 'sensor.solcast_pv_forecast_heure_du_pic_demain'
      | 'sensor.solcast_pv_forecast_previsions_du_pic_aujourd_hui'
      | 'sensor.solcast_pv_forecast_previsions_du_pic_pour_demain'
      | 'sensor.solcast_pv_forecast_puissance_maintenant'
      | 'sensor.solcast_pv_forecast_puissance_en_1_heure'
      | 'sensor.solcast_pv_forecast_puissance_en_30_minutes'
      | 'sensor.solcast_pv_forecast_previsions_pour_aujourd_hui'
      | 'sensor.solcast_pv_forecast_previsions_pour_demain'
      | 'sensor.solcast_pv_forecast_ensemble_de_limites_strictes'
      | 'sensor.maison'
      | 'wake_word.openwakeword'
      | 'sensor.zendure_total_energy_2'
      | 'sensor.energie_solaire_produite'
      | 'weather.forecast_maison'
      | 'sensor.menneville_uv'
      | 'sensor.menneville_daily_precipitation'
      | 'sensor.menneville_cloud_cover'
      | 'sensor.menneville_humidity'
      | 'sensor.menneville_next_rain'
      | 'sensor.62_weather_alert'
      | 'sensor.menneville_rain_chance'
      | 'sensor.menneville_snow_chance'
      | 'sensor.menneville_freeze_chance'
      | 'weather.menneville'
      | 'sensor.chibi_derniere_mesure_de_poids'
      | 'sensor.chibi_duree_derniere_utilisation'
      | 'sensor.chibi_derniere_litiere_utilisee'
      | 'sensor.chibi_date_derniere_utilisation'
      | 'sensor.chibi_petkit_puramax_2_etat_de_l_appareil'
      | 'sensor.chibi_petkit_puramax_2_rssi'
      | 'sensor.chibi_petkit_puramax_2_erreur'
      | 'sensor.chibi_petkit_puramax_2_niveau_litiere'
      | 'sensor.chibi_petkit_puramax_2_poids_litiere'
      | 'sensor.chibi_petkit_puramax_2_etat'
      | 'sensor.chibi_petkit_puramax_2_dernier_evenement'
      | 'sensor.chibi_petkit_puramax_2_odor_eliminator_n50_left_days'
      | 'sensor.chibi_petkit_puramax_2_nombre_d_utilisations'
      | 'sensor.chibi_petkit_puramax_2_utilisation_totale'
      | 'sensor.chibi_petkit_puramax_2_utilisation_moyenne'
      | 'sensor.chibi_petkit_puramax_2_derniere_utilisation_par'
      | 'sensor.le_smart_spray_erreur'
      | 'sensor.le_smart_spray_liquide_purificateur'
      | 'sensor.le_smart_spray_battery'
      | 'sensor.le_smart_spray_battery_voltage'
      | 'binary_sensor.chibi_petkit_puramax_2_manque_de_litiere'
      | 'binary_sensor.chibi_petkit_puramax_2_alimentation'
      | 'binary_sensor.chibi_petkit_puramax_2_bac_a_dechets_plein'
      | 'binary_sensor.chibi_petkit_puramax_2_presence_bac_a_dechets'
      | 'binary_sensor.chibi_petkit_puramax_2_toilet_occupied'
      | 'binary_sensor.chibi_petkit_puramax_2_frequent_use_detection'
      | 'binary_sensor.chibi_petkit_puramax_2_weight_error'
      | 'binary_sensor.le_smart_spray_light'
      | 'binary_sensor.le_smart_spray_spray'
      | 'binary_sensor.le_smart_spray_manque_de_liquide_desodorisant'
      | 'switch.chibi_petkit_puramax_2_affichage'
      | 'switch.chibi_petkit_puramax_2_verrouillage_enfant'
      | 'switch.chibi_petkit_puramax_2_ne_pas_deranger'
      | 'switch.chibi_petkit_puramax_2_notif_manque_liquide_purificateur'
      | 'switch.chibi_petkit_puramax_2_nettoyage_automatique'
      | 'switch.chibi_petkit_puramax_2_eviter_nettoyage_repete'
      | 'switch.chibi_petkit_puramax_2_nettoyage_periodique'
      | 'switch.chibi_petkit_puramax_2_mode_chaton'
      | 'switch.chibi_petkit_puramax_2_poids_leger'
      | 'switch.chibi_petkit_puramax_2_alimentation'
      | 'switch.chibi_petkit_puramax_2_rotation_continue'
      | 'switch.chibi_petkit_puramax_2_nettoyage_profond'
      | 'switch.chibi_petkit_puramax_2_desodorisation_profonde'
      | 'switch.chibi_petkit_puramax_2_litter_saving'
      | 'switch.chibi_petkit_puramax_2_recouvrement_dechets'
      | 'switch.chibi_petkit_puramax_2_notif_bac_a_dechets_plein'
      | 'switch.chibi_petkit_puramax_2_notif_toilette_animal'
      | 'switch.chibi_petkit_puramax_2_notif_nettoyage_appareil'
      | 'switch.chibi_petkit_puramax_2_notif_on_n50_replacement_need'
      | 'switch.chibi_petkit_puramax_2_notif_manque_litiere'
      | 'switch.chibi_petkit_puramax_2_ai_soft_stool_detection'
      | 'light.chibi_petkit_puramax_2_lumiere'
      | 'button.chibi_petkit_puramax_2_nettoyer'
      | 'button.chibi_petkit_puramax_2_maintenance_demarrer'
      | 'button.chibi_petkit_puramax_2_maintenance_quitter'
      | 'button.chibi_petkit_puramax_2_vider_la_litiere'
      | 'button.chibi_petkit_puramax_2_action_pause'
      | 'button.chibi_petkit_puramax_2_action_continuer'
      | 'button.chibi_petkit_puramax_2_action_reinitialiser'
      | 'button.chibi_petkit_puramax_2_desodoriser'
      | 'button.chibi_petkit_puramax_2_reset_n50_odor_eliminator'
      | 'button.chibi_petkit_puramax_2_level_litter'
      | 'number.chibi_none'
      | 'number.chibi_petkit_puramax_2_delai_de_nettoyage'
      | 'select.chibi_petkit_puramax_2_type_de_litiere'
      | 'select.chibi_petkit_puramax_2_intervalle_anti_repetition_nettoyage'
      | 'media_player.maison'
      | 'media_player.salon'
      | 'number.orchidee_max_soil_moisture'
      | 'number.orchidee_min_soil_moisture'
      | 'number.orchidee_max_temperature'
      | 'number.orchidee_min_temperature'
      | 'number.orchidee_max_illuminance'
      | 'number.orchidee_min_illuminance'
      | 'number.orchidee_max_air_humidity'
      | 'number.orchidee_min_air_humidity'
      | 'number.orchidee_max_dli'
      | 'number.orchidee_min_dli'
      | 'number.lux_to_ppfd'
      | 'sensor.orchidee_illuminance'
      | 'sensor.orchidee_soil_moisture'
      | 'sensor.orchidee_temperature'
      | 'sensor.orchidee_air_humidity'
      | 'sensor.orchidee_ppfd_mol'
      | 'sensor.orchidee_total_ppfd_mol_integral'
      | 'sensor.orchidee_dli'
      | 'sensor.dli_24h'
      | 'plant.orchidee'
      | 'alarm_control_panel.alarmo'
      | 'button.homeassistant_restart'
      | 'button.homeassistant_reload'
      | 'button.ignore_all_issues'
      | 'button.unignore_all_issues'
      | 'event.repair'
      | 'sensor.air_quality'
      | 'sensor.alarm_control_panels'
      | 'sensor.areas'
      | 'sensor.automations'
      | 'sensor.binary_sensors'
      | 'sensor.buttons'
      | 'sensor.calendars'
      | 'sensor.cameras'
      | 'sensor.climate'
      | 'sensor.covers'
      | 'sensor.dates'
      | 'sensor.datetimes'
      | 'sensor.devices'
      | 'sensor.device_trackers'
      | 'sensor.entities'
      | 'sensor.fans'
      | 'sensor.humidifiers'
      | 'sensor.integrations'
      | 'sensor.custom_integrations'
      | 'sensor.input_booleans'
      | 'sensor.input_buttons'
      | 'sensor.input_datetimes'
      | 'sensor.input_numbers'
      | 'sensor.input_selects'
      | 'sensor.input_texts'
      | 'sensor.images'
      | 'sensor.lights'
      | 'sensor.locks'
      | 'sensor.media_players'
      | 'sensor.numbers'
      | 'sensor.persistent_notifications'
      | 'sensor.persons'
      | 'sensor.remotes'
      | 'sensor.scenes'
      | 'sensor.scripts'
      | 'sensor.selects'
      | 'sensor.sensors'
      | 'sensor.sirens'
      | 'sensor.suns'
      | 'sensor.stt'
      | 'sensor.switches'
      | 'sensor.texts'
      | 'sensor.times'
      | 'sensor.tts'
      | 'sensor.vacuums'
      | 'sensor.update'
      | 'sensor.water_heaters'
      | 'sensor.weather'
      | 'sensor.zones'
      | 'sensor.issues'
      | 'sensor.active_issues'
      | 'sensor.ignored_issues'
      | 'switch.cloud_alexa'
      | 'switch.cloud_alexa_report_state'
      | 'switch.cloud_google'
      | 'switch.cloud_google_report_state'
      | 'switch.cloud_remote'
      | 'sensor.sonnette_frigate_review_status'
      | 'sensor.salon_frigate_review_status'
      | 'sensor.couloir_frigate_review_status'
      | 'sensor.cuisine_review_status'
      | 'sensor.salon_frigate_cat_count'
      | 'sensor.salon_frigate_dog_count'
      | 'sensor.salon_frigate_person_count'
      | 'sensor.couloir_frigate_cat_count'
      | 'sensor.salon_frigate_all_count'
      | 'sensor.sonnette_frigate_cat_count'
      | 'sensor.sonnette_frigate_dog_count'
      | 'sensor.cuisine_cat_count'
      | 'sensor.couloir_frigate_person_count'
      | 'sensor.couloir_frigate_dog_count'
      | 'sensor.cuisine_dog_count'
      | 'sensor.sonnette_frigate_person_count'
      | 'sensor.cuisine_person_count'
      | 'sensor.salon_frigate_car_count'
      | 'sensor.sonnette_frigate_all_count'
      | 'sensor.couloir_frigate_all_count'
      | 'sensor.cuisine_all_count'
      | 'sensor.sonnette_frigate_car_count'
      | 'sensor.couloir_frigate_car_count'
      | 'sensor.cuisine_car_count'
      | 'sensor.salon_frigate_cat_active_count'
      | 'sensor.salon_frigate_dog_active_count'
      | 'sensor.salon_frigate_person_active_count'
      | 'sensor.couloir_frigate_cat_active_count'
      | 'sensor.salon_frigate_all_active_count'
      | 'sensor.sonnette_frigate_cat_active_count'
      | 'sensor.sonnette_frigate_dog_active_count'
      | 'sensor.cuisine_cat_active_count'
      | 'sensor.couloir_frigate_person_active_count'
      | 'sensor.couloir_frigate_dog_active_count'
      | 'sensor.cuisine_dog_active_count'
      | 'sensor.sonnette_frigate_person_active_count'
      | 'sensor.cuisine_person_active_count'
      | 'sensor.salon_frigate_car_active_count'
      | 'sensor.sonnette_frigate_all_active_count'
      | 'sensor.couloir_frigate_all_active_count'
      | 'sensor.cuisine_all_active_count'
      | 'sensor.sonnette_frigate_car_active_count'
      | 'sensor.couloir_frigate_car_active_count'
      | 'sensor.cuisine_car_active_count'
      | 'camera.cuisine'
      | 'camera.salon_frigate'
      | 'camera.couloir_frigate'
      | 'camera.sonnette_frigate'
      | 'camera.birdseye'
      | 'image.couloir_frigate_car'
      | 'image.cuisine_dog'
      | 'image.couloir_frigate_dog'
      | 'image.sonnette_frigate_person'
      | 'image.cuisine_person'
      | 'image.salon_frigate_car'
      | 'image.salon_frigate_cat'
      | 'image.salon_frigate_dog'
      | 'image.salon_frigate_person'
      | 'image.couloir_frigate_cat'
      | 'image.sonnette_frigate_car'
      | 'image.couloir_frigate_person'
      | 'image.cuisine_car'
      | 'image.sonnette_frigate_cat'
      | 'image.sonnette_frigate_dog'
      | 'image.cuisine_cat'
      | 'switch.cuisine_detect'
      | 'switch.cuisine_motion'
      | 'switch.cuisine_recordings'
      | 'switch.cuisine_snapshots'
      | 'switch.cuisine_review_alerts'
      | 'switch.cuisine_review_detections'
      | 'switch.salon_frigate_detect'
      | 'switch.salon_frigate_motion'
      | 'switch.salon_frigate_recordings'
      | 'switch.salon_frigate_snapshots'
      | 'switch.salon_frigate_review_alerts'
      | 'switch.salon_frigate_review_detections'
      | 'switch.couloir_frigate_detect'
      | 'switch.couloir_frigate_motion'
      | 'switch.couloir_frigate_recordings'
      | 'switch.couloir_frigate_snapshots'
      | 'switch.couloir_frigate_review_alerts'
      | 'switch.couloir_frigate_review_detections'
      | 'switch.sonnette_frigate_detect'
      | 'switch.sonnette_frigate_motion'
      | 'switch.sonnette_frigate_recordings'
      | 'switch.sonnette_frigate_snapshots'
      | 'switch.sonnette_frigate_review_alerts'
      | 'switch.sonnette_frigate_review_detections'
      | 'media_player.lg_speaker_s95qr'
      | 'binary_sensor.salon_frigate_cat_occupancy'
      | 'binary_sensor.salon_frigate_dog_occupancy'
      | 'binary_sensor.salon_frigate_person_occupancy'
      | 'binary_sensor.couloir_frigate_cat_occupancy'
      | 'binary_sensor.salon_frigate_all_occupancy'
      | 'binary_sensor.sonnette_frigate_cat_occupancy'
      | 'binary_sensor.sonnette_frigate_dog_occupancy'
      | 'binary_sensor.cuisine_cat_occupancy'
      | 'binary_sensor.couloir_frigate_person_occupancy'
      | 'binary_sensor.couloir_frigate_dog_occupancy'
      | 'binary_sensor.cuisine_dog_occupancy'
      | 'binary_sensor.sonnette_frigate_person_occupancy'
      | 'binary_sensor.cuisine_person_occupancy'
      | 'binary_sensor.salon_frigate_car_occupancy'
      | 'binary_sensor.sonnette_frigate_all_occupancy'
      | 'binary_sensor.couloir_frigate_all_occupancy'
      | 'binary_sensor.cuisine_all_occupancy'
      | 'binary_sensor.sonnette_frigate_car_occupancy'
      | 'binary_sensor.couloir_frigate_car_occupancy'
      | 'binary_sensor.cuisine_car_occupancy'
      | 'binary_sensor.sonnette_frigate_motion'
      | 'binary_sensor.salon_frigate_motion'
      | 'binary_sensor.couloir_frigate_motion'
      | 'binary_sensor.cuisine_motion'
      | 'update.frigate_server'
      | 'calendar.numeros_de_semaine'
      | 'calendar.planning'
      | 'calendar.planning_2'
      | 'calendar.calendrier_poubelles_menneville'
      | 'calendar.famille'
      | 'calendar.planning_3'
      | 'calendar.thomas_vigneron_outlook_com'
      | 'calendar.anniversaires'
      | 'number.kiki_perfume_amount'
      | 'sensor.kiki_fill'
      | 'sensor.kiki_perfume'
      | 'sensor.kiki_wi_fi_signal'
      | 'switch.kiki'
      | 'binary_sensor.redmi_pad_pro_kiosk_mode'
      | 'binary_sensor.redmi_pad_pro_plugged_in'
      | 'binary_sensor.redmi_pad_pro_device_admin'
      | 'button.redmi_pad_pro_restart_browser'
      | 'button.redmi_pad_pro_restart_device'
      | 'button.redmi_pad_pro_bring_to_foreground'
      | 'button.redmi_pad_pro_send_to_background'
      | 'button.redmi_pad_pro_load_start_url'
      | 'button.redmi_pad_pro_vider_le_cache_du_navigateur'
      | 'camera.redmi_pad_pro'
      | 'image.redmi_pad_pro_capture_d_ecran'
      | 'media_player.redmi_pad_pro'
      | 'notify.redmi_pad_pro_message_superpose'
      | 'notify.redmi_pad_pro_synthese_vocale'
      | 'number.redmi_pad_pro_screensaver_timer'
      | 'number.redmi_pad_pro_screensaver_brightness'
      | 'number.redmi_pad_pro_screen_off_timer'
      | 'number.redmi_pad_pro_screen_brightness'
      | 'sensor.redmi_pad_pro_batterie'
      | 'sensor.redmi_pad_pro_current_page'
      | 'sensor.redmi_pad_pro_screen_orientation'
      | 'sensor.redmi_pad_pro_foreground_app'
      | 'sensor.redmi_pad_pro_internal_storage_free_space'
      | 'sensor.redmi_pad_pro_internal_storage_total_space'
      | 'sensor.redmi_pad_pro_free_memory'
      | 'sensor.redmi_pad_pro_total_memory'
      | 'switch.redmi_pad_pro_screensaver'
      | 'switch.redmi_pad_pro_maintenance_mode'
      | 'switch.redmi_pad_pro_kiosk_lock'
      | 'switch.redmi_pad_pro_motion_detection'
      | 'switch.redmi_pad_pro_screen'
      | 'automation.nouvelle_automatisation'
      | 'automation.allume_alarme_si_plus_de_personne'
      | 'automation.desactiver_l_alarme_si_on_rentre'
      | 'automation.eteindre_des_appareils_quand_on_quitte_la_maison'
      | 'automation.quand_la_camera_est_armee'
      | 'automation.alarme_declenchee'
      | 'automation.allumer_alarme_nuit'
      | 'automation.desactiver_le_mode_nuit'
      | 'automation.alarme_s_active'
      | 'automation.alarme_est_desactive'
      | 'automation.detection_et_notification_du_niveau_de_batterie_faible_pour_tous_les_capteurs_de_batterie'
      | 'automation.sonnette_sonne'
      | 'automation.lancer_le_lavage_des_segments'
      | 'automation.desactiver_snapshot_au_demarrage_d_home_assistant'
      | 'automation.chauffe_max_avant_jour_rouge'
      | 'automation.maintenir_eau_chaude_minimale'
      | 'automation.remettre_chauffe_eau_en_mode_normal_si_pas_jour_rouge_le_lendemain'
      | 'automation.gestion_des_notifications_via_id'
      | 'automation.reset_notifications_dashboard'
      | 'automation.eteindre_tablette_quand_personne'
      | 'automation.allumer_ecran_quand_on_revient'
      | 'automation.frigate_notif_ios'
      | 'automation.gerer_ecran_tablette_selon_luminosite'
      | 'automation.ambilight_par_rapport_a_la_freebox'
      | 'automation.allumer_lumiere_cellier_avec_presence_et_heure'
      | 'automation.eteindre_lumiere_cellier_apres_absence'
      | 'automation.allumer_lumiere_route_a_la_sonnette_apres_coucher_du_soleil'
      | 'automation.allumer_lumiere_route_a_louverture_de_la_porte_apres_coucher_du_soleil'
      | 'automation.tempo_notifications_matin_veille'
      | 'automation.alarme_en_suspense'
      | 'automation.maj_forecast_meteo'
      | 'automation.boite_aux_lettres_notification_courrier'
      | 'automation.detection_humain_devant_bal'
      | 'automation.analyse_courrier_bal'
      | 'automation.charge_nuit_zendure'
      | 'automation.alerte_incendie_notification_critique'
      | 'automation.charge_nocturne_zendure_dynamique_03h'
      | 'automation.lancer_mammotion_si_herbe_seche'
      | 'automation.alarme_notification_discord_avec_camera'
      | 'automation.gerer_le_chauffage_selon_la_presence'
      | 'automation.notification_sortir_les_poubelles'
      | 'automation.parfum_kiki_cycle_de_presence'
      | 'automation.parfum_kiki_accueil_retour_maison'
      | 'automation.test_manuel_forcer_charge_zendure_500w'
      | 'automation.charge_nocturne_zendure_dynamique_version_mathematique_tampon_matin'
      | 'automation.test_charge_zendure_simulation_hiver'
      | 'binary_sensor.lave_linge_child_lock'
      | 'binary_sensor.lave_linge_remote_control'
      | 'binary_sensor.lave_linge_puissance'
      | 'number.lave_linge_rinse_cycles'
      | 'select.lave_linge'
      | 'select.lave_linge_detergent_dispense_amount'
      | 'select.lave_linge_flexible_compartment_dispense_amount'
      | 'select.lave_linge_spin_level'
      | 'select.lave_linge_water_temperature'
      | 'sensor.lave_linge_energy'
      | 'sensor.lave_linge_power'
      | 'sensor.lave_linge_deltaenergy'
      | 'sensor.lave_linge_powerenergy'
      | 'sensor.lave_linge_energysaved'
      | 'sensor.lave_linge_washer_machine_state'
      | 'sensor.lave_linge_washer_job_state'
      | 'sensor.lave_linge_washer_completion_time'
      | 'sensor.lave_linge_water_consumption'
      | 'switch.lave_linge_bubble_soak'
      | 'switch.lave_linge'
      | 'media_player.chambre_amis'
      | 'media_player.reveil'
      | 'binary_sensor.edilkamin_8c_4b_14_98_c9_b0_tank_binary_sensor'
      | 'binary_sensor.edilkamin_8c_4b_14_98_c9_b0_check_binary_sensor'
      | 'climate.edilkamin_8c_4b_14_98_c9_b0_climate'
      | 'fan.edilkamin_8c_4b_14_98_c9_b0_fan1'
      | 'fan.edilkamin_8c_4b_14_98_c9_b0_fan2'
      | 'fan.edilkamin_8c_4b_14_98_c9_b0_fan3'
      | 'sensor.edilkamin_8c_4b_14_98_c9_b0_temperature'
      | 'sensor.edilkamin_8c_4b_14_98_c9_b0_fan1_sensor'
      | 'sensor.edilkamin_8c_4b_14_98_c9_b0_nb_alarms_sensor'
      | 'sensor.edilkamin_8c_4b_14_98_c9_b0_actual_power'
      | 'sensor.operational_phase'
      | 'sensor.autonomy'
      | 'sensor.power_ons'
      | 'sensor.edilkamin_8c_4b_14_98_c9_b0_fan2_sensor'
      | 'sensor.edilkamin_8c_4b_14_98_c9_b0_fan3_sensor'
      | 'switch.edilkamin_8c_4b_14_98_c9_b0_airekare_switch'
      | 'switch.edilkamin_8c_4b_14_98_c9_b0_relax_switch'
      | 'switch.edilkamin_8c_4b_14_98_c9_b0_chrono_mode_switch'
      | 'switch.stand_by_mode'
      | 'sensor.te31njn5n258221_l1_freq'
      | 'sensor.te31njn5n258221_l1_u'
      | 'sensor.te31njn5n258221_l1_i'
      | 'sensor.te31njn5n258221_l1_pf'
      | 'sensor.te31njn5n258221_l1_p'
      | 'sensor.te31njn5n258221_l1_q'
      | 'sensor.te31njn5n258221_l2_freq'
      | 'sensor.te31njn5n258221_l2_u'
      | 'sensor.te31njn5n258221_l2_i'
      | 'sensor.te31njn5n258221_l2_pf'
      | 'sensor.te31njn5n258221_l2_p'
      | 'sensor.te31njn5n258221_l2_q'
      | 'sensor.te31njn5n258221_l3_freq'
      | 'sensor.te31njn5n258221_l3_u'
      | 'sensor.te31njn5n258221_l3_i'
      | 'sensor.te31njn5n258221_l3_pf'
      | 'sensor.te31njn5n258221_l3_p'
      | 'sensor.te31njn5n258221_l3_q'
      | 'sensor.te31njn5n258221_l1_sub_freq'
      | 'sensor.te31njn5n258221_l1_sub_u'
      | 'sensor.te31njn5n258221_l1_sub_i'
      | 'sensor.te31njn5n258221_l1_sub_pf'
      | 'sensor.te31njn5n258221_l1_sub_p'
      | 'sensor.te31njn5n258221_l1_sub_q'
      | 'sensor.te31njn5n258221_l2_sub_freq'
      | 'sensor.te31njn5n258221_l2_sub_u'
      | 'sensor.te31njn5n258221_l2_sub_i'
      | 'sensor.te31njn5n258221_l2_sub_pf'
      | 'sensor.te31njn5n258221_l2_sub_p'
      | 'sensor.te31njn5n258221_l2_sub_q'
      | 'sensor.te31njn5n258221_l3_sub_freq'
      | 'sensor.te31njn5n258221_l3_sub_u'
      | 'sensor.te31njn5n258221_l3_sub_i'
      | 'sensor.te31njn5n258221_l3_sub_pf'
      | 'sensor.te31njn5n258221_l3_sub_p'
      | 'sensor.te31njn5n258221_l3_sub_q'
      | 'binary_sensor.nas_thomas_etat_de_securite'
      | 'binary_sensor.nas_thomas_drive_1_depassement_du_nombre_maximal_de_secteurs_defectueux'
      | 'binary_sensor.nas_thomas_drive_1_en_dessous_de_la_duree_de_vie_restante_minimale'
      | 'binary_sensor.nas_thomas_drive_2_depassement_du_nombre_maximal_de_secteurs_defectueux'
      | 'binary_sensor.nas_thomas_drive_2_en_dessous_de_la_duree_de_vie_restante_minimale'
      | 'button.nas_thomas_reboot'
      | 'button.nas_thomas_shutdown'
      | 'sensor.nas_thomas_utilisation_du_processeur_utilisateur'
      | 'sensor.nas_thomas_utilisation_du_processeur_totale'
      | 'sensor.nas_thomas_charge_moyenne_du_processeur_5_min'
      | 'sensor.nas_thomas_charge_moyenne_du_processeur_15_min'
      | 'sensor.nas_thomas_utilisation_de_la_memoire_reelle'
      | 'sensor.nas_thomas_memoire_disponible_swap'
      | 'sensor.nas_thomas_memoire_disponible_reelle'
      | 'sensor.nas_thomas_memoire_totale_swap'
      | 'sensor.nas_thomas_memoire_totale_reelle'
      | 'sensor.nas_thomas_debit_de_transfert'
      | 'sensor.nas_thomas_debit_de_telechargement'
      | 'sensor.nas_thomas_volume_2_etat'
      | 'sensor.nas_thomas_volume_2_espace_utilise'
      | 'sensor.nas_thomas_volume_2_volume_utilise'
      | 'sensor.nas_thomas_volume_2_temperature_moyenne_du_disque'
      | 'sensor.nas_thomas_volume_1_etat'
      | 'sensor.nas_thomas_volume_1_espace_utilise'
      | 'sensor.nas_thomas_volume_1_volume_utilise'
      | 'sensor.nas_thomas_volume_1_temperature_moyenne_du_disque'
      | 'sensor.nas_thomas_drive_1_etat'
      | 'sensor.nas_thomas_drive_1_temperature'
      | 'sensor.nas_thomas_drive_2_etat'
      | 'sensor.nas_thomas_drive_2_temperature'
      | 'sensor.nas_thomas_temperature'
      | 'update.nas_thomas_mise_a_jour_dsm'
      | 'binary_sensor.zigbee2mqtt_bridge_connection_state'
      | 'binary_sensor.zigbee2mqtt_bridge_connection_state_2'
      | 'binary_sensor.detecteur_presence_cellier_occupancy'
      | 'binary_sensor.vibration_baie_vibration'
      | 'binary_sensor.ouverture_porte_couloir_contact'
      | 'binary_sensor.ouverture_porte_couloir_battery_low'
      | 'binary_sensor.ouverture_porte_couloir_tamper'
      | 'binary_sensor.presence_couloir_occupancy'
      | 'binary_sensor.detecteur_chaleur_smoke'
      | 'binary_sensor.detecteur_chaleur_battery_low'
      | 'binary_sensor.detecteur_chaleur_test'
      | 'binary_sensor.detecteur_chaleur_fault'
      | 'binary_sensor.porte_entree_contact'
      | 'binary_sensor.porte_entree_battery_low'
      | 'binary_sensor.porte_entree_tamper'
      | 'button.zigbee2mqtt_bridge_restart'
      | 'button.prise_pc_thomas_identify'
      | 'cover.volet_cellier'
      | 'cover.volet_bureau'
      | 'cover.volet_chambre'
      | 'cover.volet_chambre_invites'
      | 'cover.volet_salon'
      | 'cover.volet_sam_2'
      | 'cover.volet_baie_salon'
      | 'cover.volet_sam_1'
      | 'cover.volet_cuisine'
      | 'light.bandeau_led_cuisine'
      | 'number.prise_pc_thomas_countdown'
      | 'number.0xd44867fffe2a93ac_motion_timeout'
      | 'number.temperature_chambre_temperature_calibration'
      | 'number.temperature_chambre_humidity_calibration'
      | 'number.vibration_baie_sensitivity'
      | 'number.presence_couloir_motion_timeout'
      | 'number.detecteur_chaleur_max_duration'
      | 'number.temperature_pellet_comfort_temperature_min'
      | 'number.temperature_pellet_comfort_temperature_max'
      | 'number.temperature_pellet_comfort_humidity_min'
      | 'number.temperature_pellet_comfort_humidity_max'
      | 'number.temperature_pellet_temperature_calibration'
      | 'number.temperature_pellet_humidity_calibration'
      | 'select.zigbee2mqtt_bridge_log_level'
      | 'select.volet_cellier_external_trigger_mode'
      | 'select.volet_cellier_motor_travel_calibration_action'
      | 'select.volet_bureau_external_trigger_mode'
      | 'select.volet_bureau_motor_travel_calibration_action'
      | 'select.volet_chambre_external_trigger_mode'
      | 'select.volet_chambre_motor_travel_calibration_action'
      | 'select.volet_chambre_invites_external_trigger_mode'
      | 'select.volet_chambre_invites_motor_travel_calibration_action'
      | 'select.prise_pc_thomas_power_outage_memory'
      | 'select.prise_pc_thomas_indicator_mode'
      | 'select.prise_pc_thomas_switch_type_button'
      | 'select.lumiere_cellier_power_on_behavior'
      | 'select.temperature_chambre_temperature_unit'
      | 'select.lumiere_route_power_on_behavior'
      | 'select.volet_salon_external_trigger_mode'
      | 'select.volet_salon_motor_travel_calibration_action'
      | 'select.volet_sam_2_external_trigger_mode'
      | 'select.volet_sam_2_motor_travel_calibration_action'
      | 'select.volet_baie_salon_external_trigger_mode'
      | 'select.volet_baie_salon_motor_travel_calibration_action'
      | 'select.temperature_pellet_temperature_units'
      | 'select.thermostat_pellet_power_on_behavior'
      | 'select.volet_sam_1_motor_travel_calibration_action'
      | 'select.volet_sam_1_external_trigger_mode'
      | 'select.volet_cuisine_motor_travel_calibration_action'
      | 'select.volet_cuisine_external_trigger_mode'
      | 'sensor.pcthomas_pcthomas_temp_raturegpu'
      | 'sensor.thomas_temp_raturegpu'
      | 'sensor.zigbee2mqtt_bridge_version'
      | 'sensor.volet_cellier_motor_travel_calibration_status'
      | 'sensor.volet_cellier_motor_run_status'
      | 'sensor.volet_bureau_motor_travel_calibration_status'
      | 'sensor.volet_bureau_motor_run_status'
      | 'sensor.volet_chambre_motor_travel_calibration_status'
      | 'sensor.volet_chambre_motor_run_status'
      | 'sensor.volet_chambre_invites_motor_travel_calibration_status'
      | 'sensor.volet_chambre_invites_motor_run_status'
      | 'sensor.prise_pc_thomas_power'
      | 'sensor.prise_pc_thomas_current'
      | 'sensor.prise_pc_thomas_voltage'
      | 'sensor.prise_pc_thomas_energy'
      | 'sensor.detecteur_presence_cellier_illumination'
      | 'sensor.0xd44867fffe2a93ac_battery'
      | 'sensor.0xd44867fffe2a93ac_voltage'
      | 'sensor.temperature_chambre_temperature'
      | 'sensor.temperature_chambre_humidity'
      | 'sensor.temperature_chambre_battery'
      | 'sensor.vibration_baie_battery'
      | 'sensor.vibration_baie_device_temperature'
      | 'sensor.vibration_baie_strength'
      | 'sensor.vibration_baie_angle_x'
      | 'sensor.vibration_baie_angle_y'
      | 'sensor.vibration_baie_angle_z'
      | 'sensor.vibration_baie_x_axis'
      | 'sensor.vibration_baie_y_axis'
      | 'sensor.vibration_baie_z_axis'
      | 'sensor.vibration_baie_voltage'
      | 'sensor.ouverture_porte_couloir_battery'
      | 'sensor.ouverture_porte_couloir_voltage'
      | 'sensor.presence_couloir_illumination'
      | 'sensor.presence_couloir_battery'
      | 'sensor.presence_couloir_voltage'
      | 'sensor.volet_salon_motor_travel_calibration_status'
      | 'sensor.volet_salon_motor_run_status'
      | 'sensor.volet_sam_2_motor_travel_calibration_status'
      | 'sensor.volet_sam_2_motor_run_status'
      | 'sensor.volet_baie_salon_motor_travel_calibration_status'
      | 'sensor.volet_baie_salon_motor_run_status'
      | 'sensor.detecteur_chaleur_reliability'
      | 'sensor.detecteur_chaleur_temperature'
      | 'sensor.detecteur_chaleur_battery'
      | 'sensor.detecteur_chaleur_voltage'
      | 'sensor.temperature_pellet_battery'
      | 'sensor.temperature_pellet_temperature'
      | 'sensor.temperature_pellet_humidity'
      | 'sensor.volet_sam_1_motor_travel_calibration_status'
      | 'sensor.volet_sam_1_motor_run_status'
      | 'sensor.porte_entree_battery'
      | 'sensor.porte_entree_voltage'
      | 'sensor.volet_cuisine_motor_travel_calibration_status'
      | 'sensor.volet_cuisine_motor_run_status'
      | 'switch.zigbee2mqtt_bridge_permit_join'
      | 'switch.prise_pc_thomas'
      | 'switch.prise_pc_thomas_child_lock'
      | 'switch.lumiere_cellier'
      | 'switch.lumiere_route'
      | 'switch.detecteur_chaleur_alarm'
      | 'switch.thermostat_pellet'
      | 'update.volet_cellier'
      | 'update.volet_bureau'
      | 'update.volet_chambre'
      | 'update.volet_chambre_invites'
      | 'update.prise_pc_thomas'
      | 'update.lumiere_cellier'
      | 'update.0xd44867fffe2a93ac'
      | 'update.lumiere_route'
      | 'update.ouverture_porte_couloir'
      | 'update.presence_couloir'
      | 'update.volet_salon'
      | 'update.volet_sam_2'
      | 'update.volet_baie_salon'
      | 'update.detecteur_chaleur'
      | 'update.temperature_pellet'
      | 'update.thermostat_pellet'
      | 'update.volet_sam_1'
      | 'update.porte_entree'
      | 'update.volet_cuisine'
      | 'select.zendure_manager_operation'
      | 'select.solarflow_2400_ac_fuse_group'
      | 'select.solarflow_2400_ac_ac_mode'
      | 'select.solarflow_2400_ac_connection'
      | 'sensor.zendure_manager_operation_state'
      | 'sensor.zendure_manager_available_kwh'
      | 'sensor.zendure_manager_power'
      | 'sensor.solarflow_2400_ac_soc_status'
      | 'sensor.solarflow_2400_ac_soc_limit'
      | 'sensor.solarflow_2400_ac_electric_level'
      | 'sensor.solarflow_2400_ac_grid_input_power'
      | 'sensor.solarflow_2400_ac_solar_input_power'
      | 'sensor.solarflow_2400_ac_output_pack_power'
      | 'sensor.solarflow_2400_ac_pack_input_power'
      | 'sensor.solarflow_2400_ac_output_home_power'
      | 'sensor.solarflow_2400_ac_bat_in_out'
      | 'sensor.solarflow_2400_ac_available_kwh'
      | 'sensor.solarflow_2400_ac_connection_status'
      | 'sensor.solarflow_2400_ac_remaining_time'
      | 'sensor.solarflow_2400_ac_next_calibration'
      | 'sensor.solarflow_2400_ac_aggr_charge_total'
      | 'sensor.solarflow_2400_ac_aggr_discharge_total'
      | 'sensor.solarflow_2400_ac_aggr_grid_input_power_total'
      | 'sensor.solarflow_2400_ac_aggr_output_home_total'
      | 'sensor.solarflow_2400_ac_aggr_solar_total'
      | 'sensor.solarflow_2400_ac_switch_count'
      | 'sensor.solarflow_2400_ac_grid_off_power'
      | 'sensor.solarflow_2400_ac_aggr_grid_off_power_total'
      | 'number.zendure_manager_manual_power'
      | 'number.solarflow_2400_ac_output_limit'
      | 'number.solarflow_2400_ac_input_limit'
      | 'number.solarflow_2400_ac_min_soc'
      | 'number.solarflow_2400_ac_soc_set'
      | 'binary_sensor.solarflow_2400_ac_pass'
      | 'binary_sensor.solarflow_2400_ac_heat_state'
      | 'binary_sensor.solarflow_2400_ac_hems_state'
      | 'button.cuisine_reboot'
      | 'button.cuisine_set_system_date_and_time'
      | 'binary_sensor.cuisine_cell_motion_detection'
      | 'binary_sensor.cuisine_face_detection_2'
      | 'binary_sensor.cuisine_person_detection_2'
      | 'binary_sensor.cuisine_vehicle_detection_2'
      | 'binary_sensor.cuisine_pet_detection_2'
      | 'binary_sensor.cuisine_motion_alarm'
      | 'binary_sensor.cuisine_visitor_detection'
      | 'binary_sensor.cuisine_package_detection'
      | 'binary_sensor.cuisine_pet_detection'
      | 'binary_sensor.cuisine_vehicle_detection'
      | 'binary_sensor.cuisine_face_detection'
      | 'binary_sensor.cuisine_person_detection'
      | 'binary_sensor.cuisine_motion_alarm_2'
      | 'switch.cuisine_autofocus'
      | 'switch.cuisine_ir_lamp'
      | 'switch.cuisine_wiper'
      | 'binary_sensor.roborock_qrevo_maxv_sechage_de_la_serpilliere'
      | 'binary_sensor.roborock_qrevo_maxv_serpilliere_fixee'
      | 'binary_sensor.roborock_qrevo_maxv_reservoir_d_eau_fixe'
      | 'binary_sensor.roborock_qrevo_maxv_penurie_d_eau'
      | 'binary_sensor.rocky_balboa_dock_dirty_water_box'
      | 'binary_sensor.rocky_balboa_dock_clean_water_box'
      | 'binary_sensor.roborock_qrevo_maxv_nettoyage'
      | 'binary_sensor.rocky_balboa_en_charge'
      | 'image.rocky_balboa_map_0'
      | 'number.roborock_qrevo_maxv_volume'
      | 'select.roborock_qrevo_maxv_intensite_de_frottement'
      | 'select.roborock_qrevo_maxv_parcours_de_lavage_de_sol'
      | 'select.rocky_balboa_dock_empty_mode'
      | 'select.roborock_qrevo_maxv_selected_map'
      | 'sensor.roborock_qrevo_maxv_temps_restant_brosse_principale'
      | 'sensor.roborock_qrevo_maxv_temps_restant_brosse_laterale'
      | 'sensor.roborock_qrevo_maxv_temps_restant_filtre'
      | 'sensor.rocky_balboa_dock_strainer_time_left'
      | 'sensor.roborock_qrevo_maxv_temps_restant_capteurs'
      | 'sensor.roborock_qrevo_maxv_duree_de_nettoyage'
      | 'sensor.roborock_qrevo_maxv_duree_totale_de_nettoyage'
      | 'sensor.rocky_balboa_nombre_total_de_nettoyages'
      | 'sensor.roborock_qrevo_maxv_etat'
      | 'sensor.roborock_qrevo_maxv_surface_de_nettoyage'
      | 'sensor.roborock_qrevo_maxv_surface_de_nettoyage_totale'
      | 'sensor.roborock_qrevo_maxv_erreur_aspirateur'
      | 'sensor.roborock_qrevo_maxv_batterie'
      | 'sensor.roborock_qrevo_maxv_debut_du_dernier_nettoyage'
      | 'sensor.roborock_qrevo_maxv_fin_du_dernier_nettoyage'
      | 'sensor.roborock_qrevo_maxv_nettoyage_en_cours'
      | 'sensor.roborock_qrevo_maxv_erreur_de_dock'
      | 'sensor.roborock_qrevo_maxv_temps_de_sechage_de_la_serpilliere_restant'
      | 'sensor.rocky_balboa_current_room'
      | 'switch.roborock_qrevo_maxv_securite_enfant'
      | 'switch.roborock_qrevo_maxv_ne_pas_deranger'
      | 'time.roborock_qrevo_maxv_ne_pas_deranger_debut'
      | 'time.roborock_qrevo_maxv_ne_pas_deranger_fin'
      | 'vacuum.roborock_qrevo_maxv'
      | 'button.rocky_balboa_test'
      | 'button.rocky_balboa_nettoyage_complet'
      | 'calendar.rte_tempo_calendrier'
      | 'sensor.rte_tempo_couleur_actuelle'
      | 'sensor.rte_tempo_couleur_actuelle_visuel'
      | 'sensor.rte_tempo_prochaine_couleur'
      | 'sensor.rte_tempo_prochaine_couleur_visuel'
      | 'sensor.rte_tempo_prochaine_couleur_changement'
      | 'sensor.rte_tempo_cycle_jours_restants_bleu'
      | 'sensor.rte_tempo_cycle_jours_restants_blanc'
      | 'sensor.rte_tempo_cycle_jours_restants_rouge'
      | 'sensor.rte_tempo_cycle_jours_deja_places_bleu'
      | 'sensor.rte_tempo_cycle_jours_deja_places_blanc'
      | 'sensor.rte_tempo_cycle_jours_deja_places_rouge'
      | 'sensor.rte_tempo_cycle_prochaine_reinitialisation'
      | 'sensor.rte_tempo_heures_creuses_changement'
      | 'binary_sensor.cuisine_mouvement'
      | 'binary_sensor.cuisine_humain'
      | 'binary_sensor.cuisine_animal'
      | 'binary_sensor.cuisine_bebe_pleure'
      | 'button.cuisine_arret_ptz'
      | 'button.cuisine_ptz_gauche'
      | 'button.cuisine_ptz_droit'
      | 'button.cuisine_ptz_haut'
      | 'button.cuisine_ptz_bas'
      | 'button.cuisine_calibrage_ptz'
      | 'button.cuisine_guard_go_to'
      | 'button.cuisine_garde_fixe_la_position_actuelle'
      | 'camera.cuisine_fluent'
      | 'camera.cuisine_clair'
      | 'camera.cuisine_les_instantanes_clair'
      | 'light.cuisine_led_d_etat'
      | 'number.cuisine_zoom'
      | 'number.cuisine_mise_au_point'
      | 'number.cuisine_volume'
      | 'number.cuisine_guard_return_time'
      | 'number.cuisine_sensibilite_mouvement'
      | 'number.cuisine_ai_person_sensitivity'
      | 'number.cuisine_ai_animal_sensitivity'
      | 'number.cuisine_baby_cry_sensitivity'
      | 'number.cuisine_limite_de_suivi_automatique_a_gauche'
      | 'number.cuisine_limite_de_suivi_automatique_a_droite'
      | 'number.cuisine_suivi_automatique_arret_apres_disparition'
      | 'number.cuisine_suivi_automatique_arret_du_suivi_apres'
      | 'select.cuisine_mode_jour_nuit'
      | 'select.cuisine_pre_reglage_ptz'
      | 'sensor.cuisine_position_panoramique_ptz'
      | 'sensor.cuisine_ptz_tilt_position'
      | 'sensor.cuisine_day_night_state'
      | 'siren.cuisine_sirene'
      | 'switch.cuisine_lumieres_infrarouges_en_mode_nuit'
      | 'switch.cuisine_enregistrer_l_audio'
      | 'switch.cuisine_sirene_lors_de_l_evenement'
      | 'switch.cuisine_suivi_automatique'
      | 'switch.cuisine_focus_automatique'
      | 'switch.cuisine_guard_return'
      | 'switch.cuisine_privacy_mode'
      | 'switch.cuisine_courriel_lors_de_l_evenement'
      | 'switch.cuisine_chargement_upload_ftp'
      | 'switch.cuisine_notifications_push'
      | 'switch.cuisine_enregistrer'
      | 'update.cuisine_micrologiciel'
      | 'camera.cuisine_profile000_mainstream'
      | 'sensor.ble_temperature_capteur_temperature_salon'
      | 'sensor.ble_humidity_capteur_temperature_salon'
      | 'sensor.ble_battery_capteur_temperature_salon'
      | 'sensor.ble_voltage_capteur_temperature_salon'
      | 'sensor.ble_rssi_capteur_temperature_salon'
      | 'sensor.solarflow_2400_ac_pack_num'
      | 'sensor.solarflow_2400_ac_pack_state'
      | 'sensor.solarflow_2400_ac_solar_power1'
      | 'sensor.solarflow_2400_ac_solar_power2'
      | 'sensor.solarflow_2400_ac_solar_power3'
      | 'sensor.solarflow_2400_ac_solar_power4'
      | 'sensor.solarflow_2400_ac_solar_power5'
      | 'sensor.solarflow_2400_ac_solar_power6'
      | 'sensor.solarflow_2400_ac_hyper_tmp'
      | 'sensor.solarflow_2400_ac_dc_status'
      | 'sensor.solarflow_2400_ac_pv_status'
      | 'sensor.solarflow_2400_ac_ac_status'
      | 'sensor.solarflow_2400_ac_data_ready'
      | 'sensor.solarflow_2400_ac_grid_state'
      | 'sensor.solarflow_2400_ac_bat_volt'
      | 'sensor.solarflow_2400_ac_faultlevel'
      | 'sensor.solarflow_2400_ac_write_rsp'
      | 'sensor.solarflow_2400_ac_grid_standard'
      | 'sensor.solarflow_2400_ac_inverse_max_power'
      | 'sensor.solarflow_2400_ac_i_o_t_state'
      | 'sensor.solarflow_2400_ac_bindstate'
      | 'sensor.solarflow_2400_ac_volt_wakeup'
      | 'sensor.solarflow_2400_ac_old_mode'
      | 'sensor.solarflow_2400_ac_o_t_a_state'
      | 'sensor.solarflow_2400_ac_l_c_n_state'
      | 'sensor.solarflow_2400_ac_factory_mode_state'
      | 'sensor.solarflow_2400_ac_smart_mode'
      | 'sensor.solarflow_2400_ac_charge_max_limit'
      | 'sensor.solarflow_2400_ac_phase_switch'
      | 'sensor.solarflow_2400_ac_rssi'
      | 'sensor.solarflow_2400_ac_localapienable'
      | 'sensor.solarflow_2400_ac_ai_state'
      | 'sensor.fo4nhn4n3401380_pack_type'
      | 'sensor.fo4nhn4n3401380_soc_level'
      | 'sensor.fo4nhn4n3401380_state'
      | 'sensor.fo4nhn4n3401380_power'
      | 'sensor.fo4nhn4n3401380_max_temp'
      | 'sensor.fo4nhn4n3401380_total_vol'
      | 'sensor.fo4nhn4n3401380_batcur'
      | 'sensor.fo4nhn4n3401380_max_vol'
      | 'sensor.fo4nhn4n3401380_min_vol'
      | 'sensor.fo4nhn4n3401380_soft_version'
      | 'sensor.fo4nhn4n3400508_pack_type'
      | 'sensor.fo4nhn4n3400508_soc_level'
      | 'sensor.fo4nhn4n3400508_state'
      | 'sensor.fo4nhn4n3400508_power'
      | 'sensor.fo4nhn4n3400508_max_temp'
      | 'sensor.fo4nhn4n3400508_total_vol'
      | 'sensor.fo4nhn4n3400508_batcur'
      | 'sensor.fo4nhn4n3400508_max_vol'
      | 'sensor.fo4nhn4n3400508_min_vol'
      | 'sensor.fo4nhn4n3400508_soft_version'
      | 'binary_sensor.solarflow_2400_ac_reverse_state'
      | 'binary_sensor.fo4nhn4n3401380_heat_state'
      | 'binary_sensor.fo4nhn4n3400508_heat_state'
      | 'select.solarflow_2400_ac_grid_reverse'
      | 'select.solarflow_2400_ac_grid_off_mode'
      | 'select.solarflow_2400_ac_fan_speed'
      | 'switch.solarflow_2400_ac_lamp_switch'
      | 'switch.solarflow_2400_ac_fan_switch'
      | 'binary_sensor.sonnette_entree_mouvement'
      | 'binary_sensor.sonnette_entree_humain'
      | 'binary_sensor.sonnette_entree_vehicule'
      | 'binary_sensor.sonnette_entree_animal_domestique'
      | 'binary_sensor.sonnette_entree_visiteur'
      | 'binary_sensor.camera_salon_mouvement'
      | 'binary_sensor.camera_salon_personne'
      | 'binary_sensor.camera_salon_animal'
      | 'binary_sensor.camera_salon_pleurs_de_bebe'
      | 'button.camera_salon_arret_ptz'
      | 'button.camera_salon_ptz_gauche'
      | 'button.camera_salon_ptz_droit'
      | 'button.camera_salon_ptz_haut'
      | 'button.camera_salon_ptz_bas'
      | 'button.camera_salon_calibrage_ptz'
      | 'button.camera_salon_retour_au_point_de_garde'
      | 'button.camera_salon_actualiser_le_point_de_garde'
      | 'camera.sonnette_entree_fluent'
      | 'camera.camera_salon_fluide'
      | 'camera.sonnette_entree_clair'
      | 'camera.camera_salon_net'
      | 'camera.sonnette_entree_les_instantanes_clair'
      | 'camera.camera_salon_instantanes_net'
      | 'light.camera_salon_led_d_etat'
      | 'light.reolink_home_hub_led_d_etat'
      | 'number.sonnette_entree_volume'
      | 'number.camera_salon_volume'
      | 'number.sonnette_entree_speak_volume'
      | 'number.sonnette_entree_volume_de_la_sonnette'
      | 'number.camera_salon_intervalle_de_retour_au_point_de_garde'
      | 'number.sonnette_entree_sensibilite_mouvement'
      | 'number.camera_salon_sensibilite_mouvement'
      | 'number.sonnette_entree_ai_person_sensitivity'
      | 'number.camera_salon_sensibilite_personne_ia'
      | 'number.sonnette_entree_ai_vehicle_sensitivity'
      | 'number.sonnette_entree_sensibilite_animal_domestique_ia'
      | 'number.camera_salon_sensibilite_animal_ia'
      | 'number.camera_salon_baby_cry_sensitivity'
      | 'number.sonnette_entree_temps_de_reponse_rapide_automatique'
      | 'number.reolink_home_hub_alarm_volume'
      | 'number.reolink_home_hub_message_volume'
      | 'number.chime_volume'
      | 'number.reolink_chime_silent_time'
      | 'select.sonnette_entree_mode_jour_nuit'
      | 'select.camera_salon_mode_jour_nuit'
      | 'select.sonnette_entree_play_quick_reply_message'
      | 'select.sonnette_entree_message_de_reponse_rapide_automatique'
      | 'select.sonnette_entree_hub_alarm_ringtone'
      | 'select.camera_salon_sonnerie_sirene_home_hub'
      | 'select.sonnette_entree_hub_visitor_ringtone'
      | 'select.sonnette_entree_led_de_la_sonnette'
      | 'select.reolink_home_hub_scene_mode'
      | 'select.reolink_chime_sonnerie_mouvement'
      | 'select.chime_person_ringtone'
      | 'select.chime_vehicle_ringtone'
      | 'select.chime_visitor_ringtone'
      | 'select.reolink_chime_pet_ringtone'
      | 'sensor.camera_salon_position_panoramique_ptz'
      | 'sensor.camera_salon_position_d_inclinaison_ptz'
      | 'sensor.sonnette_entree_day_night_state'
      | 'sensor.camera_salon_etat_jour_nuit'
      | 'siren.sonnette_entree_sirene'
      | 'siren.camera_salon_sirene'
      | 'siren.reolink_home_hub_sirene'
      | 'switch.sonnette_entree_lumieres_infrarouges_en_mode_nuit'
      | 'switch.camera_salon_infrared_lights_in_night_mode'
      | 'switch.sonnette_entree_enregistrer_l_audio'
      | 'switch.camera_salon_enregistrer_l_audio'
      | 'switch.sonnette_entree_sirene_lors_de_l_evenement'
      | 'switch.camera_salon_sirene_lors_de_l_evenement'
      | 'switch.camera_salon_suivi_automatique'
      | 'switch.camera_salon_auto_retour_au_point_de_garde'
      | 'switch.sonnette_entree_courriel_lors_de_l_evenement'
      | 'switch.camera_salon_alertes_de_courriel'
      | 'switch.sonnette_entree_chargement_upload_ftp'
      | 'switch.camera_salon_enregistrement_ftp'
      | 'switch.sonnette_entree_notifications_push'
      | 'switch.camera_salon_notifications_push'
      | 'switch.sonnette_entree_enregistrer'
      | 'switch.camera_salon_enregistrer'
      | 'switch.sonnette_entree_enregistrement_manuel'
      | 'switch.camera_salon_enregistrement_manuel'
      | 'switch.sonnette_entree_hub_ringtone_on_event'
      | 'switch.camera_salon_sonnerie_evenement_home_hub'
      | 'switch.sonnette_entree_son_du_bouton_de_la_sonnette'
      | 'switch.sonnette_entree_mode_prive'
      | 'switch.camera_salon_mode_prive'
      | 'switch.chime_led'
      | 'update.sonnette_entree_micrologiciel'
      | 'update.camera_salon_micrologiciel'
      | 'update.reolink_home_hub_micrologiciel'
      | 'sensor.recharge_voiture_add_ele_cost'
      | 'select.seche_linge_programme'
      | 'select.seche_linge_temps_de_sechage'
      | 'select.seche_linge_niveau_de_sechage'
      | 'number.seche_linge_demarrage_differe'
      | 'number.seche_linge_temps_de_sechage'
      | 'switch.seche_linge_seche_linge'
      | 'switch.seche_linge_pause'
      | 'switch.seche_linge_anti_pli'
      | 'binary_sensor.seche_linge_connexion_de_lappareil'
      | 'binary_sensor.seche_linge_porte_ouverte'
      | 'binary_sensor.seche_linge_anti_pli'
      | 'sensor.seche_linge_machine_status'
      | 'sensor.seche_linge_erreur'
      | 'sensor.seche_linge_temps_restant'
      | 'sensor.seche_linge_demarrage_differe'
      | 'sensor.seche_linge_programme'
      | 'sensor.seche_linge_phase'
      | 'sensor.seche_linge_niveau_de_sechage'
      | 'sensor.seche_linge_capacite_de_charge'
      | 'sensor.seche_linge_efficacite_energetique'
      | 'sensor.lave_linge_energy_meter'
      | 'sensor.lave_linge_power_meter'
      | 'sensor.prise_connectee_energy_cost_2'
      | 'image.roborock_qrevo_maxv_maison_longuenesse'
      | 'button.capteur_de_presence_identifier_1'
      | 'button.capteur_de_presence_identifier_2'
      | 'sensor.03605170_97ed264c_browser_path'
      | 'sensor.03605170_97ed264c_browser_visibility'
      | 'sensor.03605170_97ed264c_browser_useragent'
      | 'sensor.03605170_97ed264c_browser_user'
      | 'binary_sensor.03605170_97ed264c_browser_fullykiosk'
      | 'sensor.03605170_97ed264c_browser_width'
      | 'sensor.03605170_97ed264c_browser_height'
      | 'binary_sensor.03605170_97ed264c_browser_dark_mode'
      | 'binary_sensor.03605170_97ed264c'
      | 'light.03605170_97ed264c_screen'
      | 'media_player.03605170_97ed264c'
      | 'sensor.03605170_97ed264c_browser_battery'
      | 'binary_sensor.03605170_97ed264c_browser_charging'
      | 'image.rocky_balboa'
      | 'sensor.0f39f3ee_9448940e_browser_path'
      | 'sensor.0f39f3ee_9448940e_browser_visibility'
      | 'sensor.0f39f3ee_9448940e_browser_useragent'
      | 'sensor.0f39f3ee_9448940e_browser_user'
      | 'binary_sensor.0f39f3ee_9448940e_browser_fullykiosk'
      | 'sensor.0f39f3ee_9448940e_browser_width'
      | 'sensor.0f39f3ee_9448940e_browser_height'
      | 'binary_sensor.0f39f3ee_9448940e_browser_dark_mode'
      | 'binary_sensor.0f39f3ee_9448940e'
      | 'light.0f39f3ee_9448940e_screen'
      | 'media_player.0f39f3ee_9448940e'
      | 'sensor.0f39f3ee_9448940e_browser_battery'
      | 'binary_sensor.0f39f3ee_9448940e_browser_charging'
      | 'sensor.ble_rssi_e2c56db5dffb48d2b060d0f5a71096e0'
      | 'sensor.ble_measured_power_e2c56db5dffb48d2b060d0f5a71096e0'
      | 'sensor.ble_mac_e2c56db5dffb48d2b060d0f5a71096e0'
      | 'sensor.ble_major_e2c56db5dffb48d2b060d0f5a71096e0'
      | 'sensor.ble_minor_e2c56db5dffb48d2b060d0f5a71096e0'
      | 'media_player.television_2'
      | 'sensor.tablette_browser_path'
      | 'sensor.tablette_browser_visibility'
      | 'sensor.tablette_browser_useragent'
      | 'sensor.tablette_browser_user'
      | 'binary_sensor.tablette_browser_fullykiosk'
      | 'sensor.tablette_browser_width'
      | 'sensor.tablette_browser_height'
      | 'binary_sensor.tablette_browser_dark_mode'
      | 'binary_sensor.tablette'
      | 'light.tablette_screen'
      | 'media_player.tablette'
      | 'sensor.4901924d_f76d20cb_browser_path'
      | 'sensor.4901924d_f76d20cb_browser_visibility'
      | 'sensor.4901924d_f76d20cb_browser_useragent'
      | 'sensor.4901924d_f76d20cb_browser_user'
      | 'binary_sensor.4901924d_f76d20cb_browser_fullykiosk'
      | 'sensor.4901924d_f76d20cb_browser_width'
      | 'sensor.4901924d_f76d20cb_browser_height'
      | 'binary_sensor.4901924d_f76d20cb_browser_dark_mode'
      | 'binary_sensor.4901924d_f76d20cb'
      | 'light.4901924d_f76d20cb_screen'
      | 'media_player.4901924d_f76d20cb'
      | 'sensor.recharge_voiture_add_ele_cost_2'
      | 'sensor.ble_rssi_74278bdab64445208f0c720eaf059935'
      | 'sensor.ble_measured_power_74278bdab64445208f0c720eaf059935'
      | 'sensor.ble_mac_74278bdab64445208f0c720eaf059935'
      | 'sensor.ble_major_74278bdab64445208f0c720eaf059935'
      | 'sensor.ble_minor_74278bdab64445208f0c720eaf059935'
      | 'sensor.ble_rssi_c3060c044426'
      | 'sensor.ble_heart_rate_c3060c044426'
      | 'sensor.ble_steps_c3060c044426'
      | 'sensor.ble_rssi_e628edfbfe79'
      | 'sensor.ble_heart_rate_e628edfbfe79'
      | 'sensor.ble_steps_e628edfbfe79'
      | 'camera.tablette'
      | 'sensor.5884c3c8_df4c3cb5_browser_path'
      | 'sensor.5884c3c8_df4c3cb5_browser_visibility'
      | 'sensor.5884c3c8_df4c3cb5_browser_useragent'
      | 'sensor.5884c3c8_df4c3cb5_browser_user'
      | 'binary_sensor.5884c3c8_df4c3cb5_browser_fullykiosk'
      | 'sensor.5884c3c8_df4c3cb5_browser_width'
      | 'sensor.5884c3c8_df4c3cb5_browser_height'
      | 'binary_sensor.5884c3c8_df4c3cb5_browser_dark_mode'
      | 'binary_sensor.5884c3c8_df4c3cb5'
      | 'light.5884c3c8_df4c3cb5_screen'
      | 'media_player.5884c3c8_df4c3cb5'
      | 'sensor.ble_rssi_400225dd3d154a4b9db393c4b2d01eda'
      | 'sensor.ble_measured_power_400225dd3d154a4b9db393c4b2d01eda'
      | 'sensor.ble_mac_400225dd3d154a4b9db393c4b2d01eda'
      | 'sensor.ble_major_400225dd3d154a4b9db393c4b2d01eda'
      | 'sensor.ble_minor_400225dd3d154a4b9db393c4b2d01eda'
      | 'sensor.ble_rssi_1ca92e23f0874df7b9a2fd4b716a4bf6'
      | 'sensor.ble_measured_power_1ca92e23f0874df7b9a2fd4b716a4bf6'
      | 'sensor.ble_mac_1ca92e23f0874df7b9a2fd4b716a4bf6'
      | 'sensor.ble_major_1ca92e23f0874df7b9a2fd4b716a4bf6'
      | 'sensor.ble_minor_1ca92e23f0874df7b9a2fd4b716a4bf6'
      | 'sensor.ble_rssi_da42361d0356'
      | 'sensor.ble_heart_rate_da42361d0356'
      | 'sensor.ble_steps_da42361d0356'
      | 'sensor.08f808e6_8a27ca0e_browser_path'
      | 'sensor.08f808e6_8a27ca0e_browser_visibility'
      | 'sensor.08f808e6_8a27ca0e_browser_useragent'
      | 'sensor.08f808e6_8a27ca0e_browser_user'
      | 'binary_sensor.08f808e6_8a27ca0e_browser_fullykiosk'
      | 'sensor.08f808e6_8a27ca0e_browser_width'
      | 'sensor.08f808e6_8a27ca0e_browser_height'
      | 'binary_sensor.08f808e6_8a27ca0e_browser_dark_mode'
      | 'binary_sensor.08f808e6_8a27ca0e'
      | 'light.08f808e6_8a27ca0e_screen'
      | 'media_player.08f808e6_8a27ca0e'
      | 'sensor.08f808e6_8a27ca0e_browser_battery'
      | 'binary_sensor.08f808e6_8a27ca0e_browser_charging'
      | 'sensor.ble_rssi_e20a39f473f54bc4186417d1ad07a962'
      | 'sensor.ble_measured_power_e20a39f473f54bc4186417d1ad07a962'
      | 'sensor.ble_mac_e20a39f473f54bc4186417d1ad07a962'
      | 'sensor.ble_major_e20a39f473f54bc4186417d1ad07a962'
      | 'sensor.ble_minor_e20a39f473f54bc4186417d1ad07a962'
      | 'sensor.ble_rssi_9730c8c024fe327a3f63623c87e24797'
      | 'sensor.ble_measured_power_9730c8c024fe327a3f63623c87e24797'
      | 'sensor.ble_mac_9730c8c024fe327a3f63623c87e24797'
      | 'sensor.ble_major_9730c8c024fe327a3f63623c87e24797'
      | 'sensor.ble_minor_9730c8c024fe327a3f63623c87e24797'
      | 'sensor.ble_rssi_37eb8d53d5371e2bca37f0659844f4a2'
      | 'sensor.ble_measured_power_37eb8d53d5371e2bca37f0659844f4a2'
      | 'sensor.ble_mac_37eb8d53d5371e2bca37f0659844f4a2'
      | 'sensor.ble_major_37eb8d53d5371e2bca37f0659844f4a2'
      | 'sensor.ble_minor_37eb8d53d5371e2bca37f0659844f4a2'
      | 'sensor.ble_rssi_111919bb78134ea79e656f14000200a7'
      | 'sensor.ble_measured_power_111919bb78134ea79e656f14000200a7'
      | 'sensor.ble_mac_111919bb78134ea79e656f14000200a7'
      | 'sensor.ble_major_111919bb78134ea79e656f14000200a7'
      | 'sensor.ble_minor_111919bb78134ea79e656f14000200a7'
      | 'sensor.ble_rssi_9730c8c024fe327a3f63623c87e24798'
      | 'sensor.ble_measured_power_9730c8c024fe327a3f63623c87e24798'
      | 'sensor.ble_mac_9730c8c024fe327a3f63623c87e24798'
      | 'sensor.ble_major_9730c8c024fe327a3f63623c87e24798'
      | 'sensor.ble_minor_9730c8c024fe327a3f63623c87e24798'
      | 'sensor.ble_temperature_a4c1389dc043'
      | 'sensor.ble_humidity_a4c1389dc043'
      | 'sensor.ble_battery_a4c1389dc043'
      | 'sensor.ble_voltage_a4c1389dc043'
      | 'sensor.ble_rssi_a4c1389dc043'
      | 'sensor.ble_rssi_c2939fb277aa'
      | 'sensor.ble_heart_rate_c2939fb277aa'
      | 'sensor.ble_steps_c2939fb277aa'
      | 'sensor.ble_rssi_111919bb78134ea79e656f1400000046'
      | 'sensor.ble_measured_power_111919bb78134ea79e656f1400000046'
      | 'sensor.ble_mac_111919bb78134ea79e656f1400000046'
      | 'sensor.ble_major_111919bb78134ea79e656f1400000046'
      | 'sensor.ble_minor_111919bb78134ea79e656f1400000046'
      | 'sensor.ble_rssi_effcca99b7be'
      | 'sensor.ble_heart_rate_effcca99b7be'
      | 'sensor.ble_steps_effcca99b7be'
      | 'switch.edilkamin_8c_4b_14_98_c9_b0_power_switch'
      | 'sensor.ble_rssi_a92ee200550111e4916c0800200c9a66'
      | 'sensor.ble_measured_power_a92ee200550111e4916c0800200c9a66'
      | 'sensor.ble_mac_a92ee200550111e4916c0800200c9a66'
      | 'sensor.ble_major_a92ee200550111e4916c0800200c9a66'
      | 'sensor.ble_minor_a92ee200550111e4916c0800200c9a66'
      | 'sensor.b640901e_180f6119_browser_path'
      | 'sensor.b640901e_180f6119_browser_visibility'
      | 'sensor.b640901e_180f6119_browser_useragent'
      | 'sensor.b640901e_180f6119_browser_user'
      | 'binary_sensor.b640901e_180f6119_browser_fullykiosk'
      | 'sensor.b640901e_180f6119_browser_width'
      | 'sensor.b640901e_180f6119_browser_height'
      | 'binary_sensor.b640901e_180f6119_browser_dark_mode'
      | 'binary_sensor.b640901e_180f6119'
      | 'light.b640901e_180f6119_screen'
      | 'media_player.b640901e_180f6119'
      | 'sensor.b640901e_180f6119_browser_battery'
      | 'binary_sensor.b640901e_180f6119_browser_charging'
      | 'media_player.chambre'
      | 'media_player.chambre_2'
      | 'media_player.chromecast1481'
      | 'media_player.chromecast1481_2'
      | 'media_player.test_2'
      | 'sensor.74508481_76c0410d_browser_path'
      | 'sensor.74508481_76c0410d_browser_visibility'
      | 'sensor.74508481_76c0410d_browser_useragent'
      | 'sensor.74508481_76c0410d_browser_user'
      | 'binary_sensor.74508481_76c0410d_browser_fullykiosk'
      | 'sensor.74508481_76c0410d_browser_width'
      | 'sensor.74508481_76c0410d_browser_height'
      | 'binary_sensor.74508481_76c0410d_browser_dark_mode'
      | 'binary_sensor.74508481_76c0410d'
      | 'light.74508481_76c0410d_screen'
      | 'media_player.74508481_76c0410d'
      | 'sensor.tablette_browser_battery'
      | 'binary_sensor.tablette_browser_charging'
      | 'binary_sensor.ble_toothbrush_90ceb8f2b5d4'
      | 'sensor.ble_rssi_90ceb8f2b5d4'
      | 'sensor.b37cc59e_cea7becf_browser_path'
      | 'sensor.b37cc59e_cea7becf_browser_visibility'
      | 'sensor.b37cc59e_cea7becf_browser_useragent'
      | 'sensor.b37cc59e_cea7becf_browser_user'
      | 'binary_sensor.b37cc59e_cea7becf_browser_fullykiosk'
      | 'sensor.b37cc59e_cea7becf_browser_width'
      | 'sensor.b37cc59e_cea7becf_browser_height'
      | 'binary_sensor.b37cc59e_cea7becf_browser_dark_mode'
      | 'binary_sensor.b37cc59e_cea7becf'
      | 'light.b37cc59e_cea7becf_screen'
      | 'media_player.b37cc59e_cea7becf'
      | 'sensor.b37cc59e_cea7becf_browser_battery'
      | 'binary_sensor.b37cc59e_cea7becf_browser_charging'
      | 'media_player.salon_3'
      | 'media_player.salon_4'
      | 'number.volume'
      | 'switch.led'
      | 'media_player.freebox_player_pop_3'
      | 'media_player.freebox_player_pop_5'
      | 'remote.freebox_player_pop'
      | 'button.capteur_de_presence_cuisine_identifier_1'
      | 'button.capteur_de_presence_cuisine_identifier_2'
      | 'button.capteur_d_ouverture_de_porte_chambre_identifier'
      | 'sensor.eb623410_a7e2a57b_browser_path'
      | 'sensor.eb623410_a7e2a57b_browser_visibility'
      | 'sensor.eb623410_a7e2a57b_browser_useragent'
      | 'sensor.eb623410_a7e2a57b_browser_user'
      | 'binary_sensor.eb623410_a7e2a57b_browser_fullykiosk'
      | 'sensor.eb623410_a7e2a57b_browser_width'
      | 'sensor.eb623410_a7e2a57b_browser_height'
      | 'binary_sensor.eb623410_a7e2a57b_browser_dark_mode'
      | 'binary_sensor.eb623410_a7e2a57b'
      | 'light.eb623410_a7e2a57b_screen'
      | 'media_player.eb623410_a7e2a57b'
      | 'binary_sensor.tesla_wall_connector_vehicule_connecte'
      | 'binary_sensor.tesla_wall_connector_contacteur_ferme'
      | 'sensor.tesla_wall_connector_etat'
      | 'sensor.tesla_wall_connector_temperature_de_la_poignee'
      | 'sensor.tesla_wall_connector_pcb_temperature'
      | 'sensor.tesla_wall_connector_mcu_temperature'
      | 'sensor.tesla_wall_connector_tension_du_reseau'
      | 'sensor.tesla_wall_connector_frequence_du_reseau'
      | 'sensor.tesla_wall_connector_courant_de_la_phase_a'
      | 'sensor.tesla_wall_connector_courant_de_la_phase_b'
      | 'sensor.tesla_wall_connector_courant_de_la_phase_c'
      | 'sensor.tesla_wall_connector_tension_de_la_phase_a'
      | 'sensor.tesla_wall_connector_tension_de_la_phase_b'
      | 'sensor.tesla_wall_connector_tension_de_la_phase_c'
      | 'sensor.tesla_wall_connector_energie_de_la_session'
      | 'sensor.tesla_wall_connector_energie'
      | 'sensor.b4526259_eb8fd263_browser_path'
      | 'sensor.b4526259_eb8fd263_browser_visibility'
      | 'sensor.b4526259_eb8fd263_browser_useragent'
      | 'sensor.b4526259_eb8fd263_browser_user'
      | 'binary_sensor.b4526259_eb8fd263_browser_fullykiosk'
      | 'sensor.b4526259_eb8fd263_browser_width'
      | 'sensor.b4526259_eb8fd263_browser_height'
      | 'binary_sensor.b4526259_eb8fd263_browser_dark_mode'
      | 'binary_sensor.b4526259_eb8fd263'
      | 'light.b4526259_eb8fd263_screen'
      | 'media_player.b4526259_eb8fd263'
      | 'sensor.b4526259_eb8fd263_browser_battery'
      | 'binary_sensor.b4526259_eb8fd263_browser_charging'
      | 'sensor.d862a395_bab3d4f1_browser_path'
      | 'sensor.d862a395_bab3d4f1_browser_visibility'
      | 'sensor.d862a395_bab3d4f1_browser_useragent'
      | 'sensor.d862a395_bab3d4f1_browser_user'
      | 'binary_sensor.d862a395_bab3d4f1_browser_fullykiosk'
      | 'sensor.d862a395_bab3d4f1_browser_width'
      | 'sensor.d862a395_bab3d4f1_browser_height'
      | 'binary_sensor.d862a395_bab3d4f1_browser_dark_mode'
      | 'binary_sensor.d862a395_bab3d4f1'
      | 'light.d862a395_bab3d4f1_screen'
      | 'media_player.d862a395_bab3d4f1'
      | 'sensor.ec8a4b91_11ddcb43_browser_path'
      | 'sensor.ec8a4b91_11ddcb43_browser_visibility'
      | 'sensor.ec8a4b91_11ddcb43_browser_useragent'
      | 'sensor.ec8a4b91_11ddcb43_browser_user'
      | 'binary_sensor.ec8a4b91_11ddcb43_browser_fullykiosk'
      | 'sensor.ec8a4b91_11ddcb43_browser_width'
      | 'sensor.ec8a4b91_11ddcb43_browser_height'
      | 'binary_sensor.ec8a4b91_11ddcb43_browser_dark_mode'
      | 'binary_sensor.ec8a4b91_11ddcb43'
      | 'light.ec8a4b91_11ddcb43_screen'
      | 'media_player.ec8a4b91_11ddcb43'
      | 'sensor.chibi_petkit_puramax_2_nombre_d_utilisations_2'
      | 'sensor.chibi_petkit_puramax_2_utilisation_totale_2'
      | 'binary_sensor.chibi_petkit_puramax_2_deodorization'
      | 'switch.chibi_petkit_puramax_2_light'
      | 'sensor.fontaine_energie'
      | 'sensor.fontaine_derniere_mise_a_jour'
      | 'sensor.fontaine_filtre_restant'
      | 'sensor.fontaine_eau_purifiee'
      | 'sensor.fontaine_nombre_de_boissons'
      | 'sensor.fontaine_battery'
      | 'sensor.fontaine_battery_voltage'
      | 'sensor.fontaine_supply_voltage'
      | 'sensor.fontaine_last_ble_connection'
      | 'binary_sensor.fontaine_alerte_manque_d_eau'
      | 'binary_sensor.fontaine_batterie_faible'
      | 'binary_sensor.fontaine_remplacer_le_filtre'
      | 'binary_sensor.fontaine_sur_alimentation_secteur'
      | 'binary_sensor.fontaine_do_not_disturb'
      | 'binary_sensor.fontaine_pet_drinking'
      | 'binary_sensor.fontaine_pump'
      | 'switch.cuisine_ptz_autotracker'
      | 'sensor.tablette_thomas_browser_path'
      | 'sensor.tablette_thomas_browser_visibility'
      | 'sensor.tablette_thomas_browser_useragent'
      | 'sensor.tablette_thomas_browser_user'
      | 'binary_sensor.tablette_thomas_browser_fullykiosk'
      | 'sensor.tablette_thomas_browser_width'
      | 'sensor.tablette_thomas_browser_height'
      | 'binary_sensor.tablette_thomas_browser_dark_mode'
      | 'binary_sensor.tablette_thomas'
      | 'light.tablette_thomas_screen'
      | 'media_player.tablette_thomas'
      | 'binary_sensor.ble_weight_removed_5ccad3ee357e'
      | 'sensor.ble_rssi_5ccad3ee357e'
      | 'sensor.ble_weight_5ccad3ee357e'
      | 'sensor.ble_stabilized_weight_5ccad3ee357e'
      | 'sensor.ble_non_stabilized_weight_5ccad3ee357e'
      | 'sensor.ble_impedance_5ccad3ee357e'
      | 'media_player.googletv1454'
      | 'button.guirlande_lego_identifier'
      | 'sensor.browser_mod_0c5c943d_a2e386c0_browser_path'
      | 'sensor.browser_mod_0c5c943d_a2e386c0_browser_visibility'
      | 'sensor.browser_mod_0c5c943d_a2e386c0_browser_useragent'
      | 'sensor.browser_mod_0c5c943d_a2e386c0_browser_user'
      | 'binary_sensor.browser_mod_0c5c943d_a2e386c0_browser_fullykiosk'
      | 'sensor.browser_mod_0c5c943d_a2e386c0_browser_width'
      | 'sensor.browser_mod_0c5c943d_a2e386c0_browser_height'
      | 'binary_sensor.browser_mod_0c5c943d_a2e386c0_browser_dark_mode'
      | 'binary_sensor.browser_mod_0c5c943d_a2e386c0'
      | 'light.browser_mod_0c5c943d_a2e386c0_screen'
      | 'media_player.browser_mod_0c5c943d_a2e386c0'
      | 'sensor.browser_mod_2e0449f3_3064bb10_browser_path'
      | 'sensor.browser_mod_2e0449f3_3064bb10_browser_visibility'
      | 'sensor.browser_mod_2e0449f3_3064bb10_browser_useragent'
      | 'sensor.browser_mod_2e0449f3_3064bb10_browser_user'
      | 'binary_sensor.browser_mod_2e0449f3_3064bb10_browser_fullykiosk'
      | 'sensor.browser_mod_2e0449f3_3064bb10_browser_width'
      | 'sensor.browser_mod_2e0449f3_3064bb10_browser_height'
      | 'binary_sensor.browser_mod_2e0449f3_3064bb10_browser_dark_mode'
      | 'binary_sensor.browser_mod_2e0449f3_3064bb10'
      | 'light.browser_mod_2e0449f3_3064bb10_screen'
      | 'media_player.browser_mod_2e0449f3_3064bb10'
      | 'sensor.browser_mod_2e0449f3_3064bb10_browser_battery'
      | 'binary_sensor.browser_mod_2e0449f3_3064bb10_browser_charging'
      | 'light.ambilight'
      | 'sensor.tablette_panel'
      | 'sensor.b37cc59e_cea7becf_panel'
      | 'sensor.browser_mod_0c5c943d_a2e386c0_panel'
      | 'sensor.tablette_thomas_panel'
      | 'sensor.chibi_last_urination'
      | 'sensor.chibi_last_defecation'
      | 'sensor.pc_thomas_browser_path'
      | 'sensor.pc_thomas_browser_visibility'
      | 'sensor.pc_thomas_browser_useragent'
      | 'sensor.pc_thomas_browser_user'
      | 'binary_sensor.pc_thomas_browser_fullykiosk'
      | 'sensor.pc_thomas_browser_width'
      | 'sensor.pc_thomas_browser_height'
      | 'binary_sensor.pc_thomas_browser_dark_mode'
      | 'binary_sensor.pc_thomas'
      | 'light.pc_thomas_screen'
      | 'media_player.pc_thomas'
      | 'sensor.pc_thomas_panel'
      | 'sensor.tablette_thomas_browser_id'
      | 'sensor.tablette_browser_id'
      | 'sensor.b37cc59e_cea7becf_browser_id'
      | 'sensor.pc_thomas_browser_id'
      | 'sensor.solarflow_2400_ac_remain_out_time'
      | 'sensor.solarflow_2400_ac_grid_off_mode'
      | 'sensor.solarflow_2400_ac_fan_switch'
      | 'sensor.solarflow_2400_ac_fan_speed'
      | 'sensor.solarflow_2400_ac_ts'
      | 'sensor.solarflow_2400_ac_ts_zone'
      | 'sensor.solarflow_2400_ac_is_error'
      | 'binary_sensor.luba_mnt23x9t_en_charge'
      | 'lawn_mower.luba_mnt23x9t'
      | 'device_tracker.luba_mnt23x9t_luba_mnt23x9t'
      | 'sensor.luba_mnt23x9t_hauteur_des_lames'
      | 'sensor.luba_mnt23x9t_luminosite_de_la_camera'
      | 'sensor.luba_mnt23x9t_kilometrage_total'
      | 'sensor.luba_mnt23x9t_temps_de_travail_total'
      | 'sensor.luba_mnt23x9t_cycles_de_batterie'
      | 'sensor.luba_mnt23x9t_batterie'
      | 'sensor.luba_mnt23x9t_qualite_du_signal_bluetooth'
      | 'sensor.luba_mnt23x9t_qualite_du_signal_wi_fi'
      | 'sensor.luba_mnt23x9t_qualite_du_signal_reseau_mobile'
      | 'sensor.luba_mnt23x9t_connexion'
      | 'sensor.luba_mnt23x9t_satellites_robot'
      | 'sensor.luba_mnt23x9t_zone'
      | 'sensor.luba_mnt23x9t_vitesse_de_tonte'
      | 'sensor.luba_mnt23x9t_progression'
      | 'sensor.luba_mnt23x9t_temps_total'
      | 'sensor.luba_mnt23x9t_temps_ecoule'
      | 'sensor.luba_mnt23x9t_temps_restant'
      | 'sensor.luba_mnt23x9t_non_work_hours'
      | 'sensor.luba_mnt23x9t_satellites_l1_co_visionnage'
      | 'sensor.luba_mnt23x9t_satellites_l2_co_visionnage'
      | 'sensor.luba_mnt23x9t_mode_activite'
      | 'sensor.luba_mnt23x9t_position_rtk'
      | 'sensor.luba_mnt23x9t_type_de_position_de_l_appareil'
      | 'sensor.luba_mnt23x9t_latitude'
      | 'sensor.luba_mnt23x9t_longitude'
      | 'sensor.luba_mnt23x9t_zone_de_travail'
      | 'sensor.luba_mnt23x9t_heure_de_la_derniere_erreur'
      | 'sensor.luba_mnt23x9t_derniere_erreur'
      | 'sensor.luba_mnt23x9t_dernier_code_d_erreur'
      | 'button.luba_mnt23x9t_synchroniser_les_cartes'
      | 'button.luba_mnt23x9t_synchronize_schedules'
      | 'button.luba_mnt23x9t_synchroniser_rtk_et_base'
      | 'button.luba_mnt23x9t_quitter_la_base'
      | 'button.luba_mnt23x9t_mouvement_d_urgence_en_avant'
      | 'button.luba_mnt23x9t_mouvement_d_urgence_a_gauche'
      | 'button.luba_mnt23x9t_mouvement_d_urgence_a_droite'
      | 'button.luba_mnt23x9t_mouvement_d_urgence_en_arriere'
      | 'button.luba_mnt23x9t_annuler_la_tache_en_cours'
      | 'button.luba_mnt23x9t_activer_la_camera_durant_la_tonte'
      | 'button.luba_mnt23x9t_deplacer_la_station_de_recharge'
      | 'switch.luba_mnt23x9t_zone_area_1'
      | 'switch.luba_mnt23x9t_led_laterales'
      | 'switch.luba_mnt23x9t_detection_de_pluie_tonte_activer_desactiver'
      | 'switch.luba_mnt23x9t_detection_de_pluie_durant_la_tonte_activer_desactiver'
      | 'switch.luba_mnt23x9t_activer_les_mises_a_jour_activer_desactiver'
      | 'switch.luba_mnt23x9t_allumage_extinction_manuelle_de_la_lumiere'
      | 'switch.luba_mnt23x9t_eclairage_de_nuit_allume_eteint'
      | 'number.luba_mnt23x9t_vitesse_de_fonctionnement'
      | 'number.luba_mnt23x9t_espacement_des_trajectoires'
      | 'number.luba_mnt23x9t_depart_de_la_progression'
      | 'number.luba_mnt23x9t_angle_de_coupe'
      | 'number.luba_mnt23x9t_angle_de_traversee'
      | 'number.luba_mnt23x9t_hauteur_des_lames'
      | 'number.luba_mnt23x9t_hauteur_des_lames_en_pouces'
      | 'select.luba_mnt23x9t_mode_de_trajectoire_de_tonte'
      | 'select.luba_mnt23x9t_tours_de_tonte_du_perimetre'
      | 'select.luba_mnt23x9t_tours_de_tonte_de_zones_interdites'
      | 'select.luba_mnt23x9t_ordre_de_tonte'
      | 'select.luba_mnt23x9t_trajet_de_recharge'
      | 'select.luba_mnt23x9t_mode_de_demi_tour'
      | 'select.luba_mnt23x9t_angle_de_trajectoire'
      | 'select.luba_mnt23x9t_mode_de_detection_d_obstacles'
      | 'select.luba_mnt23x9t_vitesse_de_coupe'
      | 'update.luba_mnt23x9t_micrologiciel'
      | 'camera.luba_mnt23x9t_none'
      | 'sensor.tesla_wall_connector_total_power'
      | 'switch.luba_mnt23x9t_zone_area_1_2'
      | 'binary_sensor.camera_couloir_mouvement'
      | 'binary_sensor.camera_couloir_personne'
      | 'binary_sensor.camera_couloir_animal'
      | 'binary_sensor.camera_couloir_pleurs_de_bebe'
      | 'button.camera_couloir_arret_ptz'
      | 'button.camera_couloir_ptz_gauche'
      | 'button.camera_couloir_ptz_droit'
      | 'button.camera_couloir_ptz_haut'
      | 'button.camera_couloir_ptz_bas'
      | 'button.camera_couloir_calibrage_ptz'
      | 'button.camera_couloir_retour_au_point_de_garde'
      | 'button.camera_couloir_actualiser_le_point_de_garde'
      | 'camera.camera_couloir_fluide'
      | 'camera.camera_couloir_net'
      | 'camera.camera_couloir_instantanes_net'
      | 'light.camera_couloir_led_d_etat'
      | 'number.camera_couloir_volume'
      | 'number.camera_couloir_intervalle_de_retour_au_point_de_garde'
      | 'number.camera_couloir_sensibilite_mouvement'
      | 'number.camera_couloir_sensibilite_personne_ia'
      | 'number.camera_couloir_sensibilite_animal_ia'
      | 'number.camera_couloir_baby_cry_sensitivity'
      | 'select.camera_couloir_mode_jour_nuit'
      | 'select.camera_couloir_sonnerie_sirene_home_hub'
      | 'sensor.camera_couloir_position_panoramique_ptz'
      | 'sensor.camera_couloir_position_d_inclinaison_ptz'
      | 'sensor.camera_couloir_etat_jour_nuit'
      | 'siren.camera_couloir_sirene'
      | 'switch.camera_couloir_infrared_lights_in_night_mode'
      | 'switch.camera_couloir_enregistrer_l_audio'
      | 'switch.camera_couloir_sirene_lors_de_l_evenement'
      | 'switch.camera_couloir_suivi_automatique'
      | 'switch.camera_couloir_auto_retour_au_point_de_garde'
      | 'switch.camera_couloir_alertes_de_courriel'
      | 'switch.camera_couloir_enregistrement_ftp'
      | 'switch.camera_couloir_notifications_push'
      | 'switch.camera_couloir_enregistrer'
      | 'switch.camera_couloir_enregistrement_manuel'
      | 'switch.camera_couloir_sonnerie_evenement_home_hub'
      | 'switch.camera_couloir_mode_prive'
      | 'update.camera_couloir_micrologiciel'
      | 'sensor.ble_rssi_2682f34fbcda4658854aa62e7e5e8b8d'
      | 'sensor.ble_measured_power_2682f34fbcda4658854aa62e7e5e8b8d'
      | 'sensor.ble_mac_2682f34fbcda4658854aa62e7e5e8b8d'
      | 'sensor.ble_major_2682f34fbcda4658854aa62e7e5e8b8d'
      | 'sensor.ble_minor_2682f34fbcda4658854aa62e7e5e8b8d'
      | 'button.luba_mnt23x9t_restart_mower'
      | 'update.home_assistant_supervisor_update_2'
      | 'update.home_assistant_core_update_2'
      | 'update.matter_server_mise_a_jour'
      | 'update.duck_dns_mise_a_jour'
      | 'update.mosquitto_broker_mise_a_jour'
      | 'update.terminal_ssh_mise_a_jour'
      | 'update.file_editor_mise_a_jour'
      | 'update.studio_code_server_mise_a_jour'
      | 'update.frigate_full_access_mise_a_jour_2'
      | 'update.zigbee2mqtt_mise_a_jour'
      | 'update.home_assistant_operating_system_update_2'
      | 'conversation.home_assistant_2'
      | 'event.backup_automatic_backup'
      | 'sensor.backup_backup_manager_state'
      | 'sensor.backup_next_scheduled_automatic_backup'
      | 'sensor.backup_last_successful_automatic_backup'
      | 'sensor.backup_last_attempted_automatic_backup'
      | 'zone.home_2'
      | 'input_number.electricity_ejp_price'
      | 'input_number.electricity_price'
      | 'input_number.menneville_temp_max_2'
      | 'input_number.menneville_temp_min_2'
      | 'person.thomas_2'
      | 'person.gregory'
      | 'person.lucie'
      | 'cover.volets_2'
      | 'sun.sun_2'
      | 'sensor.sun_next_dawn_2'
      | 'sensor.sun_next_dusk_2'
      | 'sensor.sun_next_midnight_2'
      | 'sensor.sun_next_noon_2'
      | 'sensor.sun_next_rising_2'
      | 'sensor.sun_next_setting_2'
      | 'sensor.prix_electricite'
      | 'todo.liste_dachats'
      | 'update.meross_integration_update'
      | 'update.meross_lan_update'
      | 'update.alarmo_card_update'
      | 'update.advanced_camera_card_update'
      | 'update.navbar_card_update_2'
      | 'update.hacs_update_2'
      | 'update.mushroom_update_2'
      | 'update.bubble_card_update_2'
      | 'update.frigate_update_3'
      | 'update.paper_buttons_row_update_2'
      | 'update.card_mod_update_2'
      | 'update.alarmo_update_2'
      | 'media_player.google_home_cuisine'
      | 'automation.aqara_w100_zigbee2mqtt_management'
      | 'automation.maj_forecast_meteo_2'
      | 'media_player.salle_a_manger'
      | 'tts.google_translate_en_com'
      | 'sensor.smart_roller_shutter_2302284143530070080248e1e9bc034e_signal_strength'
      | 'button.smart_roller_shutter_2302284143530070080248e1e9bc034e_refresh'
      | 'button.smart_roller_shutter_2302284143530070080248e1e9bc034e_reload'
      | 'number.smart_roller_shutter_2302284143530070080248e1e9bc034e_signalopen'
      | 'number.smart_roller_shutter_2302284143530070080248e1e9bc034e_signalclose'
      | 'light.smart_roller_shutter_2302284143530070080248e1e9bc034e_dnd'
      | 'sensor.smart_roller_shutter_2302286299014470080248e1e9bc02a6_signal_strength'
      | 'button.smart_roller_shutter_2302286299014470080248e1e9bc02a6_refresh'
      | 'button.smart_roller_shutter_2302286299014470080248e1e9bc02a6_reload'
      | 'number.smart_roller_shutter_2302286299014470080248e1e9bc02a6_signalopen'
      | 'number.smart_roller_shutter_2302286299014470080248e1e9bc02a6_signalclose'
      | 'light.smart_roller_shutter_2302286299014470080248e1e9bc02a6_dnd'
      | 'sensor.smart_roller_shutter_2302287738777570080248e1e9bbfd45_signal_strength'
      | 'button.smart_roller_shutter_2302287738777570080248e1e9bbfd45_refresh'
      | 'button.smart_roller_shutter_2302287738777570080248e1e9bbfd45_reload'
      | 'number.smart_roller_shutter_2302287738777570080248e1e9bbfd45_signalopen'
      | 'number.smart_roller_shutter_2302287738777570080248e1e9bbfd45_signalclose'
      | 'light.smart_roller_shutter_2302287738777570080248e1e9bbfd45_dnd'
      | 'sensor.smart_roller_shutter_2302284469415770080248e1e9bbf86d_signal_strength'
      | 'button.smart_roller_shutter_2302284469415770080248e1e9bbf86d_refresh'
      | 'button.smart_roller_shutter_2302284469415770080248e1e9bbf86d_reload'
      | 'number.smart_roller_shutter_2302284469415770080248e1e9bbf86d_signalopen'
      | 'number.smart_roller_shutter_2302284469415770080248e1e9bbf86d_signalclose'
      | 'light.smart_roller_shutter_2302284469415770080248e1e9bbf86d_dnd'
      | 'sensor.smart_roller_shutter_2302289092019570080248e1e9bbfadd_signal_strength'
      | 'button.smart_roller_shutter_2302289092019570080248e1e9bbfadd_refresh'
      | 'button.smart_roller_shutter_2302289092019570080248e1e9bbfadd_reload'
      | 'number.smart_roller_shutter_2302289092019570080248e1e9bbfadd_signalopen'
      | 'number.smart_roller_shutter_2302289092019570080248e1e9bbfadd_signalclose'
      | 'light.smart_roller_shutter_2302289092019570080248e1e9bbfadd_dnd'
      | 'sensor.smart_roller_shutter_2302282582331370080248e1e9bbfbab_signal_strength'
      | 'button.smart_roller_shutter_2302282582331370080248e1e9bbfbab_refresh'
      | 'button.smart_roller_shutter_2302282582331370080248e1e9bbfbab_reload'
      | 'number.smart_roller_shutter_2302282582331370080248e1e9bbfbab_signalopen'
      | 'number.smart_roller_shutter_2302282582331370080248e1e9bbfbab_signalclose'
      | 'light.smart_roller_shutter_2302282582331370080248e1e9bbfbab_dnd'
      | 'sensor.smart_roller_shutter_2302286436344770080248e1e9bbf674_signal_strength'
      | 'button.smart_roller_shutter_2302286436344770080248e1e9bbf674_refresh'
      | 'button.smart_roller_shutter_2302286436344770080248e1e9bbf674_reload'
      | 'number.smart_roller_shutter_2302286436344770080248e1e9bbf674_signalopen'
      | 'number.smart_roller_shutter_2302286436344770080248e1e9bbf674_signalclose'
      | 'light.smart_roller_shutter_2302286436344770080248e1e9bbf674_dnd'
      | 'sensor.smart_roller_shutter_2302289700514270080248e1e9bbfc66_signal_strength'
      | 'button.smart_roller_shutter_2302289700514270080248e1e9bbfc66_refresh'
      | 'button.smart_roller_shutter_2302289700514270080248e1e9bbfc66_reload'
      | 'number.smart_roller_shutter_2302289700514270080248e1e9bbfc66_signalopen'
      | 'number.smart_roller_shutter_2302289700514270080248e1e9bbfc66_signalclose'
      | 'light.smart_roller_shutter_2302289700514270080248e1e9bbfc66_dnd'
      | 'sensor.smart_roller_shutter_2302289720164270080248e1e9bbfbd6_signal_strength'
      | 'button.smart_roller_shutter_2302289720164270080248e1e9bbfbd6_refresh'
      | 'button.smart_roller_shutter_2302289720164270080248e1e9bbfbd6_reload'
      | 'number.smart_roller_shutter_2302289720164270080248e1e9bbfbd6_signalopen'
      | 'number.smart_roller_shutter_2302289720164270080248e1e9bbfbd6_signalclose'
      | 'light.smart_roller_shutter_2302289720164270080248e1e9bbfbd6_dnd'
      | 'sensor.smart_roller_shutter_2302285865346770080248e1e9bbfec4_signal_strength'
      | 'button.smart_roller_shutter_2302285865346770080248e1e9bbfec4_refresh'
      | 'button.smart_roller_shutter_2302285865346770080248e1e9bbfec4_reload'
      | 'number.smart_roller_shutter_2302285865346770080248e1e9bbfec4_signalopen'
      | 'number.smart_roller_shutter_2302285865346770080248e1e9bbfec4_signalclose'
      | 'light.smart_roller_shutter_2302285865346770080248e1e9bbfec4_dnd'
      | 'cover.smart_roller_shutter_2302286299014470080248e1e9bc02a6_shutter'
      | 'cover.smart_roller_shutter_2302284143530070080248e1e9bc034e_shutter'
      | 'cover.smart_roller_shutter_2302287738777570080248e1e9bbfd45_shutter'
      | 'cover.smart_roller_shutter_2302289092019570080248e1e9bbfadd_shutter'
      | 'cover.smart_roller_shutter_2302284469415770080248e1e9bbf86d_shutter'
      | 'cover.smart_roller_shutter_2302282582331370080248e1e9bbfbab_shutter'
      | 'cover.smart_roller_shutter_2302289720164270080248e1e9bbfbd6_shutter'
      | 'cover.smart_roller_shutter_2302286436344770080248e1e9bbf674_shutter'
      | 'cover.smart_roller_shutter_2302285865346770080248e1e9bbfec4_shutter'
      | 'cover.smart_roller_shutter_2302289700514270080248e1e9bbfc66_shutter'
      | 'alarm_control_panel.alarmo_2'
      | 'media_player.tv_salon'
      | 'binary_sensor.zigbee2mqtt_bridge_connection_state_3'
      | 'button.zigbee2mqtt_bridge_restart_2'
      | 'button.thermostat_identify'
      | 'climate.thermostat'
      | 'number.thermostat_external_temperature'
      | 'number.thermostat_external_humidity'
      | 'number.thermostat_high_temperature'
      | 'number.thermostat_low_temperature'
      | 'number.thermostat_high_humidity'
      | 'number.thermostat_low_humidity'
      | 'number.thermostat_period'
      | 'number.thermostat_temp_period'
      | 'number.thermostat_temp_threshold'
      | 'number.thermostat_humi_period'
      | 'number.thermostat_humi_threshold'
      | 'select.zigbee2mqtt_bridge_log_level_2'
      | 'select.thermostat_sensor'
      | 'select.thermostat_sampling'
      | 'select.thermostat_temp_report_mode'
      | 'select.thermostat_humi_report_mode'
      | 'sensor.zigbee2mqtt_bridge_version_2'
      | 'sensor.thermostat_pmtsd_from_w100_data'
      | 'sensor.thermostat_battery'
      | 'sensor.thermostat_temperature'
      | 'sensor.thermostat_humidity'
      | 'switch.zigbee2mqtt_bridge_permit_join_2'
      | 'switch.thermostat_thermostat_mode'
      | 'switch.thermostat_auto_hide_middle_line'
      | 'update.thermostat'
      | 'media_player.salon_2_2'
      | 'binary_sensor.ejp_aujourd_hui'
      | 'binary_sensor.ejp_demain'
      | 'sensor.ejp_jours_restants'
      | 'sensor.menneville_uv_2'
      | 'sensor.menneville_daily_precipitation_2'
      | 'sensor.menneville_cloud_cover_2'
      | 'sensor.menneville_humidity_2'
      | 'sensor.menneville_next_rain_2'
      | 'sensor.62_weather_alert_2'
      | 'sensor.menneville_rain_chance_2'
      | 'sensor.menneville_snow_chance_2'
      | 'sensor.menneville_freeze_chance_2'
      | 'weather.menneville_2'
      | 'weather.forecast_maison_2'
      | 'media_player.maison_3'
      | 'media_player.salon_5'
      | 'media_player.s95qr_185'
      | 'media_player.television_chambre'
      | 'media_player.reveil_3'
      | 'media_player.freebox_player_pop'
      | 'device_tracker.pixel_9_pro_xl_2'
      | 'sensor.pixel_9_pro_xl_battery_level_2'
      | 'sensor.pixel_9_pro_xl_battery_state_2'
      | 'sensor.pixel_9_pro_xl_charger_type_2'
      | 'device_tracker.iphone_de_lucie'
      | 'sensor.iphone_de_lucie_battery_level'
      | 'sensor.iphone_de_lucie_sim_1'
      | 'sensor.iphone_de_lucie_sim_2'
      | 'sensor.iphone_de_lucie_geocoded_location'
      | 'sensor.iphone_de_lucie_last_update_trigger'
      | 'sensor.iphone_de_lucie_location_permission'
      | 'sensor.iphone_de_lucie_app_version'
      | 'sensor.iphone_de_lucie_audio_output'
      | 'sensor.iphone_de_lucie_battery_state'
      | 'sensor.iphone_de_lucie_storage'
      | 'sensor.iphone_de_lucie_ssid'
      | 'sensor.iphone_de_lucie_bssid'
      | 'sensor.iphone_de_lucie_connection_type'
      | 'media_player.bureau'
      | 'update.remote_home_assistant_update_2'
      | 'sensor.calendrier_poubellebackup_backup_manager_state'
      | 'calendar.ics'
      | 'binary_sensor.backups_stale'
      | 'sensor.backup_state';
  }
}
