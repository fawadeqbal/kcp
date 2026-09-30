import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link href="/" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
        Back to the overview
      </Link>
    </main>
  );
}
