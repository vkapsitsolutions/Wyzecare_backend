import { TimezoneEnum } from 'src/organizations/enums/organization.enum';

// Mapper object for TimezoneEnum values to UI labels
export const timezoneLabelMap: Record<TimezoneEnum, string> = {
  [TimezoneEnum.AMERICA_NEW_YORK]: 'Eastern Time (ET)',
  [TimezoneEnum.AMERICA_CHICAGO]: 'Central Time (CT)',
  [TimezoneEnum.AMERICA_DENVER]: 'Mountain Time (MT)',
  [TimezoneEnum.AMERICA_LOS_ANGELES]: 'Pacific Time (PT)',
};

// Reverse mapper: UI labels to TimezoneEnum values
export const timezoneValueMap: Record<string, TimezoneEnum> = {
  'Eastern Time (ET)': TimezoneEnum.AMERICA_NEW_YORK,
  'Central Time (CT)': TimezoneEnum.AMERICA_CHICAGO,
  'Mountain Time (MT)': TimezoneEnum.AMERICA_DENVER,
  'Pacific Time (PT)': TimezoneEnum.AMERICA_LOS_ANGELES,
};
