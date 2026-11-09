import Link from "next/link";

const fieldClass = "w-full border border-line bg-white px-3 py-2 text-sm";

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6 max-w-3xl">
      <h1 className="font-serif text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-stone-700">{description}</p>
    </header>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className={fieldClass}
      />
      {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <textarea name={name} defaultValue={defaultValue} rows={3} className={fieldClass} />
      {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={defaultValue} className={fieldClass} required>
        {children}
      </select>
    </label>
  );
}

export function Checks({
  legend,
  name,
  options,
  selected = [],
}: {
  legend: string;
  name: string;
  options: { value: string; label: string; hint?: string }[];
  selected?: string[];
}) {
  if (options.length === 0) return <p className="text-sm text-stone-600">No choices are available.</p>;
  return (
    <fieldset className="grid gap-2 border border-line bg-panel p-3">
      <legend className="px-1 text-sm font-medium">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name={name}
            value={option.value}
            defaultChecked={selected.includes(option.value)}
            className="mt-1"
          />
          <span>
            {option.label}
            {option.hint ? <span className="block text-xs text-stone-500">{option.hint}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function StatusText({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return <span className={active ? "text-good" : "text-stone-500"}>{active ? "Active" : "Inactive"}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-stone-600">{children}</p>;
}

export function Table({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto border border-line bg-panel">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-line px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({
  page,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Pagination">
      <p>
        Page {page} of {pages}
      </p>
      <div className="flex gap-4">
        {page > 1 ? <Link href={hrefFor(page - 1)}>Previous</Link> : <span className="text-stone-400">Previous</span>}
        {page < pages ? <Link href={hrefFor(page + 1)}>Next</Link> : <span className="text-stone-400">Next</span>}
      </div>
    </nav>
  );
}

export function SearchForm({
  action,
  q,
  children,
}: {
  action: string;
  q?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Search</span>
        <input name="q" defaultValue={q} className={fieldClass} />
      </label>
      {children}
      <button type="submit" className="border border-line bg-panel px-3 py-2 text-sm">
        Apply
      </button>
    </form>
  );
}

export function RecordLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-copper underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 border border-line bg-panel p-4">
      <h2 className="mb-4 font-serif text-xl">{title}</h2>
      {children}
    </section>
  );
}

export function ConfirmRetire({ id }: { id: string }) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" required />
        I understand this hides the record from normal lists.
      </label>
    </>
  );
}
