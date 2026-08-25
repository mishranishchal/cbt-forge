import { AdvancedReviewClient } from "@/components/review/AdvancedReviewClient";

export default async function ReviewTestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return <AdvancedReviewClient testId={testId} />;
}
