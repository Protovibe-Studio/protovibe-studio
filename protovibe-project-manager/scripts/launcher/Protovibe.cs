// Protovibe launcher — compiled to Protovibe.exe at install time by
// create-shortcut.js. The icon is embedded via csc /win32icon, so the taskbar,
// Alt-Tab, and pinned shortcuts all render the Protovibe icon instead of the
// generic cmd.exe one. Path-independent: reads %USERPROFILE%\.protovibe\project-path
// at runtime, mirroring the .bat launcher it replaces.
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;

static class Protovibe {
    [DllImport("shell32.dll")]
    static extern int SetCurrentProcessExplicitAppUserModelID(
        [MarshalAs(UnmanagedType.LPWStr)] string AppID);

    [DllImport("kernel32.dll")]
    static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern uint ExtractIconEx(string lpszFile, int nIconIndex,
        IntPtr[] phiconLarge, IntPtr[] phiconSmall, uint nIcons);

    const uint WM_SETICON = 0x80;
    const int ICON_SMALL = 0;
    const int ICON_BIG = 1;

    const string PROTOVIBE_URL = "http://127.0.0.1:5173";

    // The console window inherits its icon from the host process (conhost.exe
    // or wt.exe), not from us. Force the taskbar/title-bar icon to our own by
    // extracting the icon resource from this exe and sending it via WM_SETICON.
    static void ApplyConsoleIcon() {
        try {
            IntPtr hwnd = GetConsoleWindow();
            if (hwnd == IntPtr.Zero) return;
            string self = Process.GetCurrentProcess().MainModule.FileName;
            var big = new IntPtr[1];
            var small = new IntPtr[1];
            ExtractIconEx(self, 0, big, small, 1);
            if (big[0] != IntPtr.Zero)
                SendMessage(hwnd, WM_SETICON, (IntPtr)ICON_BIG, big[0]);
            if (small[0] != IntPtr.Zero)
                SendMessage(hwnd, WM_SETICON, (IntPtr)ICON_SMALL, small[0]);
        } catch {}
    }

    static int Main() {
        // If Windows Terminal is hosting us (system default on Win11), re-spawn
        // ourselves under conhost.exe and exit. The shortcut already routes
        // through conhost, but a direct double-click on the .exe goes through
        // whatever the user has set as the default terminal — which is usually
        // wt.exe, has tabs, and uses its own taskbar icon. WT_SESSION is set
        // by Windows Terminal for every hosted process, so it's the canonical
        // way to detect that case. Conhost does not set it, so the relaunched
        // copy won't loop.
        if (Environment.GetEnvironmentVariable("WT_SESSION") != null) {
            try {
                string self = Process.GetCurrentProcess().MainModule.FileName;
                var relaunch = new ProcessStartInfo("conhost.exe", "\"" + self + "\"") {
                    UseShellExecute = false,
                    CreateNoWindow = false,
                };
                // Strip WT_* so the child doesn't think it's still under WT.
                relaunch.EnvironmentVariables.Remove("WT_SESSION");
                relaunch.EnvironmentVariables.Remove("WT_PROFILE_ID");
                Process.Start(relaunch);
                return 0;
            } catch {
                // If conhost relaunch fails for any reason, fall through and
                // run in WT — degraded UX is better than a broken launch.
            }
        }

        try { SetCurrentProcessExplicitAppUserModelID("Protovibe.Studio.ProjectManager"); } catch {}
        try { Console.OutputEncoding = Encoding.UTF8; } catch {}
        Console.Title = "Protovibe";
        ApplyConsoleIcon();

        string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        string cfg = Path.Combine(home, ".protovibe", "project-path");
        if (!File.Exists(cfg)) {
            Console.WriteLine("Protovibe is not configured.");
            Console.WriteLine("Run install.bat from the Protovibe project directory first.");
            Pause();
            return 1;
        }
        string root = File.ReadAllText(cfg).Trim();
        if (!Directory.Exists(root)) {
            Console.WriteLine("Protovibe folder not found at: " + root);
            Console.WriteLine("If you moved it, re-run install.bat from the new location.");
            Pause();
            return 1;
        }

        PrintBanner();

        if (IsAlreadyRunning(PROTOVIBE_URL + "/api/projects")) {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("   Already running -- opening browser...");
            Console.ResetColor();
            try {
                Process.Start(new ProcessStartInfo(PROTOVIBE_URL) { UseShellExecute = true });
            } catch {}
            return 0;
        }

        ApplyStagedManagerUpdate(root);

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("   Open your browser and go to URL: " + PROTOVIBE_URL);
        Console.ResetColor();
        Console.WriteLine();

        // pnpm.cmd is a batch file, so it must run via cmd.exe. UseShellExecute=false
        // with no redirection lets the child inherit our console handles, so its
        // output streams into this same window.
        var psi = new ProcessStartInfo("cmd.exe", "/c pnpm --dir protovibe-project-manager dev") {
            UseShellExecute = false,
            WorkingDirectory = root,
        };
        psi.EnvironmentVariables["NODE_NO_WARNINGS"] = "1";
        try {
            using (var p = Process.Start(psi)) {
                p.WaitForExit();
                if (p.ExitCode != 0) {
                    Console.WriteLine();
                    Console.WriteLine("Dev server exited with an error.");
                    Pause();
                }
                return p.ExitCode;
            }
        } catch (Exception ex) {
            Console.WriteLine("Failed to start dev server: " + ex.Message);
            Pause();
            return 1;
        }
    }

    // The /api/update-app handler stages manager updates to a sibling
    // .pending dir so the running vite never sees its own files change. Apply
    // the swap here, before vite boots, and reconcile deps via pnpm install.
    // node_modules is preserved across the swap so install is fast when deps
    // are unchanged.
    static void ApplyStagedManagerUpdate(string root) {
        try {
            string pmDir = Path.Combine(root, "protovibe-project-manager");
            string pending = pmDir + ".pending";
            string oldDir = pmDir + ".old";
            if (!Directory.Exists(pending)) return;

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("   Applying staged project-manager update...");
            Console.ResetColor();

            string pmNm = Path.Combine(pmDir, "node_modules");
            string pendingNm = Path.Combine(pending, "node_modules");
            if (Directory.Exists(pmNm) && !Directory.Exists(pendingNm)) {
                Directory.Move(pmNm, pendingNm);
            }

            if (Directory.Exists(oldDir)) Directory.Delete(oldDir, true);
            Directory.Move(pmDir, oldDir);
            try {
                Directory.Move(pending, pmDir);
            } catch (Exception ex) {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("   Failed to apply staged update: " + ex.Message);
                Console.ResetColor();
                if (!Directory.Exists(pmDir) && Directory.Exists(oldDir)) Directory.Move(oldDir, pmDir);
                return;
            }
            try { Directory.Delete(oldDir, true); } catch {}

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("   Installing dependencies...");
            Console.ResetColor();
            var install = new ProcessStartInfo("cmd.exe", "/c pnpm --dir protovibe-project-manager install --prefer-offline") {
                UseShellExecute = false,
                WorkingDirectory = root,
            };
            try {
                using (var p = Process.Start(install)) { p.WaitForExit(); }
            } catch (Exception ex) {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("   pnpm install failed: " + ex.Message);
                Console.ResetColor();
            }
        } catch (Exception ex) {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("   Could not apply staged update: " + ex.Message);
            Console.ResetColor();
        }
    }

    static bool IsAlreadyRunning(string url) {
        try {
            var req = (HttpWebRequest)WebRequest.Create(url);
            req.Timeout = 2000;
            req.Method = "GET";
            using (var resp = (HttpWebResponse)req.GetResponse()) {
                return (int)resp.StatusCode < 400;
            }
        } catch { return false; }
    }

    static void Pause() {
        Console.WriteLine("Press any key to close...");
        try { Console.ReadKey(true); } catch {}
    }

    static void PrintBanner() {
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("   ▄▄▄▄▄▄▄▄                                        ▄▄");
        Console.WriteLine("   ███▀▀▀███                ██                 ▀▀  ██");
        Console.WriteLine("   ███   ███ ████▄ ▄█████▄ ▀██▀▀ ▄█████▄ ██ ██ ██  ████▄ ▄█▀█▄");
        Console.WriteLine("   ███  ▀▀▀  ██ ▀▀ ██   ██  ██   ██   ██ ██▄██ ██  ██ ██ ██▄█▀");
        Console.WriteLine("   ███       ██    ▀█████▀  ██   ▀█████▀  ▀█▀  ██▄ ████▀ ▀█▄▄▄");
        Console.ResetColor();
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("   Keep this window open while using Protovibe in your browser.");
        Console.ResetColor();
        Console.WriteLine();
    }
}
