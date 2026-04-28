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

    const string PROTOVIBE_URL = "http://127.0.0.1:5173";

    static int Main() {
        try { SetCurrentProcessExplicitAppUserModelID("Protovibe.Studio.ProjectManager"); } catch {}
        try { Console.OutputEncoding = Encoding.UTF8; } catch {}
        Console.Title = "Protovibe";

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

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("   Starting dev server, please wait...");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("   The browser will open automatically when it is ready.");
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
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("   Keep this window open while using Protovibe.");
        Console.ResetColor();
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("   ▄▄▄▄▄▄▄▄                                        ▄▄");
        Console.WriteLine("   ███▀▀▀███                ██                 ▀▀  ██");
        Console.WriteLine("   ███   ███ ████▄ ▄█████▄ ▀██▀▀ ▄█████▄ ██ ██ ██  ████▄ ▄█▀█▄");
        Console.WriteLine("   ███  ▀▀▀  ██ ▀▀ ██   ██  ██   ██   ██ ██▄██ ██  ██ ██ ██▄█▀");
        Console.WriteLine("   ███       ██    ▀█████▀  ██   ▀█████▀  ▀█▀  ██▄ ████▀ ▀█▄▄▄");
        Console.ResetColor();
        Console.WriteLine();
    }
}
