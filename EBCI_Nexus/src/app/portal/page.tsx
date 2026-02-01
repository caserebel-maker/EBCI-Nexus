import { UserCircle, Fingerprint, Calendar } from 'lucide-react'

export default function EmployeePortal() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="h-32 bg-[#882136]"></div>
                <div className="px-6 pb-6">
                    <div className="relative flex justify-between items-end -mt-12 mb-4">
                        <div className="h-24 w-24 rounded-full bg-white p-1 shadow-md">
                            <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center">
                                <UserCircle size={48} className="text-gray-400" />
                            </div>
                        </div>
                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                            Edit Profile
                        </button>
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">John Doe</h1>
                        <p className="text-gray-500">Software Engineer • IT Department</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <UserCircle size={18} /> Personal Information
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Employee ID</span>
                            <span className="font-medium text-gray-900">EBCI-0089</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Email</span>
                            <span className="font-medium text-gray-900">john.doe@ebcinext.com</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Phone</span>
                            <span className="font-medium text-gray-900">089-123-4567</span>
                        </div>
                    </div>
                </div>

                {/* Biometric Status */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Fingerprint size={18} /> Biometric & Security
                    </h3>

                    <div className="bg-green-50 rounded-md p-4 flex items-start gap-3 border border-green-100">
                        <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                            <Fingerprint size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-green-800">Fingerprint Registered</h4>
                            <p className="text-xs text-green-600 mt-1">
                                Your biometric data was successfully linked on Jan 15, 2025.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 bg-gray-50 rounded-md p-4 flex items-center justify-between border border-gray-100">
                        <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Last Login</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">Today, 09:00 AM</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
