import { notFound } from 'next/navigation';

// Any other address under a language (/en/nope) shows the not-found page in that language.
export default function CatchAll() {
  notFound();
}
