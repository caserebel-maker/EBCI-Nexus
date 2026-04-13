import { redirect } from 'next/navigation'

// Canonical employee dashboard is at /portal — redirect here for cleanliness
export default function PortalDashboardRedirect() {
    redirect('/portal')
}
