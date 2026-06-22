interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 lg:mb-8">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="text-xs font-medium text-slate-400 mb-2.5 tracking-wide">
            {breadcrumbs.join(" / ")}
          </nav>
        )}
        <h1 className="text-2xl lg:text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}
