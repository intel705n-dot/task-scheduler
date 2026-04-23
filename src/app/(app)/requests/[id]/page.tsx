import RequestDetailClient from './RequestDetailClient';

type Params = Promise<{ id: string }>;

export default async function AdminRequestDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  return <RequestDetailClient requestId={id} />;
}
