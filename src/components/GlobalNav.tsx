import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface GlobalNavProps {
  theme?: 'light' | 'dark';
}

export const GlobalNav = ({ theme }: GlobalNavProps) => {
  const navigate = useNavigate();
  // Auto-adapt: ivory over dark/olive sections, near-black over light.
  const [dark, setDark] = useState(theme === 'dark');

  useEffect(() => {
    const check = () => {
      const y = 26; // ~vertical center of the fixed nav
      let onDark = false;
      document.querySelectorAll('[data-nav-dark]').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.top <= y && r.bottom >= y) onDark = true;
      });
      setDark(onDark);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const textColor = dark ? 'text-primary-foreground' : 'text-foreground';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`text-lg sm:text-xl md:text-2xl font-poppins font-semibold tracking-tight transition-colors duration-300 hover:opacity-70 ${textColor}`}
        >
          Diagassist
        </button>
      </div>
    </div>
  );
};
