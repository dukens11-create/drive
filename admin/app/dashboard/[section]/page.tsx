import { notFound } from 'next/navigation';
import { AdminSectionPage, sectionOrder } from '@/components/admin-console';

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sectionOrder.includes(section as (typeof sectionOrder)[number])) {
    notFound();
  }
  return <AdminSectionPage section={section as (typeof sectionOrder)[number]} />;
}
