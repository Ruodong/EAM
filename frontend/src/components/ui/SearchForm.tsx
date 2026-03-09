'use client';

import { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { useT } from '@/lib/locale';
import { MultiSelect } from './MultiSelect';

export interface SearchField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'combobox';
  placeholder?: string;
  options?: { label: string; value: string }[];
}

type FormValues = Record<string, string | string[]>;

interface SearchFormProps {
  fields: SearchField[];
  initialValues?: Record<string, string>;
  onSearch: (values: Record<string, string>) => void;
  onReset: () => void;
}

export function SearchForm({ fields, initialValues, onSearch, onReset }: SearchFormProps) {
  const t = useT();
  const getInitialValues = (): FormValues => {
    const vals: FormValues = {};
    fields.forEach((f) => {
      if (f.type === 'multiselect') {
        vals[f.key] = initialValues?.[f.key] ? initialValues[f.key].split(',') : [];
      } else {
        vals[f.key] = initialValues?.[f.key] ?? '';
      }
    });
    return vals;
  };

  const [values, setValues] = useState<FormValues>(getInitialValues);

  const handleChange = (key: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    // Flatten: join arrays as comma-separated strings for API compatibility
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      flat[k] = Array.isArray(v) ? v.join(',') : v;
    }
    onSearch(flat);
  };

  const handleReset = () => {
    setValues(getInitialValues());
    onReset();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="bg-white rounded-lg border border-border-light p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs text-text-secondary mb-1">{t(field.label)}</label>
            {field.type === 'multiselect' ? (
              <MultiSelect
                options={(field.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
                value={Array.isArray(values[field.key]) ? values[field.key] as string[] : []}
                onChange={(selected) => handleChange(field.key, selected)}
                placeholder={field.placeholder || t('All')}
                maxDisplay={2}
              />
            ) : field.type === 'select' ? (
              <select
                value={values[field.key] as string}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="select-field"
              >
                <option value="">{t('All')}</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'combobox' ? (
              <>
                <input
                  type="text"
                  list={`datalist-${field.key}`}
                  value={values[field.key] as string}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={field.placeholder || `Select or type ${field.label}`}
                  className="combobox-field"
                />
                <datalist id={`datalist-${field.key}`}>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </datalist>
              </>
            ) : field.type === 'date' ? (
              <input
                type="date"
                value={values[field.key] as string}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="input-field"
              />
            ) : (
              <input
                type="text"
                value={values[field.key] as string}
                onChange={(e) => handleChange(field.key, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={field.placeholder || `Enter ${field.label}`}
                className="input-field"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={handleSearch} className="btn-primary flex items-center gap-1.5 !px-4 !py-1.5 text-sm">
          <Search className="w-3.5 h-3.5" />
          {t('Search')}
        </button>
        <button onClick={handleReset} className="btn-default flex items-center gap-1.5 !px-4 !py-1.5 text-sm">
          <RotateCcw className="w-3.5 h-3.5" />
          {t('Reset')}
        </button>
      </div>
    </div>
  );
}
