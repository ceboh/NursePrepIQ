import { redirect } from 'next/navigation';

// Legacy topic page; practice now runs from the v2 question library.
export default function Page() {
  redirect('/practice/library?discipline=Adult%20Health');
}
