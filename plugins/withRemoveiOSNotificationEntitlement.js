const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const withRemoveiOSNotificationEntitlement = (config) => {
  config = withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
  
  config = withInfoPlist(config, (config) => {
      const modes = config.modResults.UIBackgroundModes || [];
      const newModes = modes.filter(mode => mode !== 'remote-notification');
      config.modResults.UIBackgroundModes = newModes;
      return config;
  });

  return config;
};

module.exports = withRemoveiOSNotificationEntitlement;
