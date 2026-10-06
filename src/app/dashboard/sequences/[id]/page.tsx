import { SequenceResults } from "@/components/sequences/sequence-results"

export default async function SequenceResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SequenceResults id={id} />
}
