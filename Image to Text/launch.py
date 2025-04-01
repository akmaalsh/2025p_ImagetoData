import os
import subprocess
import sys
import webbrowser
import time
from pathlib import Path

def launch_servers():
    # Get the absolute path of the project directory
    project_dir = Path(__file__).parent.absolute()
    backend_dir = project_dir / "backend"
    frontend_dir = project_dir / "frontend"

    print("🚀 Launching Image to Text application...")

    # Launch backend server
    print("\n📡 Starting backend server...")
    backend_process = subprocess.Popen(
        ["node", "server.js"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    # Wait and check if backend started successfully
    time.sleep(2)
    backend_output = backend_process.stdout.readline().strip()
    print(f"Backend: {backend_output}")

    # Launch frontend server
    print("\n🌐 Starting frontend server...")
    frontend_process = subprocess.Popen(
        ["npx", "serve"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    # Wait for frontend to start and get the URL
    frontend_url = None
    start_time = time.time()
    while time.time() - start_time < 10:  # Wait up to 10 seconds
        line = frontend_process.stdout.readline().strip()
        print(f"Frontend: {line}")
        if "http" in line:
            frontend_url = line.split(" ")[-1].strip()
            break
        time.sleep(0.1)

    if not frontend_url:
        frontend_url = "http://localhost:3000"  # Fallback URL
        print("\n⚠️  Could not detect frontend URL, using fallback:", frontend_url)
    else:
        print("\n✨ Frontend URL detected:", frontend_url)

    # Open the browser
    print("\n🌐 Opening browser...")
    webbrowser.open(frontend_url)

    print("\n✅ Application is running!")
    print(f"Frontend is available at: {frontend_url}")
    print("Backend is running at: http://localhost:3001")  # Note: Different port from Image to Data
    print("\n📝 If the page doesn't open automatically, copy and paste the frontend URL into your browser.")
    print("\nTo stop the servers, press Ctrl+C in this terminal window.")
    print("Note: You may need to close your browser window as well.")

    try:
        # Keep the script running and show server output
        while True:
            backend_line = backend_process.stdout.readline()
            if backend_line:
                print("Backend:", backend_line.strip())
            frontend_line = frontend_process.stdout.readline()
            if frontend_line:
                print("Frontend:", frontend_line.strip())
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("👋 Goodbye!")

if __name__ == "__main__":
    launch_servers() 