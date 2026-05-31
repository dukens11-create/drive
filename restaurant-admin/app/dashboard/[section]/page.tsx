import { notFound } from 'next/navigation';
import { RestaurantSectionPage, sectionOrder } from '@/components/restaurant-console';

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sectionOrder.includes(section as (typeof sectionOrder)[number])) {
    notFound();
  }
  return <RestaurantSectionPage section={section as (typeof sectionOrder)[number]} />;
}
