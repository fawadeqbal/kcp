import { buttonClass } from '@kcp/ui';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
      <p
        aria-hidden="true"
        className="grid size-32 place-items-center rounded-full bg-brand-100 font-display text-5xl text-brand-text"
      >
        404
      </p>
      <h1 className="text-3xl">Page not found</h1>
      <Link href="/" className={buttonClass('primary')}>
        Back to the overview
      </Link>
    </main>
  );
}
