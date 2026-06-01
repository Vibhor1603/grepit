import Link from "next/link";

const SECTIONS = [
  {
    href: "/internal-admin/email",
    title: "Email",
    description: "Compose and send product emails to users.",
  },
  {
    href: "/internal-admin/feedback",
    title: "Deletion feedback",
    description: "Read anonymized reasons when users delete their accounts.",
  },
];

export default function InternalAdminHomePage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <p className="text-sm text-neutral-600 mb-6">
        Local development only. Pick a section from the sidebar or below.
      </p>
      <ul className="space-y-3">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block rounded-lg border border-neutral-200 bg-white px-5 py-4 hover:border-neutral-300 transition-colors"
            >
              <p className="text-sm font-medium text-neutral-900">{section.title}</p>
              <p className="text-sm text-neutral-500 mt-1">{section.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
