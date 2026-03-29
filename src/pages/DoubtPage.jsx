import useAppStore from '../stores/appStore';
import Sidebar from '../components/ui/Sidebar';

export default function DoubtPage() {
    const { setCurrentPage } = useAppStore();

    const steps = [
        {
            title: "Download Ollama",
            content: "Visit ollama.com and download the application for your operating system (Windows, macOS, or Linux).",
            cmd: null
        },
        {
            title: "Install a Model",
            content: "Open your terminal (Command Prompt, PowerShell, or Terminal) and run the pull command for the model you want. For example, to add Qwen 2.5 Coder:",
            cmd: "ollama pull qwen2.5-coder:7b"
        },
        {
            title: "Verify it's Running",
            content: "Make sure the Ollama server is running. You can check this by running:",
            cmd: "ollama list"
        },
        {
            title: "Configure Tyloop",
            content: "Go to the Settings page in Tyloop and select the model you just downloaded. It must match exactly!",
            cmd: null
        }
    ];

    return (
        <div className="h-full w-full flex overflow-hidden bg-background">
            <Sidebar />

            <main className="flex-1 overflow-y-auto p-6 lg:p-12">
                <div className="max-w-3xl mx-auto space-y-12">
                    <header className="space-y-1">
                        <button
                            onClick={() => setCurrentPage('dashboard')}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4 flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            Back to Chat
                        </button>
                        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">How to use Ollama with Tyloop</h1>
                        <p className="text-zinc-400">Follow these steps to set up local AI models on your machine.</p>
                    </header>

                    <div className="grid gap-6">
                        {steps.map((step, i) => (
                            <div key={i} className="flex gap-6 p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-50 shrink-0 border border-zinc-700">
                                    {i + 1}
                                </div>
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-zinc-50 text-lg">{step.title}</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">{step.content}</p>
                                    {step.cmd && (
                                        <div className="group relative">
                                            <code className="block p-3 bg-black rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300">
                                                {step.cmd}
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(step.cmd)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-zinc-800 rounded-md transition-all text-zinc-500 hover:text-zinc-50"
                                                title="Copy to clipboard"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <footer className="p-8 bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto border border-zinc-800">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                        </div>
                        <h4 className="font-semibold text-zinc-50">Ready to go?</h4>
                        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                            Once you've pulled your models and have Ollama running in the background, Tyloop will automatically connect to them.
                        </p>
                        <button
                            onClick={() => setCurrentPage('settings')}
                            className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-all text-sm"
                        >
                            Configure Models
                        </button>
                    </footer>
                </div>
            </main>
        </div>
    );
}
