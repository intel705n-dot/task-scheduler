import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 店舗スタッフが認証なしで触れる公開パス。
// / (ランディング), /select (プリセット選択), /new (依頼フォーム),
// /my/:token, /request/:id の 5 種は匿名公開ルート。
// /my (ログインユーザー用マイページ) は内部でさらに role 判定をする。
const PUBLIC_PREFIXES = ['/select', '/new', '/my', '/request'];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Public paths are always allowed
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/calendar';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
