const LOCALIZATION_PREFIX = "TRAVELLER_SCENES";

type LocalizationValues = Record<string, string | number | boolean | null | undefined>;

function getLocalizationKey(key: string): string {
  return `${LOCALIZATION_PREFIX}.${key}`;
}

function toFormatValues(values: LocalizationValues): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value == null ? "" : String(value)])
  );
}

export function localize(key: string): string {
  const localizationKey = getLocalizationKey(key);
  return game.i18n?.localize(localizationKey) ?? localizationKey;
}

export function formatLocalize(key: string, values: LocalizationValues = {}): string {
  const localizationKey = getLocalizationKey(key);
  return game.i18n?.format(localizationKey, toFormatValues(values)) ?? localizationKey;
}
