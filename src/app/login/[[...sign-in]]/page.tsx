import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome!</h1>
                    </div>
                    <SignIn
                        redirectUrl="/nexi"
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "bg-transparent shadow-none p-0",
                                headerTitle: "text-white text-2xl font-bold",
                                headerSubtitle: "text-gray-300",
                                formButtonPrimary: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl",
                                formFieldInput: "bg-white/10 border border-white/20 text-white placeholder-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                                formFieldLabel: "text-gray-300 font-medium",
                                footerActionLink: "text-purple-300 hover:text-purple-200",
                                dividerLine: "bg-white/20",
                                dividerText: "text-gray-300",
                                socialButtonsBlockButton: "bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200",
                                socialButtonsBlockButtonText: "text-white",
                                formFieldAction: "text-purple-300 hover:text-purple-200",
                                footerAction: "text-gray-300",
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
