/**
 * MainLayout serves as a basic wrapper for the authenticated application area.
 * It provides a consistent background and min-height for all main pages.
 *
 * @param children - The page content to be rendered within the main layout
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
