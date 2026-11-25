import { Menu, Wind, X } from 'lucide-react';
import { useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

export const DASHBOARD_NAV_SECTIONS: NavSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'daily-plan', label: 'Daily Plan' },
  { id: 'indoor-air', label: 'Indoor Air' },
  { id: 'mobility-impact', label: 'Mobility & Impact' },
  { id: 'safety-settings', label: 'Safety & Settings' },
];

interface HeaderProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onFocusForm: () => void;
}

export function Header({ activeSection, onNavigate, onFocusForm }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigate(sectionId);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('overview');
          }}
          className="inline-flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          <Wind className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <span>CleanAir Companion</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary dashboard sections" className="hidden lg:flex items-center gap-6">
          {DASHBOARD_NAV_SECTIONS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                aria-current={isActive ? 'location' : undefined}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action + mobile menu toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onFocusForm();
            }}
            className="inline-flex min-h-[40px] items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
          >
            Update Plan
          </button>

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="Mobile dashboard sections"
          className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {DASHBOARD_NAV_SECTIONS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.id);
                    }}
                    aria-current={isActive ? 'location' : undefined}
                    className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium ${
                      isActive
                        ? 'bg-teal-50 text-teal-900'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
