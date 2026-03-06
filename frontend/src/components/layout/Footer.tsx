import Link from 'next/link';

const recommendLinks = [
  { label: 'IT PMO', href: '#' },
  { label: 'LSSC', href: '#' },
  { label: 'IT Service Portal', href: '#' },
  { label: 'Enterprise Architecture', href: '#' },
  { label: 'Lenovo DevOps', href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-border-light">
      {/* Recommend Links */}
      <div className="px-6 py-4 border-b border-border-light">
        <h3 className="text-sm font-medium text-text-primary mb-3">Recommend Links</h3>
        <div className="flex flex-wrap gap-3">
          {recommendLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-primary-blue hover:text-primary-blue-hover transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Contact & Copyright */}
      <div className="px-6 py-3 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-4">
          <span>Contact Us: <a href="mailto:EA@lenovo.com" className="text-primary-blue hover:text-primary-blue-hover">EA@lenovo.com</a></span>
        </div>
        <span>&copy; {new Date().getFullYear()} Lenovo. All rights reserved.</span>
      </div>
    </footer>
  );
}
