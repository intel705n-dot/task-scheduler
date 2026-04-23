'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLatestStoredToken } from '@/lib/request-utils';

export default function MyRequestsShortcut() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(getLatestStoredToken());
  }, []);
  if (!token) return null;
  return (
    <div className="mt-10 flex justify-center">
      <Link
        href={`/my/${token}`}
        className="inline-flex items-center gap-2 text-sm text-gray-700 underline-offset-4 hover:underline"
      >
        自分の依頼を見る
      </Link>
    </div>
  );
}
