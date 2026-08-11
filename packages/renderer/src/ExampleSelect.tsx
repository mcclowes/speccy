/**
 * ---
 * purpose: Renders the shared selector used to switch between named OpenAPI examples.
 * related:
 *   - ./OperationDetails.tsx - Uses the selector for request and response examples.
 *   - ./SchemaView.tsx - Uses the selector for named media examples.
 * ---
 */

import styles from './ExampleSelect.module.css';

export interface ExampleSelectOption {
  label: string;
  key?: string;
}

export function ExampleSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ExampleSelectOption[];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <select
      className={`sp-example-select ${styles.select}`}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {options.map((option, index) => (
        <option value={index} key={option.key ?? `${option.label}-${index}`}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
