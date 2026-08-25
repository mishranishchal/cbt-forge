import { ResultClient } from "@/components/result/ResultClient";

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <ResultClient attemptId={attemptId} />;
}
