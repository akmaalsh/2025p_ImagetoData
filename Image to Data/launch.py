import os
import subprocess
import sys
import webbrowser
from pathlib import Path

def launch_servers():
    # Get the absolute path of the project directory
    project_dir = Path(__file__).parent.absolute()
    backend_dir = project_dir / "backend"
    frontend_dir = project_dir / "frontend"

    print("🚀 Launching Image to Data application...")

    # Launch backend server
    print("\n📡 Starting backend server...")
    backend_process = subprocess.Popen(
        ["node", "server.js"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait a moment for the backend to start
    import time
    time.sleep(2)

    # Launch frontend server
    print("🌐 Starting frontend server...")
    frontend_process = subprocess.Popen(
        ["npx", "serve", "."],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait a moment for the frontend to start and capture its output
    time.sleep(2)
    
    # Read the frontend server output to get the URL
    frontend_output = frontend_process.stdout.readline().decode('utf-8')
    # Usually serve outputs something like "Serving!..." on first line
    # and the URL on second line
    frontend_url = frontend_process.stdout.readline().decode('utf-8').strip()
    
    if "http" in frontend_url:
        url = frontend_url.split(" ")[-1]  # Get the last word which should be the URL
    else:
        url = "http://localhost:3001"  # Fallback URL

    # Open the browser
    print("\n✨ Opening browser...")
    webbrowser.open(url)

    print("\n✅ Application is running!")
    print(f"Frontend is available at: {url}")
    print("Backend is running at: http://localhost:3000")
    print("\nTo stop the servers, press Ctrl+C in this terminal window.")
    print("Note: You may need to close your browser window as well.")

    try:
        # Keep the script running and handle Ctrl+C
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("👋 Goodbye!")

if __name__ == "__main__":
    launch_servers() 