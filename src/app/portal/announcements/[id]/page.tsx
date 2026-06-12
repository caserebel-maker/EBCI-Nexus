import { redirect } from 'next/navigation'

export default async function AnnouncementRedirectPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    redirect(`/portal/announcements?focus=${encodeURIComponent(id)}`)
}
