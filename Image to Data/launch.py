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

    # Wait a moment for the frontend to start
    time.sleep(2)

    # Open the browser
    print("\n✨ Opening browser...")
    webbrowser.open('http://localhost:3000')

    print("\n✅ Application is running!")
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