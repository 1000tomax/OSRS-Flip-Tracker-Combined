export default function SupportButton() {
  return (
    <a
      href="https://ko-fi.com/mreedon"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-44 z-40 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 group"
      title="Support this project"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
        <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
      </svg>
      <span className="text-sm font-medium">Support</span>
    </a>
  );
}
