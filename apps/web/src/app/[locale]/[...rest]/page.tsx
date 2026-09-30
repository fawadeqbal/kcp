import { notFound } from 'next/navigation';

// Any other address under a language (/en/nope) shows the not-found page in that
// language, inside the site's layout (with lang and dir set).
export default function CatchAll() {
  notFound();
}
