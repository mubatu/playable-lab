import { BadgeInfo, CircleArrowDown, Gauge, Grid3X3, Hand, ImageIcon, MonitorSmartphone, Music2, PanelTop, SlidersHorizontal, Sparkles, Target, Trophy, Volume2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { AssetOptionsById, ConfigGroup } from '../../appTypes';
import type { ConfigField } from '../../types';
import { FieldShell } from '../../components/ui';
import { valueAsInput } from '../../lib/appUtils';

const sectionIconMap = {
  BadgeInfo,
  CircleArrowDown,
  Gauge,
  Grid3X3,
  Hand,
  ImageIcon,
  MonitorSmartphone,
  Music2,
  PanelTop,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  Volume2
};

export function ParameterSection({
  group,
  values,
  assetOptionsById,
  onUpdate
}: {
  group: ConfigGroup;
  values: Record<string, unknown>;
  assetOptionsById: AssetOptionsById;
  onUpdate: (path: string, value: unknown) => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200">
      <div className="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SectionIcon icon={group.icon} />
          <h4 className="font-semibold text-zinc-950">{group.label}</h4>
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {group.fields.length} standard · {group.advancedFields.length} advanced
        </span>
      </div>
      {group.fields.length > 0 ? (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {group.fields.map((field) => (
            <ConfigInput key={field.path} field={field} value={values[field.path] ?? field.default} assetOptionsById={assetOptionsById} onUpdate={onUpdate} />
          ))}
        </div>
      ) : null}
      {group.advancedFields.length > 0 ? (
        <details className="border-t border-zinc-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-blue-700">Advanced</summary>
          <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
            {group.advancedFields.map((field) => (
              <ConfigInput key={field.path} field={field} value={values[field.path] ?? field.default} assetOptionsById={assetOptionsById} onUpdate={onUpdate} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function SectionIcon({ icon }: { icon?: string }) {
  const Icon = icon && icon in sectionIconMap ? sectionIconMap[icon as keyof typeof sectionIconMap] : SlidersHorizontal;

  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
      <Icon className="size-4" />
    </span>
  );
}

function ConfigInput({
  field,
  value,
  assetOptionsById,
  onUpdate
}: {
  field: ConfigField;
  value: unknown;
  assetOptionsById: AssetOptionsById;
  onUpdate: (path: string, value: unknown) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3">
        <span>
          <span className="block text-sm font-semibold text-zinc-900">{field.label}</span>
          {field.description ? <span className="mt-1 block text-xs leading-5 text-zinc-500">{field.description}</span> : null}
        </span>
        <input className="mt-0.5 size-5 accent-blue-600" id={field.path} name={field.path} type="checkbox" checked={Boolean(value)} onChange={(event) => onUpdate(field.path, event.target.checked)} />
      </label>
    );
  }

  const common = {
    id: field.path,
    name: field.path,
    value: valueAsInput(value),
    onChange: (event: ChangeEvent<HTMLInputElement>) => onUpdate(field.path, field.type === 'number' ? Number(event.target.value) : event.target.value)
  };

  if (field.control === 'asset-select') {
    const options = field.optionsFromAsset ? assetOptionsById[field.optionsFromAsset] || [] : [];
    const selectedValue = Number(value ?? options[0]?.value ?? 0);
    const selectedOption = options.find((option) => option.value === selectedValue);

    return (
      <FieldShell label={field.label} hint={field.description}>
        <div className="grid gap-2 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-center">
          <span className="grid size-14 place-items-center overflow-hidden rounded-md border border-zinc-200 bg-white">
            {selectedOption?.previewUrl ? (
              <img className="h-full w-full object-contain" src={selectedOption.previewUrl} alt="" />
            ) : (
              <ImageIcon className="size-5 text-zinc-400" />
            )}
          </span>
          <select
            className="input"
            id={field.path}
            name={field.path}
            value={String(selectedValue)}
            disabled={options.length === 0}
            onChange={(event) => onUpdate(field.path, field.type === 'number' ? Number(event.target.value) : event.target.value)}
          >
            {options.length === 0 ? (
              <option value={String(selectedValue)}>Upload object images first</option>
            ) : (
              options.map((option) => (
                <option key={`${option.value}-${option.label}`} value={option.value}>
                  {option.value + 1}. {option.label}
                </option>
              ))
            )}
          </select>
        </div>
      </FieldShell>
    );
  }

  return (
    <FieldShell label={field.label} hint={field.description}>
      {field.type === 'number' && field.control !== 'input' && Number.isFinite(field.min) && Number.isFinite(field.max) ? (
        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
          <input
            className="range-input"
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={Number(value ?? 0)}
            onChange={(event) => onUpdate(field.path, Number(event.target.value))}
          />
          <input className="input" {...common} type="number" min={field.min} max={field.max} step={field.step ?? 1} />
        </div>
      ) : (
        <input className={field.type === 'color' ? 'color-input' : 'input'} {...common} type={field.type === 'color' ? 'color' : field.type === 'number' ? 'number' : 'text'} step={field.type === 'number' ? field.step ?? 'any' : undefined} />
      )}
    </FieldShell>
  );
}
