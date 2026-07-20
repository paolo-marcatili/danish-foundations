import type { ChangeEvent } from "react";
import type { BaseLanguage } from "@hero-lang/content-schema";
import { t } from "../i18n";

interface LanguageSelectorProps {
  languages: BaseLanguage[];
  value: string;
  onChange: (language: string) => void;
}

export function LanguageSelector({ languages, value, onChange }: LanguageSelectorProps) {
  return (
    <label className="language-selector">
      <span>{t(value, "chooseLanguage")}</span>
      <select value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.name_native}
          </option>
        ))}
      </select>
    </label>
  );
}
