import { ApplyForm } from './apply-form'

export const dynamic = 'force-dynamic'

interface SearchParams {
    ref?: string
    step?: string
    position?: string
}

export default async function ApplyPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const sp = await searchParams
    const initialRef = sp.ref?.trim() ? sp.ref.trim().toUpperCase() : null
    const initialPosition = sp.position?.trim() ? sp.position.trim() : null
    const stepParam = parseInt(sp.step ?? '1', 10)
    const initialStep = Number.isFinite(stepParam) && stepParam >= 1 && stepParam <= 5 ? stepParam : 1

    return <ApplyForm initialRef={initialRef} initialStep={initialStep} initialPosition={initialPosition} />
}
