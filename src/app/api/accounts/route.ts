import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 管理者判定: allowed_emails に自分のメールが入っていれば管理者
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { user: null, admin: false };
  const { data } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('email', user.email)
    .maybeSingle();
  return { user, admin: Boolean(data) };
}

type CreateBody = {
  email: string;
  password: string;
  role: 'admin' | 'store';
  storeId?: number;
  displayName?: string;
};

export async function POST(req: Request) {
  const { admin } = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  if (!email || !body.password || body.password.length < 6) {
    return NextResponse.json(
      { error: 'email と 6文字以上のパスワードが必要です' },
      { status: 400 },
    );
  }
  if (body.role !== 'admin' && body.role !== 'store') {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }
  if (body.role === 'store' && !body.storeId) {
    return NextResponse.json(
      { error: 'store role には storeId が必須' },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();

  // 1. Supabase Auth にユーザー作成 (既存なら ID を取得)
  let userId: string;
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
    });

  if (createError) {
    // 既に auth.users に存在する場合は既存ユーザーを使う
    if (createError.message?.toLowerCase().includes('already')) {
      const { data: list } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = list?.users.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (!existing) {
        return NextResponse.json(
          { error: `既存ユーザー取得失敗: ${createError.message}` },
          { status: 500 },
        );
      }
      userId = existing.id;
      // 新しいパスワードに更新
      await adminClient.auth.admin.updateUserById(existing.id, {
        password: body.password,
      });
    } else {
      return NextResponse.json(
        { error: `auth 作成失敗: ${createError.message}` },
        { status: 500 },
      );
    }
  } else {
    userId = created!.user!.id;
  }

  // 2. role に応じてマッピングテーブルに登録
  if (body.role === 'admin') {
    const { error } = await adminClient
      .from('allowed_emails')
      .upsert({ email }, { onConflict: 'email' });
    if (error) {
      return NextResponse.json(
        { error: `allowed_emails 登録失敗: ${error.message}` },
        { status: 500 },
      );
    }
  } else {
    const { error } = await adminClient.from('store_accounts').upsert(
      {
        email,
        store_id: body.storeId!,
        display_name: body.displayName ?? null,
      },
      { onConflict: 'email' },
    );
    if (error) {
      return NextResponse.json(
        { error: `store_accounts 登録失敗: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // 3. profile が無ければ作る (handle_new_user トリガーで作られてるはずだが保険)
  //    displayName 指定があればそれで上書き
  if (body.displayName) {
    await adminClient
      .from('profiles')
      .upsert(
        { id: userId, email, display_name: body.displayName },
        { onConflict: 'id' },
      );
  }

  return NextResponse.json({ ok: true, userId });
}

type DeleteBody = {
  email: string;
  role: 'admin' | 'store';
};

export async function DELETE(req: Request) {
  const { admin } = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: DeleteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: 'email が必要' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // マッピングテーブルから削除
  if (body.role === 'admin') {
    await adminClient.from('allowed_emails').delete().eq('email', email);
  } else {
    await adminClient.from('store_accounts').delete().eq('email', email);
  }

  // auth.users からも削除 (profile は on delete cascade で自動削除)
  const { data: list } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    await adminClient.auth.admin.deleteUser(existing.id);
  }

  return NextResponse.json({ ok: true });
}

// 表示名 or パスワード更新
type PatchBody = {
  userId: string;
  displayName?: string;
  password?: string;
};

export async function PATCH(req: Request) {
  const { admin } = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: 'userId が必要' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (body.displayName !== undefined) {
    const { error } = await adminClient
      .from('profiles')
      .update({ display_name: body.displayName })
      .eq('id', body.userId);
    if (error) {
      return NextResponse.json(
        { error: `profile 更新失敗: ${error.message}` },
        { status: 500 },
      );
    }
  }

  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは 6 文字以上' },
        { status: 400 },
      );
    }
    const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
      password: body.password,
    });
    if (error) {
      return NextResponse.json(
        { error: `パスワード更新失敗: ${error.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
